# -*- coding: utf-8 -*-
"""
AERO-AGRI Water Balance Engine
Crop water requirement and effective rainfall (USDA-SCS or FAO TM3).
Rules:
- Deficits are summed month by month: a wet month does not offset a dry one
- Rice uses FAO TM3 effective rainfall (Pe = 0.8P - 25 or 0.6P - 10); other crops use USDA-SCS
- Rice water: adds land_prep_mm and percolation_mm_day (presaturated drops sat_mm; percolation_mm_day overrides the rate)
- Kc interpolated linearly across growth stages (ini/dev/mid/late)
- Perennial crops: evaluated over dry-season months with constant Kc = kc_mid
- rice_shrimp (Kc=null): returns None with a status_note; Kc is never guessed
"""
import os
import json
import numpy as np
import pandas as pd
from core.eto import calculate_eto_series

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_config(name):
    cfg_path = os.path.join(AERO_ROOT, "config", f"{name}.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_crop_season_start(reg_info, crop_id):
    """
    Season start (MM-DD) for a crop in a region:
    reg_info['crop_season_start'][crop_id] first, then reg_info['season_start'],
    otherwise the first dry_season_months month (e.g. '01-01').
    """
    crop_starts = reg_info.get("crop_season_start") or {}
    if crop_id in crop_starts and crop_starts[crop_id]:
        return str(crop_starts[crop_id])
    if reg_info.get("season_start"):
        return str(reg_info["season_start"])
    dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
    return f"{int(dry_months[0]):02d}-01"


def get_annual_season_bounds(year, season_start_mmdd, season_days):
    """
    (start_date, end_date) of an annual crop sown in `year` on `season_start_mmdd` (MM-DD),
    lasting `season_days` days (may run into year y+1).
    """
    parts = str(season_start_mmdd).split("-")
    month = int(parts[0])
    day = int(parts[1])
    start_date = pd.Timestamp(year=int(year), month=month, day=day)
    end_date = start_date + pd.Timedelta(days=int(season_days) - 1)
    return start_date, end_date


def get_crop_season_window_info(reg_info, crop_id, crop_info):
    """
    Returns {"start": "MM-DD", "end": "MM-DD"}, the crop season window.
    - Perennial crops: from dry_season_months.
    - Annual crops: season_start + season_days - 1 (reference year 2025).
    """
    if crop_info.get("perennial", False):
        dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
        m_start = int(dry_months[0])
        m_end = int(dry_months[-1])
        end_dt = pd.Timestamp(year=2025, month=m_end, day=1) + pd.offsets.MonthEnd(1)
        return {
            "start": f"{m_start:02d}-01",
            "end": end_dt.strftime("%m-%d")
        }
    start_mmdd = resolve_crop_season_start(reg_info, crop_id)
    season_days = int(crop_info.get("season_days") or 100)
    _, end_dt = get_annual_season_bounds(2025, start_mmdd, season_days)
    return {
        "start": start_mmdd,
        "end": end_dt.strftime("%m-%d")
    }


def iter_crop_season_slices(df, reg_info, crop_id, crop_info):
    """
    Shared by water_balance.py and scoring.py: yields valid season slices (year, df_season)
    for every year in `df` (which has a datetime `date` column).
    - Perennial crops: dry_season_months of each year (needs >= 30 days).
    - Annual crops: start_date (year y + season_start) to end_date (start_date + season_days - 1),
      may run into year y+1 (needs >= 80% of season_days).
    """
    if df is None or len(df) == 0:
        return
    years = sorted(df["date"].dt.year.unique())
    is_perennial = crop_info.get("perennial", False)
    dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])

    if is_perennial:
        for y in years:
            df_season = df[(df["date"].dt.year == y) & (df["date"].dt.month.isin(dry_months))].copy()
            if len(df_season) < 30:
                continue
            yield int(y), df_season
    else:
        start_mmdd = resolve_crop_season_start(reg_info, crop_id)
        season_days = int(crop_info["season_days"])
        for y in years:
            start_date, end_date = get_annual_season_bounds(y, start_mmdd, season_days)
            df_season = df[(df["date"] >= start_date) & (df["date"] <= end_date)].copy()
            if len(df_season) < season_days * 0.8:
                continue
            yield int(y), df_season


def collect_crop_season_df(df, reg_info, crop_id, crop_info):
    """All days of every valid season of the crop, as one DataFrame."""
    if df is None or len(df) == 0:
        return pd.DataFrame()
    work_df = df if pd.api.types.is_datetime64_any_dtype(df["date"]) else df.assign(date=pd.to_datetime(df["date"]))
    slices = [sub for _, sub in iter_crop_season_slices(work_df, reg_info, crop_id, crop_info)]
    if not slices:
        return pd.DataFrame(columns=work_df.columns)
    return pd.concat(slices, ignore_index=True)

def calculate_monthly_peff(p_mm):
    """
    Monthly USDA-SCS effective rainfall (FAO Irrigation & Drainage Paper 24 / USDA SCS).
    P <= 250 mm: Peff = P * (125 - 0.2 * P) / 125
    P > 250 mm: Peff = 125 + 0.1 * P
    """
    if p_mm <= 0.0:
        return 0.0
    elif p_mm <= 250.0:
        return p_mm * (125.0 - 0.2 * p_mm) / 125.0
    else:
        return 125.0 + 0.1 * p_mm


