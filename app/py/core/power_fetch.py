# -*- coding: utf-8 -*-
"""
AERO-AGRI NASA POWER Live Fetcher
Downloads daily surface weather data from the NASA POWER API and saves it as CSV.
Rules: convert YYYYMMDD to YYYY-MM-DD; on a network error print the error and exit; NEVER generate substitute data.
"""
import os
import sys
for s in (sys.stdout, sys.stderr):
    if hasattr(s, "reconfigure"):
        s.reconfigure(encoding="utf-8", errors="replace")
import requests
import pandas as pd
from datetime import datetime

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_dir, update_manifest_entry
from core.water_balance import load_config


def fetch_power_for_region(region_id, start="20150101", end="20251231"):
    regions_cfg = load_config("regions")
    if region_id not in regions_cfg:
        raise ValueError(f"Unknown region: {region_id}")

    coords = regions_cfg[region_id]
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

    print(f"[NASA POWER] Downloading data for {coords.get('name', region_id)} ({coords['lat']}, {coords['lon']}) ({start} - {end})...")
    try:
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        print(f"[NASA POWER] Geometry coordinates: {data.get('geometry', {}).get('coordinates')}")
        parameters = data["properties"]["parameter"]
    except Exception as e:
        print(f"[ERROR] Failed to connect to or download from the NASA POWER API: {e}", file=sys.stderr)
        return False

    df = pd.DataFrame(parameters)
    # NASA POWER returns dates as YYYYMMDD in the index -> convert to YYYY-MM-DD
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
        "is_synthetic": False,
        "point": [coords["lat"], coords["lon"]]
    })
    print(f"[SUCCESS] Saved {len(df)} rows to {out_path}")
    return True

def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: python core/power_fetch.py — download daily NASA POWER data for Bến Tre and Đắk Lắk.")
        sys.exit(0)
    regions_cfg = load_config("regions")
    success = True
    for region_id in regions_cfg:
        ok = fetch_power_for_region(region_id)
        if not ok:
            success = False
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
