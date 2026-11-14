# -*- coding: utf-8 -*-
"""
AERO-AGRI NASA MODIS NDVI Live Fetcher (ORNL DAAC REST API)
Tải chuỗi thời gian chỉ số thực vật MOD13Q1 (250m, 16 ngày), band 250m_16_days_NDVI
kèm lọc mây qua band 250m_16_days_pixel_reliability trên cửa sổ 3x3 km (kmAboveBelow=1, kmLeftRight=1, 81 pixel).
Tuân thủ:
- Dùng tọa độ ndvi_point trong config/regions.json nếu có, nếu không dùng lat/lon của vùng
- Mỗi request subset tối đa 10 ngày (giới hạn ORNL DAAC), nghỉ 1 giây giữa các batch
- Timeout 60s, retry 3 lần
- Chỉ giữ pixel có reliability là 0 (good) hoặc 1 (marginal), không phải fill (-3000), và sau khi nhân 0.0001 nằm trong [-0.2, 1.0]
- Ngày nào còn dưới 20 pixel hợp lệ thì bỏ cả ngày đó
- Lấy median các pixel hợp lệ và ghi thêm cột n_valid_pixels vào CSV
- Lỗi mạng -> in lỗi và thoát, KHÔNG sinh dữ liệu thay thế
"""
import os
import sys
for s in (sys.stdout, sys.stderr):
    if hasattr(s, "reconfigure"):
        s.reconfigure(encoding="utf-8", errors="replace")
import json
import time
import numpy as np
import requests
import pandas as pd
from datetime import datetime

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_dir, update_manifest_entry

BASE_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
BAND_NDVI = "250m_16_days_NDVI"
BAND_RELIABILITY = "250m_16_days_pixel_reliability"
MIN_VALID_PIXELS = 20


