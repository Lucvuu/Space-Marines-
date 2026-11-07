# -*- coding: utf-8 -*-
"""
AERO-AGRI Water Balance Engine
Tính toán nhu cầu nước cây trồng (ETc = Kc * ETo + land_prep + percolation) và lượng mưa hiệu quả USDA-SCS.
Tuân thủ:
- Nước lúa: cộng land_prep_mm và percolation_mm_day vào nhu cầu nước (null thì coi là 0).
- USDA-SCS theo tháng: P <= 250 -> Peff = P*(125 - 0.2P)/125; P > 250 -> Peff = 125 + 0.1P
- Nội suy Kc tuyến tính theo từng giai đoạn sinh trưởng (ini/dev/mid/late)
- Cây lâu năm (perennial=true): đánh giá trên các tháng mùa khô với Kc cố định = kc_mid
- rice_shrimp (Kc=null): trả về None kèm status_note, không đoán mò Kc
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

def calculate_monthly_peff(p_mm):
    """
    Tính lượng mưa hiệu quả USDA-SCS theo tháng (FAO Irrigation & Drainage Paper 24 / USDA SCS).
    P <= 250 mm: Peff = P * (125 - 0.2 * P) / 125
    P > 250 mm: Peff = 125 + 0.1 * P
    """
    if p_mm <= 0.0:
        return 0.0
    elif p_mm <= 250.0:
        return p_mm * (125.0 - 0.2 * p_mm) / 125.0
    else:
        return 125.0 + 0.1 * p_mm

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
    Tính toán cân bằng nước cho 1 vùng và 1 loại cây trồng qua các năm.
    Trả về:
    - mean_deficit_mm, p90_deficit_mm
    - mean_water_stress (irrigation_share), p90_water_stress
    - mean_etc_mm, mean_peff_mm
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")

    if region_id not in regions_cfg:
        raise ValueError(f"Vùng không tồn tại: {region_id}")
    if crop_id not in crops_cfg:
        raise ValueError(f"Cây trồng không tồn tại: {crop_id}")

    reg_info = regions_cfg[region_id]
    crop_info = crops_cfg[crop_id]

    # Kiểm tra trường hợp cây đặc biệt không có Kc (ví dụ: rice_shrimp)
    if crop_info.get("kc_mid") is None:
        return {
            "crop_id": crop_id,
            "crop_name": crop_info.get("name_vi", crop_id),
            "available": False,
            "mean_deficit_mm": None,
            "p90_deficit_mm": None,
            "mean_water_stress": None,
            "mean_irrigation_share": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_water_req_mm": None,
            "mean_peff_mm": None,
            "status_note": "chưa tính bốc thoát hơi nước do thiếu Kc nông học (TODO)"
        }

    # Tính toán chuỗi EToPenman-Monteith với kịch bản delta_temp_c
    df = power_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    lat_deg = reg_info["lat"]
    elev_m = reg_info.get("elevation_m", 0.0)

    # ETo tính lại trực tiếp theo FAO-56 Penman-Monteith (không dùng hệ số % tự chế)
    df["ETo_mm"] = calculate_eto_series(df, lat_deg, elev_m, delta_temp_c=delta_temp_c)

    # Mô phỏng lượng mưa: delta_rain_pct
    rain_factor = max(0.0, 1.0 + (delta_rain_pct / 100.0))
    df["Rain_sim_mm"] = df["PRECTOTCORR"] * rain_factor

    dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
    is_perennial = crop_info.get("perennial", False)

    yearly_results = []
    df["year"] = df["date"].dt.year
    years = sorted(df["year"].unique())

    # Khoản nước phụ trợ: làm đất (land_prep_mm) và thấm lọc (percolation_mm_day)
    land_prep = float(crop_info.get("land_prep_mm") or 0.0)
    perc_day = float(crop_info.get("percolation_mm_day") or 0.0)

    for y in years:
        df_year = df[df["year"] == y].copy()

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

        # Nhu cầu nước tổng thể = ETc + làm đất + thấm lọc
        total_prep = land_prep
        total_perc = perc_day * len(df_season)
        total_req = total_etc + total_prep + total_perc

        deficit = max(total_req - total_peff, 0.0)
        water_stress = np.clip(deficit / max(total_req, 1.0), 0.0, 1.0)

        yearly_results.append({
            "year": y,
            "etc_mm": total_etc,
            "water_req_mm": total_req,
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
            "mean_irrigation_share": None,
            "p90_water_stress": None,
            "mean_etc_mm": None,
            "mean_water_req_mm": None,
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
        "mean_irrigation_share": round(mean_stress, 3),
        "p90_water_stress": round(p90_stress, 3),
        "mean_etc_mm": round(float(df_y["etc_mm"].mean()), 1),
        "mean_water_req_mm": round(float(df_y["water_req_mm"].mean()), 1),
        "mean_peff_mm": round(float(df_y["peff_mm"].mean()), 1),
        "years_evaluated": len(df_y)
    }
