# -*- coding: utf-8 -*-
"""
AERO-AGRI Whole-Year Crop Rotation Strategy Evaluator
Evaluates whole-year rotation strategies from config/rotations.json:
- Water balance (deficit_mm, etc_mm, peff_mm) and heat_ratio for each modeled phase
- Keeps unmodeled phases as-is (crop: null, modeled: false, e.g. brackish-water tiger shrimp)
- Builds the 12-month calendar per _display_rule (>= 15 days in reference year 2025, wrapping years)
- Aggregates annual_deficit_mm, per-crop-year deficits (P50/P80), partial, bare_months and 12-month mean NDVI
- Never invents weights or a composite score for strategies
"""
import pandas as pd
from core.loaders import load_csv
from core.phenology import observed_sowing_for_region
from core.water_balance import (
    load_config,
    calculate_water_balance,
    collect_crop_season_df,
    get_crop_season_window_info,
    get_annual_season_bounds,
    resolve_crop_season_start
)


MIN_PHASE_DAYS_FOR_DISPLAY = 15


def _count_phase_days_per_month(phase, reg_info, crops_cfg, ignore_perennial=False):
    """
    Days of a phase falling in each month (1..12) of reference year 2025 (wrapping into 2026).
    - Perennial crops: all 12 months are occupied unless ignore_perennial=True.
    - Annual crops (or ignore_perennial=True): from start_date for season_days days.
    - Phases without a crop (e.g. shrimp): from start to end as configured.
    """
    counts = {m: 0 for m in range(1, 13)}
    crop_id = phase.get("crop")

    if crop_id is not None:
        if crop_id not in crops_cfg:
            return counts
        c_info = crops_cfg[crop_id]
        if not ignore_perennial and c_info.get("perennial", False):
            for m in range(1, 13):
                counts[m] = 30
            return counts

        start_mmdd = phase.get("start") or resolve_crop_season_start(reg_info, crop_id)
        season_days = int(c_info.get("season_days") or 100)
        start_dt, end_dt = get_annual_season_bounds(2025, start_mmdd, season_days)
        dates = pd.date_range(start_dt, end_dt, freq="D")
        for m in dates.month:
            counts[int(m)] += 1
        return counts

    # Phase with crop: null (uses start and end as MM-DD)
    start_str = phase.get("start")
    end_str = phase.get("end")
    if not start_str or not end_str:
        return counts
    m1, d1 = map(int, str(start_str).split("-"))
    m2, d2 = map(int, str(end_str).split("-"))
    start_dt = pd.Timestamp(year=2025, month=m1, day=d1)
    end_year = 2025 if (m2, d2) >= (m1, d1) else 2026
    end_dt = pd.Timestamp(year=end_year, month=m2, day=d2)
    dates = pd.date_range(start_dt, end_dt, freq="D")
    for m in dates.month:
        counts[int(m)] += 1
    return counts


def _ndvi_monthly(ndvi_df, years=None):
    """
    12-month mean NDVI, optionally limited to years [y0, y1].
    Returns (monthly, used_years).
    """
    if ndvi_df is None or len(ndvi_df) == 0 or "ndvi" not in ndvi_df.columns:
        return None, None
    ndvi_work = ndvi_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(ndvi_work["date"]):
        ndvi_work["date"] = pd.to_datetime(ndvi_work["date"])
    if years is not None and len(years) == 2:
        y0, y1 = years
        ndvi_work = ndvi_work[(ndvi_work["date"].dt.year >= y0) & (ndvi_work["date"].dt.year <= y1)]
    if len(ndvi_work) == 0:
        return [None] * 12, None
    used_years = [int(ndvi_work["date"].dt.year.min()), int(ndvi_work["date"].dt.year.max())]
    m_grp = ndvi_work.groupby(ndvi_work["date"].dt.month)["ndvi"].mean().to_dict()
    monthly = [
        round(float(m_grp[m]), 3) if m in m_grp and pd.notna(m_grp[m]) else None
        for m in range(1, 13)
    ]
    return monthly, used_years


