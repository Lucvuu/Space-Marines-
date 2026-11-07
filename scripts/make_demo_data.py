# -*- coding: utf-8 -*-
"""
AERO-AGRI Synthetic Demo Data Generator
Tạo dữ liệu thử nghiệm cho 2015-01-01 đến 2025-12-31.
Tuân thủ: ĐÂY LÀ FILE DUY NHẤT ĐƯỢC PHÉP DÙNG RANDOM/NP.RANDOM.
Ghi cờ "is_synthetic": true xuyên suốt vào manifest.
Khí hậu 2 vùng khác nhau rõ rệt; chỉ sinh salinity cho Bến Tre.
"""
import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_dir, update_manifest_entry

def generate_demo_dataset():
    data_dir = get_data_dir()
    dates = pd.date_range(start="2015-01-01", end="2025-12-31", freq="D")
    n = len(dates)
    day_of_year = dates.dayofyear.values
    month = dates.month.values

    # Hạt giống cố định để dữ liệu tái lập được
    np.random.seed(42)

    # 1. BẾN TRE (ĐBSCL) - Nóng ẩm, mùa khô tháng 1-4 có bốc hơi cao, hạn mặn
    bt_is_dry = np.isin(month, [1, 2, 3, 4])
    # T2M_MAX: trung bình 32-35°C vào mùa khô, 31-33°C mùa mưa
    bt_tmax = 32.0 + 2.0 * bt_is_dry + np.random.normal(0, 1.2, n)
    bt_tmin = 24.0 + np.random.normal(0, 0.8, n)
    bt_rh = np.where(bt_is_dry, np.random.uniform(65, 78, n), np.random.uniform(78, 92, n))
    bt_ws = np.where(bt_is_dry, np.random.uniform(2.5, 4.5, n), np.random.uniform(1.8, 3.2, n))
    bt_rad = np.where(bt_is_dry, np.random.uniform(19.0, 24.0, n), np.random.uniform(14.0, 19.0, n))
    # Mưa Bến Tre: mùa khô ít mưa (vài cơn mưa nhỏ rải rác), mùa mưa mưa nhiều
    bt_rain = np.where(
        bt_is_dry,
        np.where(np.random.rand(n) > 0.90, np.random.exponential(5.0, n), 0.0),
        np.where(np.random.rand(n) > 0.50, np.random.exponential(18.0, n), 0.0)
    )

    df_power_bt = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "T2M_MAX": np.round(bt_tmax, 2),
        "T2M_MIN": np.round(bt_tmin, 2),
        "RH2M": np.round(bt_rh, 1),
        "WS2M": np.round(bt_ws, 2),
        "ALLSKY_SFC_SW_DWN": np.round(bt_rad, 2),
        "PRECTOTCORR": np.round(bt_rain, 2)
    })

    # MODIS NDVI Bến Tre (16 ngày/lần, lặp lại chu kỳ vụ lúa)
    bt_ndvi_base = 0.55 + 0.20 * np.sin(2 * np.pi * day_of_year / 120.0)
    bt_ndvi = np.clip(bt_ndvi_base + np.random.normal(0, 0.03, n), 0.15, 0.85)
    # Lấy mẫu 16 ngày
    mask_16d = (np.arange(n) % 16 == 0)
    df_ndvi_bt = pd.DataFrame({
        "date": dates[mask_16d].strftime("%Y-%m-%d"),
        "ndvi": np.round(bt_ndvi[mask_16d], 3)
    })

    # SMAP L4 Bến Tre
    bt_sm = np.clip(0.35 + 0.10 * (1 - bt_is_dry) - 0.12 * bt_is_dry + np.random.normal(0, 0.02, n), 0.12, 0.45)
    df_sm_bt = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "sm_rootzone": np.round(bt_sm, 3)
    })

    # Salinity Bến Tre: Tăng cao vào tháng 2-4 (đỉnh mặn 3 - 8‰)
    bt_sal = np.where(
        bt_is_dry,
        np.clip(np.random.normal(4.5, 1.5, n), 0.5, 9.5),
        np.clip(np.random.normal(0.5, 0.3, n), 0.0, 1.5)
    )
    df_sal_bt = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "salinity_ppt": np.round(bt_sal, 2)
    })

    # 2. ĐẮK LẮK (TÂY NGUYÊN) - Cao nguyên, mùa khô gần như KHÔNG MƯA, biên độ nhiệt lớn
    dl_is_dry = np.isin(month, [1, 2, 3, 4])
    dl_tmax = 30.0 + 2.5 * dl_is_dry + np.random.normal(0, 1.5, n)
    # Đêm mát hơn do cao độ 530m
    dl_tmin = 18.0 - 1.5 * dl_is_dry + np.random.normal(0, 1.2, n)
    dl_rh = np.where(dl_is_dry, np.random.uniform(45, 65, n), np.random.uniform(75, 90, n))
    dl_ws = np.where(dl_is_dry, np.random.uniform(2.8, 5.0, n), np.random.uniform(1.5, 3.0, n))
    dl_rad = np.where(dl_is_dry, np.random.uniform(21.0, 26.0, n), np.random.uniform(15.0, 20.0, n))
    # Mùa khô Đắk Lắk gần như tuyệt đối không mưa
    dl_rain = np.where(
        dl_is_dry,
        np.where(np.random.rand(n) > 0.98, np.random.exponential(2.0, n), 0.0),
        np.where(np.random.rand(n) > 0.45, np.random.exponential(22.0, n), 0.0)
    )

    df_power_dl = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "T2M_MAX": np.round(dl_tmax, 2),
        "T2M_MIN": np.round(dl_tmin, 2),
        "RH2M": np.round(dl_rh, 1),
        "WS2M": np.round(dl_ws, 2),
        "ALLSKY_SFC_SW_DWN": np.round(dl_rad, 2),
        "PRECTOTCORR": np.round(dl_rain, 2)
    })

    dl_ndvi_base = 0.65 + 0.15 * np.sin(2 * np.pi * (day_of_year - 60) / 365.0)
    dl_ndvi = np.clip(dl_ndvi_base + np.random.normal(0, 0.02, n), 0.25, 0.88)
    df_ndvi_dl = pd.DataFrame({
        "date": dates[mask_16d].strftime("%Y-%m-%d"),
        "ndvi": np.round(dl_ndvi[mask_16d], 3)
    })

    dl_sm = np.clip(0.30 - 0.14 * dl_is_dry + np.random.normal(0, 0.02, n), 0.10, 0.42)
    df_sm_dl = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "sm_rootzone": np.round(dl_sm, 3)
    })

    # LƯU FILE VÀ CẬP NHẬT MANIFEST
    files_to_save = [
        ("power", "Ben_Tre_DBSCL", df_power_bt, "NASA POWER Synthetic Demo Daily"),
        ("ndvi", "Ben_Tre_DBSCL", df_ndvi_bt, "MODIS NDVI Synthetic Demo 16-day"),
        ("soil_moisture", "Ben_Tre_DBSCL", df_sm_bt, "SMAP L4 Synthetic Demo Daily"),
        ("salinity", "Ben_Tre_DBSCL", df_sal_bt, "Hydrological Salinity Station Demo"),
        ("power", "Dak_Lak_Tay_Nguyen", df_power_dl, "NASA POWER Synthetic Demo Daily"),
        ("ndvi", "Dak_Lak_Tay_Nguyen", df_ndvi_dl, "MODIS NDVI Synthetic Demo 16-day"),
        ("soil_moisture", "Dak_Lak_Tay_Nguyen", df_sm_dl, "SMAP L4 Synthetic Demo Daily")
        # Đắk Lắk KHÔNG có salinity
    ]

    for stype, reg_id, df_data, src_desc in files_to_save:
        folder = os.path.join(data_dir, "raw", stype)
        os.makedirs(folder, exist_ok=True)
        fpath = os.path.join(folder, f"{reg_id}.csv")
        df_data.to_csv(fpath, index=False, encoding="utf-8")

        rel_path = f"{stype}/{reg_id}.csv"
        update_manifest_entry(rel_path, {
            "source": src_desc,
            "url": "https://aero-agri.demo/synthetic",
            "retrieved_at": datetime.now().strftime("%Y-%m-%d"),
            "is_synthetic": True
        })
        print(f"[DEMO DATA] Đã sinh {rel_path} ({len(df_data)} dòng)")

if __name__ == "__main__":
    generate_demo_dataset()

