# -*- coding: utf-8 -*-
"""
AERO-AGRI Crop Water Balance Engine
Tính toán nhu cầu nước cây trồng ETc, mưa hiệu quả USDA-SCS, thiếu hụt nước và stress nước mùa vụ.
Tuân thủ:
- USDA-SCS: P <= 250 -> Peff = P*(125 - 0.2*P)/125; P > 250 -> Peff = 125 + 0.1*P
- Cây lâu năm (perennial): đánh giá trên dry_season_months với Kc = kc_mid cố định
- Lúa - tôm (rice_shrimp): kc_* = null -> trả None, ghi rõ chưa tính
- Hỗ trợ kịch bản mô phỏng delta_temp_c và delta_rain_pct
"""
import os
import json
import numpy as np
import pandas as pd
from core.eto import calculate_eto_series

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_config(name):
    path = os.path.join(AERO_ROOT, "config", f"{name}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def calculate_monthly_peff(rainfall_mm):
    """
    FAO / USDA-SCS Eq:
    P <= 250: Peff = P * (125 - 0.2 * P) / 125
    P > 250:  Peff = 125 + 0.1 * P
    """
    p = max(float(rainfall_mm), 0.0)
    if p <= 250.0:
        return p * (125.0 - 0.2 * p) / 125.0
    else:
        return 125.0 + 0.1 * p

def build_daily_kc(stages, kc_ini, kc_mid, kc_end, season_days):
    """
    Nội suy Kc tuyến tính theo từng giai đoạn sinh trưởng (FAO-56).
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

def calculate_water_balance(power_df, region_id, crop_id, delta_temp_c=0.0, delta_rain_pct=0.0):
    """
    Tính toán cân bằng nước cho 1 vùng x 1 cây qua các năm.
    Trả về dict chứa mean, p90 (năm xấu nhất) và chi tiết từng năm.
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")

    if region_id not in regions_cfg:
        raise ValueError(f"Vùng không tồn tại trong config: {region_id}")
    if crop_id not in crops_cfg:
        raise ValueError(f"Cây trồng không tồn tại trong config: {crop_id}")

    reg_info = regions_cfg[region_id]
    crop_info = crops_cfg[crop_id]

    # Kiểm tra trường hợp cây không có Kc (ví dụ rice_shrimp)
    if crop_info.get("kc_ini") is None or crop_info.get("kc_mid") is None:
        return {
            "crop_id": crop_id,
            "crop_name": crop_info.get("name_vi", crop_id),
            "available": False,
            "mean_deficit_mm": None,
            "p90_deficit_mm": None,
            "mean_water_stress": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_peff_mm": None,
            "status_note": "chưa tính bốc thoát hơi nước do thiếu Kc nông học (TODO)"
        }

    # Chuẩn bị DataFrame khí tượng
    df = power_df.copy()
    if not np.issubdtype(df["date"].dtype, np.datetime64):
        df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # 1. Tính toán ETo bằng Penman-Monteith với delta_temp_c
    lat = reg_info["lat"]
    elev = reg_info["elevation_m"]
    df["ETo_mm"] = calculate_eto_series(df, lat_deg=lat, elevation_m=elev, delta_temp_c=delta_temp_c)

    # 2. Điều chỉnh mưa theo kịch bản delta_rain_pct
    rain_factor = 1.0 + (delta_rain_pct / 100.0)
    df["Rain_sim_mm"] = np.maximum(df["PRECTOTCORR"] * rain_factor, 0.0)

    dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
    years = sorted(df["date"].dt.year.unique())

    yearly_results = []
    is_perennial = crop_info.get("perennial", False)

    for y in years:
        df_year = df[df["date"].dt.year == y]

        if is_perennial:
            # Cây lâu năm: Đánh giá trên toàn bộ các tháng mùa khô dry_season_months
            df_season = df_year[df_year["date"].dt.month.isin(dry_months)].copy()
            if len(df_season) < 30:
                continue

            kc_mid = crop_info["kc_mid"]
            df_season["ETc_mm"] = df_season["ETo_mm"] * kc_mid
            total_etc = df_season["ETc_mm"].sum()

            # Mưa hiệu quả USDA-SCS theo từng tháng mùa khô
            total_peff = 0.0
            for m in dry_months:
                m_rain = df_season[df_season["date"].dt.month == m]["Rain_sim_mm"].sum()
                total_peff += calculate_monthly_peff(m_rain)

        else:
            # Cây hàng năm: Gieo vào ngày 1 tháng đầu mùa khô
            start_month = dry_months[0]
            start_date = pd.Timestamp(year=y, month=start_month, day=1)
            season_days = crop_info["season_days"]
            end_date = start_date + pd.Timedelta(days=season_days - 1)

            df_season = df[(df["date"] >= start_date) & (df["date"] <= end_date)].copy()
            if len(df_season) < season_days * 0.8:
                continue

            stages = crop_info.get("stages", {})
            kc_array = build_daily_kc(
                stages,
                crop_info["kc_ini"],
                crop_info["kc_mid"],
                crop_info["kc_end"],
                len(df_season)
            )
            df_season["Kc"] = kc_array
            df_season["ETc_mm"] = df_season["ETo_mm"] * df_season["Kc"]
            total_etc = df_season["ETc_mm"].sum()

            # Mưa hiệu quả USDA-SCS theo từng tháng trong mùa vụ
            total_peff = 0.0
            df_season["month"] = df_season["date"].dt.month
            for m in df_season["month"].unique():
                m_rain = df_season[df_season["month"] == m]["Rain_sim_mm"].sum()
                total_peff += calculate_monthly_peff(m_rain)

        deficit = max(total_etc - total_peff, 0.0)
        water_stress = np.clip(deficit / max(total_etc, 1.0), 0.0, 1.0)

        yearly_results.append({
            "year": y,
            "etc_mm": total_etc,
            "peff_mm": total_peff,
            "deficit_mm": deficit,
            "water_stress": water_stress
        })

    if not yearly_results:
        return {
            "crop_id": crop_id,
            "crop_name": crop_info.get("name_vi", crop_id),
            "available": False,
            "mean_deficit_mm": None,
            "p90_deficit_mm": None,
            "mean_water_stress": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_peff_mm": None,
            "status_note": "không đủ dữ liệu cho mùa vụ"
        }

    df_y = pd.DataFrame(yearly_results)
    mean_def = float(df_y["deficit_mm"].mean())
    p90_def = float(df_y["deficit_mm"].quantile(0.90))
    mean_stress = float(df_y["water_stress"].mean())
    p90_stress = float(df_y["water_stress"].quantile(0.90))

    return {
        "crop_id": crop_id,
        "crop_name": crop_info.get("name_vi", crop_id),
        "available": True,
        "mean_deficit_mm": round(mean_def, 1),
        "p90_deficit_mm": round(p90_def, 1),
        "mean_water_stress": round(mean_stress, 3),
        "p90_water_stress": round(p90_stress, 3),
        "mean_etc_mm": round(float(df_y["etc_mm"].mean()), 1),
        "mean_peff_mm": round(float(df_y["peff_mm"].mean()), 1),
        "years_evaluated": len(df_y)
    }

