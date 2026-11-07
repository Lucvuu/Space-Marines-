# -*- coding: utf-8 -*-
"""
AERO-AGRI NASA POWER Live Fetcher
Tải dữ liệu khí tượng bề mặt hàng ngày từ NASA POWER API và lưu định dạng CSV.
Tuân thủ: đổi YYYYMMDD sang YYYY-MM-DD, lỗi mạng thì in lỗi và thoát, KHÔNG sinh data thay thế.
"""
import os
import sys
import requests
import pandas as pd
from datetime import datetime

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_dir, update_manifest_entry

PILOT_COORDINATES = {
    "Ben_Tre_DBSCL": {"lat": 10.2433, "lon": 106.3758, "name": "Bến Tre"},
    "Dak_Lak_Tay_Nguyen": {"lat": 12.6667, "lon": 108.0500, "name": "Đắk Lắk"}
}

def fetch_power_for_region(region_id, start="20150101", end="20251231"):
    if region_id not in PILOT_COORDINATES:
        raise ValueError(f"Vùng không xác định: {region_id}")

    coords = PILOT_COORDINATES[region_id]
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR",
        "community": "AG",
        "longitude": coords["lon"],
        "latitude": coords["lat"],
        "start": start,
        "end": end,
        "format": "JSON"
    }

    print(f"[NASA POWER] Đang tải dữ liệu cho {coords['name']} ({start} - {end})...")
    try:
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        parameters = data["properties"]["parameter"]
    except Exception as e:
        print(f"[ERROR] Lỗi khi kết nối hoặc tải NASA POWER API: {e}", file=sys.stderr)
        return False

    df = pd.DataFrame(parameters)
    # NASA POWER trả date dạng YYYYMMDD ở index -> chuyển sang YYYY-MM-DD
    formatted_dates = []
    for d in df.index:
        d_str = str(d)
        if len(d_str) == 8:
            formatted_dates.append(f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:]}")
        else:
            formatted_dates.append(d_str)

    df.insert(0, "date", formatted_dates)

    data_dir = get_data_dir()
    out_dir = os.path.join(data_dir, "raw", "power")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{region_id}.csv")
    df.to_csv(out_path, index=False, encoding="utf-8")

    rel_path = f"power/{region_id}.csv"
    update_manifest_entry(rel_path, {
        "source": "NASA POWER daily API, community=AG",
        "url": "https://power.larc.nasa.gov",
        "retrieved_at": datetime.now().strftime("%Y-%m-%d"),
        "is_synthetic": False
    })
    print(f"[SUCCESS] Đã lưu {len(df)} dòng dữ liệu vào {out_path}")
    return True

def main():
    success = True
    for region_id in PILOT_COORDINATES:
        ok = fetch_power_for_region(region_id)
        if not ok:
            success = False
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