def calculate_monthly_peff_tm3(p_mm):
    """
    Effective rainfall per FAO Training Manual 3 (Brouwer & Heibloem 1986), Part II §4.2 and §4.4:
    P > 75 mm/month: Pe = 0.8P - 25; P <= 75 mm/month: Pe = 0.6P - 10; never negative.
    """
    if p_mm <= 0.0:
        return 0.0
    if p_mm > 75.0:
        return max(0.8 * p_mm - 25.0, 0.0)
    return max(0.6 * p_mm - 10.0, 0.0)


def calculate_season_peff(df_all, df_season, rain_col="Rain_sim_mm"):
    """
    Total USDA-SCS effective rainfall for one season (df_season), pro-rated by days
    for partial months:
    For each month (YYYY-MM) in df_season:
      Peff_month = calculate_monthly_peff(rain of the WHOLE month in df_all)
                   * (season days in that month / days in that month)
    """
    if df_season is None or len(df_season) == 0:
        return 0.0
    s_dates = pd.to_datetime(df_season["date"])
    a_dates = pd.to_datetime(df_all["date"])
    s_ym = s_dates.dt.strftime("%Y-%m")
    a_ym = a_dates.dt.strftime("%Y-%m")

    total_peff = 0.0
    for ym in s_ym.unique():
        mask_s = (s_ym == ym)
        n_season_days = int(mask_s.sum())
        days_in_month = int(s_dates[mask_s].dt.days_in_month.iloc[0])
        full_month_rain = float(df_all.loc[a_ym == ym, rain_col].sum())
        month_peff = calculate_monthly_peff(full_month_rain)
        total_peff += month_peff * (n_season_days / float(days_in_month))
    return total_peff

def build_daily_kc(stages, kc_ini, kc_mid, kc_end, season_days):
    """
    Linear Kc interpolation across growth stages (FAO-56).
    stages: {'ini': L_ini, 'dev': L_dev, 'mid': L_mid, 'late': L_late}
    """
    l_ini = stages.get("ini", 0)
    l_dev = stages.get("dev", 0)
    l_mid = stages.get("mid", 0)
    l_late = stages.get("late", 0)

    kc_array = np.zeros(season_days, dtype=float)
    for day_idx in range(season_days):
        d = day_idx + 1  # 1-based day
        if d <= l_ini:
            kc_array[day_idx] = kc_ini
        elif d <= l_ini + l_dev:
            fraction = (d - l_ini) / max(l_dev, 1)
            kc_array[day_idx] = kc_ini + fraction * (kc_mid - kc_ini)
        elif d <= l_ini + l_dev + l_mid:
            kc_array[day_idx] = kc_mid
        else:
            fraction = (d - (l_ini + l_dev + l_mid)) / max(l_late, 1)
            kc_array[day_idx] = kc_mid + fraction * (kc_end - kc_mid)
    return kc_array

