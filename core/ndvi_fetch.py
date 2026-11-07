# -*- coding: utf-8 -*-
"""
AERO-AGRI NASA MODIS NDVI Live Fetcher (ORNL DAAC REST API)
Tải chuỗi thời gian chỉ số thực vật MOD13Q1 (250m, 16 ngày), band 250m_16_days_NDVI.
Tuân thủ:
- Không cần đăng nhập
- Mỗi request subset tối đa 10 ngày (giới hạn ORNL DAAC), nghỉ 1 giây giữa các request
- Timeout 60s, retry 3 lần
- Giá trị thô nhân 0.0001; bỏ giá trị fill (-3000) hoặc ngoài [-0.2, 1.0]
- Lỗi mạng -> in lỗi và thoát, KHÔNG sinh dữ liệu thay thế
"""
import os
import sys
for s in (sys.stdout, sys.stderr):
    if hasattr(s, "reconfigure"):
        s.reconfigure(encoding="utf-8", errors="replace")
import time
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

BASE_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
BAND_NAME = "250m_16_days_NDVI"

def request_with_retry(url, params, retries=3, timeout=60):
    """Gọi HTTP GET với header Accept: application/json và cơ chế retry."""
    headers = {"Accept": "application/json"}
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(1.5)
    raise RuntimeError(f"Request thất bại sau {retries} lần thử ({url}): {last_err}")

def filter_modis_dates(dates_payload, start_year=2015, end_year=2025):
    """Lọc danh sách modis_date trong khoảng năm start_year..end_year."""
    raw_dates = dates_payload.get("dates", [])
    filtered = []
    for item in raw_dates:
        m_date = item.get("modis_date", "")
        c_date = item.get("calendar_date", "")
        year = None
        if len(c_date) >= 4 and c_date[:4].isdigit():
            year = int(c_date[:4])
        elif len(m_date) >= 5 and m_date[1:5].isdigit():
            year = int(m_date[1:5])
        if year is not None and start_year <= year <= end_year:
            filtered.append(item)
    return filtered

def parse_subset_response(subset_payload):
    """
    Parse JSON trả về từ endpoint /subset của ORNL DAAC:
    - Nhân giá trị thô với 0.0001
    - Loại bỏ giá trị fill (-3000) hoặc nằm ngoài đoạn [-0.2, 1.0]
    """
    rows = []
    subset_list = subset_payload.get("subset", [])
    for item in subset_list:
        m_date = item.get("modis_date", "")
        c_date = item.get("calendar_date", "")
        if not c_date and len(m_date) == 8 and m_date.startswith("A"):
            try:
                c_date = datetime.strptime(m_date[1:], "%Y%j").strftime("%Y-%m-%d")
            except ValueError:
                continue

        data_vals = item.get("data", [])
        if not data_vals:
            continue

        raw_val = data_vals[0]
        if raw_val is None:
            continue
        try:
            raw_num = float(raw_val)
        except (ValueError, TypeError):
            continue

        # Bỏ giá trị fill (-3000)
        if int(round(raw_num)) == -3000:
            continue

        ndvi = round(raw_num * 0.0001, 4)
        # Bỏ giá trị nằm ngoài [-0.2, 1.0]
        if ndvi < -0.2 or ndvi > 1.0:
            continue

        rows.append({"date": c_date, "ndvi": ndvi})
    return rows

def fetch_ndvi_for_region(region_id, start_year=2015, end_year=2025):
    if region_id not in PILOT_COORDINATES:
        raise ValueError(f"Vùng không xác định: {region_id}")

    coords = PILOT_COORDINATES[region_id]
    print(f"[MODIS NDVI] Đang lấy danh sách ngày quan trắc cho {coords['name']} ({start_year}-{end_year})...")
    try:
        dates_json = request_with_retry(
            f"{BASE_URL}/dates",
            params={"latitude": coords["lat"], "longitude": coords["lon"]},
            retries=3,
            timeout=60
        )
    except Exception as e:
        print(f"[ERROR] Lỗi khi tải danh sách ngày MODIS ORNL DAAC cho {region_id}: {e}", file=sys.stderr)
        return False

    target_dates = filter_modis_dates(dates_json, start_year=start_year, end_year=end_year)
    if not target_dates:
        print(f"[ERROR] Không tìm thấy ngày MODIS nào cho {region_id} trong giai đoạn {start_year}-{end_year}", file=sys.stderr)
        return False

    # Chia thành từng batch tối đa 10 ngày quan trắc / request
    chunk_size = 10
    chunks = [target_dates[i:i + chunk_size] for i in range(0, len(target_dates), chunk_size)]
    all_rows = []

    print(f"[MODIS NDVI] Tổng cộng {len(target_dates)} kỳ quan trắc ({len(chunks)} batches)...")
    for idx, chunk in enumerate(chunks, 1):
        start_modis = chunk[0]["modis_date"]
        end_modis = chunk[-1]["modis_date"]
        params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "band": BAND_NAME,
            "startDate": start_modis,
            "endDate": end_modis,
            "kmAboveBelow": 0,
            "kmLeftRight": 0
        }
        try:
            sub_json = request_with_retry(f"{BASE_URL}/subset", params=params, retries=3, timeout=60)
            batch_rows = parse_subset_response(sub_json)
            all_rows.extend(batch_rows)
        except Exception as e:
            print(f"[ERROR] Lỗi khi tải batch {idx}/{len(chunks)} ({start_modis}..{end_modis}): {e}", file=sys.stderr)
            return False

        if idx < len(chunks):
            time.sleep(1.0)

    if not all_rows:
        print(f"[ERROR] Không có dòng NDVI hợp lệ nào cho {region_id}", file=sys.stderr)
        return False

    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)

    data_dir = get_data_dir()
    out_dir = os.path.join(data_dir, "raw", "ndvi")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{region_id}.csv")
    df.to_csv(out_path, index=False, encoding="utf-8")

    rel_path = f"ndvi/{region_id}.csv"
    update_manifest_entry(rel_path, {
        "source": "NASA MODIS MOD13Q1 v061 (ORNL DAAC REST API, 250m 16-day NDVI)",
        "url": "https://modis.ornl.gov/rst/api/v1/MOD13Q1",
        "retrieved_at": datetime.now().strftime("%Y-%m-%d"),
        "is_synthetic": False
    })
    print(f"[SUCCESS] Đã lưu {len(df)} dòng NDVI vào {out_path}")
    return True

def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Sử dụng: python core/ndvi_fetch.py — Tải dữ liệu MODIS NDVI (MOD13Q1) cho Bến Tre và Đắk Lắk.")
        sys.exit(0)
    success = True
    for region_id in PILOT_COORDINATES:
        ok = fetch_ndvi_for_region(region_id)
        if not ok:
            success = False
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
