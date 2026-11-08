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


def resolve_crop_season_start(reg_info, crop_id):
    """
    Xác định ngày bắt đầu mùa vụ (MM-DD) cho một cây trồng trong vùng:
    Ưu tiên reg_info['crop_season_start'][crop_id], sau đó reg_info['season_start'],
    mặc định tháng đầu của dry_season_months (ví dụ '01-01').
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
    Tính (start_date, end_date) cho cây hằng năm bắt đầu từ năm `year` + `season_start_mmdd` (MM-DD),
    kéo dài `season_days` ngày (cho phép vắt qua năm y+1).
    """
    parts = str(season_start_mmdd).split("-")
    month = int(parts[0])
    day = int(parts[1])
    start_date = pd.Timestamp(year=int(year), month=month, day=day)
    end_date = start_date + pd.Timedelta(days=int(season_days) - 1)
    return start_date, end_date


def get_crop_season_window_info(reg_info, crop_id, crop_info):
    """
    Trả về dict {"start": "MM-DD", "end": "MM-DD"} biểu diễn cửa sổ mùa vụ của cây.
    - Cây lâu năm (perennial=true): tính theo dry_season_months.
    - Cây hằng năm: tính từ season_start + season_days - 1 (trên năm tham chiếu 2025).
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
    Hàm dùng chung giữa water_balance.py và scoring.py để trích xuất các lát cắt mùa vụ (year, df_season)
    hợp lệ qua các năm có trong DataFrame `df` (đã có cột `date` kiểu datetime).
    - Cây lâu năm (perennial=true): lọc theo dry_season_months trong từng năm (yêu cầu >= 30 ngày).
    - Cây hằng năm: lọc từ start_date (năm y + season_start) đến end_date (start_date + season_days - 1),
      cho phép vắt sang năm y+1 (yêu cầu >= 80% season_days).
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
    """Gom toàn bộ các ngày thuộc mùa vụ hợp lệ của cây qua các năm thành 1 DataFrame."""
    if df is None or len(df) == 0:
        return pd.DataFrame()
    work_df = df if pd.api.types.is_datetime64_any_dtype(df["date"]) else df.assign(date=pd.to_datetime(df["date"]))
    slices = [sub for _, sub in iter_crop_season_slices(work_df, reg_info, crop_id, crop_info)]
    if not slices:
        return pd.DataFrame(columns=work_df.columns)
    return pd.concat(slices, ignore_index=True)

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


def calculate_season_peff(df_all, df_season, rain_col="Rain_sim_mm"):
    """
    Tính tổng mưa hiệu quả USDA-SCS cho một mùa vụ (df_season), phân bổ theo tỷ lệ ngày
    cho các tháng lẻ:
    Với mỗi tháng (YYYY-MM) có mặt trong df_season:
      Peff_tháng = calculate_monthly_peff(tổng mưa CẢ tháng trong df_all)
                   * (số ngày thuộc mùa vụ trong tháng đó / số ngày của tháng đó)
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

    # Khoản nước phụ trợ: làm đất (land_prep_mm) và thấm lọc (percolation_mm_day)
    land_prep = float(crop_info.get("land_prep_mm") or 0.0)
    perc_day = float(crop_info.get("percolation_mm_day") or 0.0)

    for y, df_season in iter_crop_season_slices(df, reg_info, crop_id, crop_info):
        if is_perennial:
            kc_mid = crop_info["kc_mid"]
            df_season["ETc_mm"] = df_season["ETo_mm"] * kc_mid
            total_etc = df_season["ETc_mm"].sum()
            total_peff = calculate_season_peff(df, df_season, rain_col="Rain_sim_mm")

        else:
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
            total_peff = calculate_season_peff(df, df_season, rain_col="Rain_sim_mm")

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
