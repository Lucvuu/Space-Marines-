# -*- coding: utf-8 -*-
"""
AERO-AGRI Whole-Year Crop Rotation Strategy Evaluator
Đánh giá các chiến lược luân canh cả năm từ config/rotations.json:
- Tính cân bằng nước (deficit_mm, etc_mm, peff_mm) và heat_ratio cho từng pha có mô hình
- Giữ nguyên pha chưa mô hình hóa (crop: null, modeled: false, ví dụ tôm sú nước lợ)
- Dựng lịch 12 tháng theo _display_rule (>= 15 ngày trên năm tham chiếu 2025, có vắt năm)
- Tổng hợp annual_deficit_mm, partial, bare_months và dữ liệu NDVI trung bình 12 tháng
- Không tự đặt trọng số hay tính điểm tổng hợp cho chiến lược
"""
import pandas as pd
from core.loaders import load_csv
from core.water_balance import (
    load_config,
    calculate_water_balance,
    collect_crop_season_df,
    get_crop_season_window_info,
    get_annual_season_bounds,
    resolve_crop_season_start
)


def _count_phase_days_per_month(phase, reg_info, crops_cfg):
    """
    Tính số ngày thuộc pha trong từng tháng (1..12) trên năm tham chiếu 2025 (có vắt năm).
    - Cây lâu năm (perennial=true): cả 12 tháng đều có cây (>= 28 ngày/tháng).
    - Cây hằng năm: tính từ start_date (2025 + start) kéo dài season_days ngày.
    - Pha không có crop (ví dụ tôm sú): tính từ start đến end trong config.
    """
    counts = {m: 0 for m in range(1, 13)}
    crop_id = phase.get("crop")

    if crop_id is not None:
        if crop_id not in crops_cfg:
            return counts
        c_info = crops_cfg[crop_id]
        if c_info.get("perennial", False):
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

    # Pha có crop: null (dùng start và end dạng MM-DD)
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


def evaluate_rotations(region_id, delta_temp_c=0.0, delta_rain_pct=0.0):
    """
    Đánh giá các chiến lược luân canh cả năm cho vùng `region_id`.
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")
    rotations_cfg = load_config("rotations")

    if region_id not in regions_cfg or region_id not in rotations_cfg:
        raise ValueError(f"Vùng không tồn tại trong cấu hình luân canh: {region_id}")

    reg_info = regions_cfg[region_id]
    reg_rot = rotations_cfg[region_id]
    display_rule = rotations_cfg.get("_display_rule", "")

    power_df, power_meta = load_csv("power", region_id)
    if power_df is None or len(power_df) == 0:
        return {
            "available": False,
            "region_id": region_id,
            "error": f"chưa có dữ liệu POWER cho vùng {region_id}"
        }

    # Tính trung bình NDVI theo 12 tháng (nếu có file NDVI)
    ndvi_df, ndvi_meta = load_csv("ndvi", region_id)
    ndvi_monthly = None
    if ndvi_df is not None and len(ndvi_df) > 0 and "ndvi" in ndvi_df.columns:
        ndvi_work = ndvi_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(ndvi_work["date"]):
            ndvi_work["date"] = pd.to_datetime(ndvi_work["date"])
        m_grp = ndvi_work.groupby(ndvi_work["date"].dt.month)["ndvi"].mean().to_dict()
        ndvi_monthly = [
            round(float(m_grp[m]), 3) if m in m_grp and pd.notna(m_grp[m]) else None
            for m in range(1, 13)
        ]

    salinity_months = reg_rot.get("salinity_months", [])
    salinity_set = set(int(m) for m in salinity_months)

    strategies_out = []
    for strat in reg_rot.get("strategies", []):
        phases_out = []
        phase_month_counts = []

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
                    season_start=p_start
                )
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
                    "modeled": True,
                    "window": window,
                    "deficit_mm": wb.get("mean_deficit_mm"),
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
                    "modeled": False,
                    "window": {
                        "start": ph.get("start"),
                        "end": ph.get("end")
                    },
                    "deficit_mm": None,
                    "etc_mm": None,
                    "assumed_extra_mm": None,
                    "peff_mm": None,
                    "heat_ratio": None
                })

        # Số liệu cả năm
        modeled_defs = [
            p["deficit_mm"] for p in phases_out
            if p["modeled"] and p["deficit_mm"] is not None
        ]
        annual_deficit_mm = round(float(sum(modeled_defs)), 1) if modeled_defs else None
        partial = any(not p["modeled"] for p in phases_out)

        # Lịch 12 tháng theo _display_rule (>= 15 ngày thuộc pha)
        calendar_12m = []
        bare_months = []
        for m in range(1, 13):
            active_ph = None
            best_days = 0
            for ph_cfg, m_counts in phase_month_counts:
                d_cnt = m_counts.get(m, 0)
                if d_cnt >= 15 and d_cnt > best_days:
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

        strategies_out.append({
            "id": strat.get("id"),
            "is_existing": bool(strat.get("is_existing", False)),
            "name_vi": strat.get("name_vi", ""),
            "phases": phases_out,
            "annual_deficit_mm": annual_deficit_mm,
            "partial": partial,
            "bare_months": bare_months,
            "calendar": calendar_12m,
            "why": strat.get("why", ""),
            "evidence": strat.get("evidence", []),
            "benefits": strat.get("benefits", []),
            "info_gaps": strat.get("info_gaps", []),
            "risks": strat.get("risks", [])
        })

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
        "assumptions": reg_rot.get("assumptions", []),
        "ndvi_monthly": ndvi_monthly,
        "strategies": strategies_out
    }