def _phase_crosses_year(phase, reg_info, crops_cfg):
    """True when an annual crop phase sown in year y ends in year y+1 (perennial phases never do)."""
    crop_id = phase.get("crop")
    c_info = crops_cfg.get(crop_id, {}) if crop_id is not None else {}
    if crop_id is None or c_info.get("perennial", False):
        return False
    start_mmdd = phase.get("start") or resolve_crop_season_start(reg_info, crop_id)
    start_dt, end_dt = get_annual_season_bounds(2025, start_mmdd, int(c_info.get("season_days") or 100))
    return end_dt.year > start_dt.year


def _phase_label_vi(strat, idx):
    """Vietnamese label of phase `idx` (team's original text), or None."""
    labels = (strat.get("vi") or {}).get("phase_labels") or []
    return labels[idx] if idx < len(labels) else None


def _summarize_crop_years(phase_yearly, crosses_year):
    """
    Combine per-phase yearly deficits into crop-year totals.
    Crop year y = every modeled phase sown in year y; only years where all modeled phases
    have a complete season are kept. Returns (by_year, p50, p80, driest).
    """
    if not phase_yearly:
        return [], None, None, None
    common = set(phase_yearly[0])
    for py in phase_yearly[1:]:
        common &= set(py)
    by_year = []
    for y in sorted(common):
        label = f"{y}/{str(y + 1)[-2:]}" if crosses_year else str(y)
        total = round(float(sum(py[y] for py in phase_yearly)), 1)
        by_year.append({"crop_year": int(y), "label": label, "deficit_mm": total})
    if not by_year:
        return [], None, None, None
    vals = pd.Series([r["deficit_mm"] for r in by_year])
    driest = max(by_year, key=lambda r: r["deficit_mm"])
    return by_year, round(float(vals.quantile(0.5)), 1), round(float(vals.quantile(0.8)), 1), dict(driest)