def calculate_water_balance(power_df, region_id, crop_id, delta_temp_c=0.0, delta_rain_pct=0.0, season_start=None, presaturated=False, percolation_mm_day=None):
    """
    Water balance for one region and one crop across all years.
    Returns:
    - mean_deficit_mm, p90_deficit_mm
    - mean_water_stress (irrigation_share), p90_water_stress
    - mean_etc_mm, mean_peff_mm
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")

    if region_id not in regions_cfg:
        raise ValueError(f"Unknown region: {region_id}")
    if crop_id not in crops_cfg:
        raise ValueError(f"Unknown crop: {crop_id}")

    reg_info = regions_cfg[region_id]
    if season_start is not None:
        reg_info = {**reg_info, "crop_season_start": {crop_id: season_start}}
    crop_info = crops_cfg[crop_id]

    # Special crops without Kc (e.g. rice_shrimp)
    if crop_info.get("kc_mid") is None:
        return {
            "crop_id": crop_id,
            "crop_name": crop_info.get("name_vi", crop_id),
            "available": False,
            "mean_deficit_mm": None,
            "p50_deficit_mm": None,
            "p80_deficit_mm": None,
            "p90_deficit_mm": None,
            "yearly_deficit_mm": [],
            "mean_water_stress": None,
            "mean_irrigation_share": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_water_req_mm": None,
            "mean_peff_mm": None,
            "status_note": "evapotranspiration not computed: no agronomic Kc available"
        }

    # FAO-56 Penman-Monteith ETo series under the delta_temp_c scenario
    df = power_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    lat_deg = reg_info["lat"]
    elev_m = reg_info.get("elevation_m", 0.0)

    # ETo recomputed with FAO-56 Penman-Monteith (no ad-hoc % factors)
    df["ETo_mm"] = calculate_eto_series(df, lat_deg, elev_m, delta_temp_c=delta_temp_c)

    # Rainfall scenario: delta_rain_pct
    rain_factor = max(0.0, 1.0 + (delta_rain_pct / 100.0))
    df["Rain_sim_mm"] = df["PRECTOTCORR"] * rain_factor

    dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
    is_perennial = crop_info.get("perennial", False)
    yearly_results = []

    # Extra rice water (FAO TM3 §4.4): land_prep_mm = SAT + WL, charged to the first month
    land_prep = float(crop_info.get("land_prep_mm") or 0.0)
    if presaturated:
        land_prep = max(land_prep - float(crop_info.get("sat_mm") or 0.0), 0.0)
    if percolation_mm_day is None:
        perc_day = float(crop_info.get("percolation_mm_day") or 0.0)
    else:
        perc_day = float(percolation_mm_day)
    peff_fn = calculate_monthly_peff_tm3 if crop_info.get("peff_method") == "fao_tm3" else calculate_monthly_peff
    month_rain = df.groupby(df["date"].dt.strftime("%Y-%m"))["Rain_sim_mm"].sum()

    for y, df_season in iter_crop_season_slices(df, reg_info, crop_id, crop_info):
        if is_perennial:
            df_season["ETc_mm"] = df_season["ETo_mm"] * crop_info["kc_mid"]
        else:
            df_season["Kc"] = build_daily_kc(
                crop_info.get("stages", {}),
                crop_info["kc_ini"],
                crop_info["kc_mid"],
                crop_info["kc_end"],
                len(df_season)
            )
            df_season["ETc_mm"] = df_season["ETo_mm"] * df_season["Kc"]

        # Sum deficits month by month: a wet month does not offset a dry one
        ym = df_season["date"].dt.strftime("%Y-%m")
        total_etc = total_req = total_peff = deficit = 0.0
        month_def = [0.0] * 12  # deficit by calendar month (1..12 -> index 0..11)
        for i, m in enumerate(ym.unique()):
            days = df_season[ym == m]
            frac = len(days) / float(days["date"].dt.days_in_month.iloc[0])
            etc_m = float(days["ETc_mm"].sum())
            req_m = etc_m + perc_day * len(days) + (land_prep if i == 0 else 0.0)
            pe_m = peff_fn(float(month_rain[m])) * frac
            total_etc += etc_m
            total_req += req_m
            total_peff += pe_m
            d_m = max(req_m - pe_m, 0.0)
            deficit += d_m
            month_def[int(m[5:7]) - 1] += d_m

        water_stress = np.clip(deficit / max(total_req, 1.0), 0.0, 1.0)
        yearly_results.append({
            "year": y,
            "etc_mm": total_etc,
            "water_req_mm": total_req,
            "peff_mm": total_peff,
            "deficit_mm": deficit,
            "water_stress": water_stress,
            "monthly": month_def
        })

    if not yearly_results:
        return {
            "crop_id": crop_id,
            "crop_name": crop_info.get("name_vi", crop_id),
            "available": False,
            "mean_deficit_mm": None,
            "p50_deficit_mm": None,
            "p80_deficit_mm": None,
            "p90_deficit_mm": None,
            "yearly_deficit_mm": [],
            "mean_water_stress": None,
            "mean_irrigation_share": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_water_req_mm": None,
            "mean_peff_mm": None,
            "status_note": "not enough data for the season"
        }

    df_y = pd.DataFrame(yearly_results).sort_values("year").reset_index(drop=True)
    mean_def = float(df_y["deficit_mm"].mean())
    p90_def = float(df_y["deficit_mm"].quantile(0.90))
    # P50 = median year; P80 = dry year exceeded about 1 year in 5 (design-rainfall convention)
    p50_def = float(df_y["deficit_mm"].quantile(0.50))
    p80_def = float(df_y["deficit_mm"].quantile(0.80))
    mean_stress = float(df_y["water_stress"].mean())
    p90_stress = float(df_y["water_stress"].quantile(0.90))

    return {
        "crop_id": crop_id,
        "crop_name": crop_info.get("name_vi", crop_id),
        "available": True,
        "mean_deficit_mm": round(mean_def, 1),
        "p50_deficit_mm": round(p50_def, 1),
        "p80_deficit_mm": round(p80_def, 1),
        "p90_deficit_mm": round(p90_def, 1),
        "yearly_deficit_mm": [
            {"year": int(y), "deficit_mm": round(float(d), 1)}
            for y, d in zip(df_y["year"], df_y["deficit_mm"])
        ],
        # Mean deficit per calendar month over all seasons; the 12 values add up to mean_deficit_mm
        "mean_monthly_deficit_mm": [
            round(float(np.mean([r["monthly"][k] for r in yearly_results])), 1) for k in range(12)
        ],
        "mean_water_stress": round(mean_stress, 3),
        "mean_irrigation_share": round(mean_stress, 3),
        "p90_water_stress": round(p90_stress, 3),
        "mean_etc_mm": round(float(df_y["etc_mm"].mean()), 1),
        "mean_water_req_mm": round(float(df_y["water_req_mm"].mean()), 1),
        "mean_peff_mm": round(float(df_y["peff_mm"].mean()), 1),
        "years_evaluated": len(df_y)
    }