def load_region_ndvi_coords(region_id):
    """Đọc tọa độ ndvi_point (nếu có) hoặc lat/lon của vùng từ config/regions.json."""
    cfg_path = os.path.join(AERO_ROOT, "config", "regions.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        regions_cfg = json.load(f)
    if region_id not in regions_cfg:
        raise ValueError(f"Vùng không xác định: {region_id}")
    reg = regions_cfg[region_id]
    ndvi_pt = reg.get("ndvi_point")
    if isinstance(ndvi_pt, dict) and "lat" in ndvi_pt and "lon" in ndvi_pt:
        return {
            "lat": float(ndvi_pt["lat"]),
            "lon": float(ndvi_pt["lon"]),
            "name": reg.get("name", region_id),
            "note": ndvi_pt.get("note", "")
        }
    return {
        "lat": float(reg["lat"]),
        "lon": float(reg["lon"]),
        "name": reg.get("name", region_id),
        "note": ""
    }


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


def _extract_calendar_date(item):
    m_date = item.get("modis_date", "")
    c_date = item.get("calendar_date", "")
    if not c_date and len(m_date) == 8 and m_date.startswith("A"):
        try:
            c_date = datetime.strptime(m_date[1:], "%Y%j").strftime("%Y-%m-%d")
        except ValueError:
            return None
    return c_date or None


def parse_subset_response(subset_payload, reliability_payload=None, min_valid_pixels=MIN_VALID_PIXELS):
    """
    Parse JSON trả về từ endpoint /subset của ORNL DAAC:
    - Kết hợp band 250m_16_days_NDVI và 250m_16_days_pixel_reliability (từ reliability_payload hoặc chung trong subset_payload)
    - Chỉ giữ pixel có reliability là 0 (good) hoặc 1 (marginal) (nếu có dữ liệu reliability cho ngày đó)
    - Loại bỏ giá trị fill (-3000) và giá trị sau khi nhân 0.0001 nằm ngoài [-0.2, 1.0]
    - Ngày nào còn dưới min_valid_pixels (mặc định 20) pixel hợp lệ thì bỏ cả ngày đó
    - Lấy median các pixel hợp lệ và trả về [{"date": ..., "ndvi": ..., "n_valid_pixels": ...}]
    """
    all_items = list(subset_payload.get("subset", []))
    if reliability_payload and isinstance(reliability_payload, dict):
        all_items.extend(reliability_payload.get("subset", []))

    ndvi_by_date = {}
    rel_by_date = {}
    date_order = []

    for item in all_items:
        c_date = _extract_calendar_date(item)
        if not c_date:
            continue
        band = item.get("band", BAND_NDVI)
        data_vals = item.get("data", [])
        if band == BAND_RELIABILITY:
            rel_by_date[c_date] = data_vals
        elif band == BAND_NDVI or not band:
            ndvi_by_date[c_date] = data_vals
            if c_date not in date_order:
                date_order.append(c_date)

    rows = []
    for c_date in date_order:
        data_vals = ndvi_by_date.get(c_date, [])
        if not data_vals:
            continue

        rel_vals = rel_by_date.get(c_date)
        valid_ndvis = []

        for idx, raw_val in enumerate(data_vals):
            if raw_val is None:
                continue
            # Kiểm tra pixel_reliability nếu có
            if rel_vals is not None:
                if idx >= len(rel_vals) or rel_vals[idx] is None:
                    continue
                try:
                    rel_code = int(round(float(rel_vals[idx])))
                except (ValueError, TypeError):
                    continue
                if rel_code not in (0, 1):
                    continue

            try:
                raw_num = float(raw_val)
            except (ValueError, TypeError):
                continue

            # Bỏ giá trị fill (-3000)
            if int(round(raw_num)) == -3000:
                continue

            ndvi_val = raw_num * 0.0001
            if ndvi_val < -0.2 or ndvi_val > 1.0:
                continue

            valid_ndvis.append(ndvi_val)

        if len(valid_ndvis) < min_valid_pixels:
            continue

        median_ndvi = round(float(np.median(valid_ndvis)), 4)
        rows.append({
            "date": c_date,
            "ndvi": median_ndvi,
            "n_valid_pixels": int(len(valid_ndvis))
        })

    return rows


def fetch_ndvi_for_region(region_id, start_year=2015, end_year=2025):
    coords = load_region_ndvi_coords(region_id)
    print(
        f"[MODIS NDVI] Đang lấy danh sách ngày quan trắc cho {coords['name']} "
        f"tại ({coords['lat']}, {coords['lon']}) ({start_year}-{end_year})..."
    )
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

    print(f"[MODIS NDVI] Tổng cộng {len(target_dates)} kỳ quan trắc ({len(chunks)} batches, cửa sổ 3x3 km = 81 pixel)...")
    for idx, chunk in enumerate(chunks, 1):
        start_modis = chunk[0]["modis_date"]
        end_modis = chunk[-1]["modis_date"]
        base_params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "startDate": start_modis,
            "endDate": end_modis,
            "kmAboveBelow": 1,
            "kmLeftRight": 1
        }
        try:
            ndvi_params = dict(base_params, band=BAND_NDVI)
            rel_params = dict(base_params, band=BAND_RELIABILITY)
            ndvi_json = request_with_retry(f"{BASE_URL}/subset", params=ndvi_params, retries=3, timeout=60)
            rel_json = request_with_retry(f"{BASE_URL}/subset", params=rel_params, retries=3, timeout=60)
            batch_rows = parse_subset_response(ndvi_json, reliability_payload=rel_json, min_valid_pixels=MIN_VALID_PIXELS)
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
        "source": (
            f"NASA MODIS MOD13Q1 v061 (ORNL DAAC REST API, 250m 16-day NDVI, "
            f"3x3 km median at {coords['lat']}, {coords['lon']})"
        ),
        "url": "https://modis.ornl.gov/rst/api/v1/MOD13Q1",
        "retrieved_at": datetime.now().strftime("%Y-%m-%d"),
        "is_synthetic": False
    })
    print(f"[SUCCESS] Đã lưu {len(df)} dòng NDVI (kèm n_valid_pixels) vào {out_path}")
    return True


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Sử dụng: python core/ndvi_fetch.py — Tải dữ liệu MODIS NDVI (MOD13Q1) cho Bến Tre và Đắk Lắk.")
        sys.exit(0)
    cfg_path = os.path.join(AERO_ROOT, "config", "regions.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        regions_cfg = json.load(f)
    success = True
    for region_id in regions_cfg:
        ok = fetch_ndvi_for_region(region_id)
        if not ok:
            success = False
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