def evaluate_rotations(region_id, delta_temp_c=0.0, delta_rain_pct=0.0):
    """
    Evaluate the whole-year rotation strategies for `region_id`.
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")
    rotations_cfg = load_config("rotations")

    if region_id not in regions_cfg or region_id not in rotations_cfg:
        raise ValueError(f"Region not found in rotation config: {region_id}")

    reg_info = regions_cfg[region_id]
    reg_rot = rotations_cfg[region_id]
    display_rule = rotations_cfg.get("_display_rule", "")

    power_df, power_meta = load_csv("power", region_id)
    if power_df is None or len(power_df) == 0:
        return {
            "available": False,
            "region_id": region_id,
            "error": f"no NASA POWER data for region {region_id}"
        }

    # 12-month mean NDVI (if an NDVI file exists)
    ndvi_df, ndvi_meta = load_csv("ndvi", region_id)
    ndvi_monthly, ndvi_years = _ndvi_monthly(ndvi_df, reg_rot.get("ndvi_years"))

    salinity_months = reg_rot.get("salinity_months", [])
    salinity_set = set(int(m) for m in salinity_months)

    strategies_out = []
    for strat in reg_rot.get("strategies", []):
        phases_out = []
        phase_month_counts = []
        phase_yearly = []
        crosses_year = False

        for ph in strat.get("phases", []):
            crop_id = ph.get("crop")
            label = ph.get("label", crop_id or "")
            p_start = ph.get("start")
            m_counts = _count_phase_days_per_month(ph, reg_info, crops_cfg)
            phase_month_counts.append((ph, m_counts))

            if crop_id is not None:
                c_info = crops_cfg[crop_id]
                reg_override = (
                    {**reg_info, "crop_season_start": {crop_id: p_start}}
                    if p_start is not None
                    else reg_info
                )
                wb = calculate_water_balance(
                    power_df,
                    region_id,
                    crop_id,
                    delta_temp_c=delta_temp_c,
                    delta_rain_pct=delta_rain_pct,
                    season_start=p_start,
                    presaturated=bool(ph.get("presaturated", False))
                )
                if c_info.get("percolation_mm_day_low") is not None:
                    wb_low = calculate_water_balance(
                        power_df,
                        region_id,
                        crop_id,
                        delta_temp_c=delta_temp_c,
                        delta_rain_pct=delta_rain_pct,
                        season_start=p_start,
                        presaturated=bool(ph.get("presaturated", False)),
                        percolation_mm_day=c_info["percolation_mm_day_low"]
                    )
                    deficit_low_mm = wb_low.get("mean_deficit_mm")
                else:
                    deficit_low_mm = wb.get("mean_deficit_mm")

                if wb.get("available"):
                    phase_yearly.append({r["year"]: r["deficit_mm"] for r in wb.get("yearly_deficit_mm", [])})
                    crosses_year = crosses_year or _phase_crosses_year(ph, reg_info, crops_cfg)

                window = get_crop_season_window_info(reg_override, crop_id, c_info)

                heat_thresh = c_info.get("heat_threshold_c")
                phase_heat_ratio = None
                if heat_thresh is not None:
                    df_phase = collect_crop_season_df(power_df, reg_override, crop_id, c_info)
                    if len(df_phase) > 0:
                        sim_tmax = df_phase["T2M_MAX"] + delta_temp_c
                        exceed_days = int((sim_tmax > float(heat_thresh)).sum())
                        phase_heat_ratio = round(exceed_days / len(df_phase), 3)

                mean_wreq = wb.get("mean_water_req_mm")
                mean_etc = wb.get("mean_etc_mm")
                assumed_extra_mm = (
                    round(float(mean_wreq) - float(mean_etc), 1)
                    if mean_wreq is not None and mean_etc is not None
                    else None
                )

                phases_out.append({
                    "crop": crop_id,
                    "crop_name": c_info.get("name_vi", crop_id),
                    "label": label,
                    "label_vi": _phase_label_vi(strat, len(phases_out)),
                    "modeled": True,
                    "presaturated": bool(ph.get("presaturated", False)),
                    "window": window,
                    "deficit_mm": wb.get("mean_deficit_mm"),
                    "deficit_low_mm": deficit_low_mm,
                    "etc_mm": mean_etc,
                    "assumed_extra_mm": assumed_extra_mm,
                    "peff_mm": wb.get("mean_peff_mm"),
                    "heat_ratio": phase_heat_ratio
                })
            else:
                phases_out.append({
                    "crop": None,
                    "crop_name": label,
                    "label": label,
                    "label_vi": _phase_label_vi(strat, len(phases_out)),
                    "modeled": False,
                    "presaturated": False,
                    "window": {
                        "start": ph.get("start"),
                        "end": ph.get("end")
                    },
                    "deficit_mm": None,
                    "deficit_low_mm": None,
                    "etc_mm": None,
                    "assumed_extra_mm": None,
                    "peff_mm": None,
                    "heat_ratio": None
                })

        # Whole-year figures
        modeled_defs = [
            p["deficit_mm"] for p in phases_out
            if p["modeled"] and p["deficit_mm"] is not None
        ]
        annual_deficit_mm = round(float(sum(modeled_defs)), 1) if modeled_defs else None
        modeled_defs_low = [
            p["deficit_low_mm"] for p in phases_out
            if p["modeled"] and p["deficit_low_mm"] is not None
        ]
        annual_deficit_low_mm = round(float(sum(modeled_defs_low)), 1) if modeled_defs_low else None
        partial = any(not p["modeled"] for p in phases_out)
        by_year, p50_mm, p80_mm, driest = _summarize_crop_years(phase_yearly, crosses_year)

        # 12-month calendar per _display_rule (>= 15 days in a phase)
        calendar_12m = []
        bare_months = []
        for m in range(1, 13):
            active_ph = None
            best_days = 0
            for ph_cfg, m_counts in phase_month_counts:
                d_cnt = m_counts.get(m, 0)
                if d_cnt >= MIN_PHASE_DAYS_FOR_DISPLAY and d_cnt > best_days:
                    active_ph = ph_cfg
                    best_days = d_cnt

            is_bare = active_ph is None
            if is_bare:
                bare_months.append(m)
                phase_label = None
                month_heat_ratio = None
            else:
                phase_label = active_ph.get("label")
                occ_crop = active_ph.get("crop")
                month_heat_ratio = None
                if occ_crop is not None and occ_crop in crops_cfg:
                    ht = crops_cfg[occ_crop].get("heat_threshold_c")
                    if ht is not None:
                        df_m = power_df[power_df["date"].dt.month == m]
                        if len(df_m) > 0:
                            sim_tmax_m = df_m["T2M_MAX"] + delta_temp_c
                            month_heat_ratio = round(
                                int((sim_tmax_m > float(ht)).sum()) / len(df_m), 3
                            )

            calendar_12m.append({
                "month": m,
                "phase_label": phase_label,
                "bare": is_bare,
                "salinity_month": (m in salinity_set),
                "heat_ratio": month_heat_ratio
            })

        # Count days of modeled phases with ignore_perennial=True to get water_months
        water_month_days = {m: 0 for m in range(1, 13)}
        modeled_labels = set()
        for p in phases_out:
            if p["modeled"]:
                modeled_labels.add(p["label"])

        for ph in strat.get("phases", []):
            if ph.get("crop") is not None and ph.get("modeled", True):
                w_counts = _count_phase_days_per_month(ph, reg_info, crops_cfg, ignore_perennial=True)
                for m in range(1, 13):
                    water_month_days[m] += w_counts.get(m, 0)

        water_months = [m for m in range(1, 13) if water_month_days[m] >= MIN_PHASE_DAYS_FOR_DISPLAY]

        calendar_modeled_months = [
            c["month"] for c in calendar_12m
            if not c["bare"] and c.get("phase_label") in modeled_labels
        ]
        water_full_year = (set(water_months) == set(calendar_modeled_months))

        strategies_out.append({
            "id": strat.get("id"),
            "is_existing": bool(strat.get("is_existing", False)),
            "name_vi": strat.get("name_vi", ""),
            "phases": phases_out,
            "annual_deficit_mm": annual_deficit_mm,
            "annual_deficit_low_mm": annual_deficit_low_mm,
            "annual_deficit_by_year": by_year,
            "annual_deficit_p50_mm": p50_mm,
            "annual_deficit_p80_mm": p80_mm,
            "driest_crop_year": driest,
            "water_months": water_months,
            "water_full_year": water_full_year,
            "partial": partial,
            "bare_months": bare_months,
            "calendar": calendar_12m,
            "why": strat.get("why", ""),
            "note": strat.get("note"),
            "evidence": strat.get("evidence", []),
            "benefits": strat.get("benefits", []),
            "info_gaps": strat.get("info_gaps", []),
            "risks": strat.get("risks", []),
            "vi": strat.get("vi")
        })

    existing = next((s for s in reg_rot.get("strategies", []) if s.get("is_existing")), None)
    existing_phases = existing.get("phases", []) if existing else []

    is_synthetic = bool(power_meta.get("is_synthetic", False)) or (
        bool(ndvi_meta.get("is_synthetic", False)) if ndvi_df is not None else False
    )

    return {
        "available": True,
        "region_id": region_id,
        "region_name": reg_info.get("name", region_id),
        "is_synthetic": is_synthetic,
        "display_rule": display_rule,
        "salinity_months": salinity_months,
        "salinity_months_source": reg_rot.get("salinity_months_source", ""),
        "vi": {**(reg_rot.get("vi") or {}), "region_name": (reg_info.get("vi") or {}).get("name")},
        "observed_sowing": observed_sowing_for_region(region_id, existing_phases),
        "stress_years": reg_rot.get("stress_years", []),
        "stress_years_source": reg_rot.get("stress_years_source"),
        "assumptions": reg_rot.get("assumptions", []),
        "ndvi_monthly": ndvi_monthly,
        "ndvi_years": ndvi_years,
        "ndvi_years_source": reg_rot.get("ndvi_years_source"),
        "strategies": strategies_out
    }
