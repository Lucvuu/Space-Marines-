# -*- coding: utf-8 -*-
"""
AERO-AGRI Data Loaders & Schema Validation
Tuân thủ hợp đồng dữ liệu nghiêm ngặt theo mục 3 và ràng buộc 1.1, 1.2, 1.3
"""
import os
import json
import numpy as np
import pandas as pd

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCHEMAS = {
    "power": ["date", "T2M_MAX", "T2M_MIN", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "PRECTOTCORR"],
    "ndvi": ["date", "ndvi"],
    "soil_moisture": ["date", "sm_rootzone"],
    "salinity": ["date", "salinity_ppt"]
}

def get_data_dir():
    """Lấy thư mục dữ liệu qua biến môi trường AERO_DATA_DIR, mặc định aero-agri/data."""
    return os.environ.get("AERO_DATA_DIR", os.path.join(AERO_ROOT, "data"))

def get_manifest():
    """Đọc tệp manifest.json."""
    data_dir = get_data_dir()
    manifest_path = os.path.join(data_dir, "manifest.json")
    if not os.path.isfile(manifest_path):
        return {}
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def update_manifest_entry(rel_path, metadata):
    """Cập nhật 1 bản ghi vào manifest.json."""
    data_dir = get_data_dir()
    manifest_path = os.path.join(data_dir, "manifest.json")
    manifest = get_manifest()
    manifest[rel_path] = metadata
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

def load_csv(source_type, region_id):
    """
    Đọc và xác thực CSV theo schema hợp đồng dữ liệu.
    Trả về (DataFrame, meta_dict) nếu có dữ liệu;
    Trả về (None, meta_dict) nếu file không tồn tại.
    Ném lỗi ValueError nêu rõ tên file và cột thiếu nếu không đúng schema.
    """
    if source_type not in SCHEMAS:
        raise ValueError(f"Nguồn dữ liệu không xác định: {source_type}")

    data_dir = get_data_dir()
    rel_path = f"{source_type}/{region_id}.csv"
    file_path = os.path.join(data_dir, "raw", source_type, f"{region_id}.csv")

    manifest = get_manifest()
    manifest_entry = manifest.get(rel_path, {})
    is_synthetic = manifest_entry.get("is_synthetic", False)
    source_name = manifest_entry.get("source", "nguồn: chưa khai báo")

    if not os.path.isfile(file_path):
        return None, {
            "available": False,
            "source": source_name,
            "is_synthetic": is_synthetic,
            "file": rel_path
        }

    # Đọc CSV
    df = pd.read_csv(file_path, encoding="utf-8")

    # Kiểm tra cột bắt buộc
    required_cols = SCHEMAS[source_type]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Tệp {file_path} thiếu các cột bắt buộc: {', '.join(missing_cols)}")

    # Ép kiểu dữ liệu date YYYY-MM-DD
    try:
        df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d")
    except Exception as e:
        raise ValueError(f"Tệp {file_path} có định dạng ngày không hợp lệ (yêu cầu YYYY-MM-DD): {e}")

    # Sort theo ngày
    df = df.sort_values("date").reset_index(drop=True)

    # Ép kiểu số cho các cột còn lại và đổi -999 thành NaN
    for col in required_cols:
        if col != "date":
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].replace(-999.0, np.nan).replace(-999, np.nan)

    meta = {
        "available": True,
        "rows": len(df),
        "date_min": df["date"].min().strftime("%Y-%m-%d") if len(df) > 0 else None,
        "date_max": df["date"].max().strftime("%Y-%m-%d") if len(df) > 0 else None,
        "is_synthetic": is_synthetic,
        "source": source_name,
        "file": rel_path
    }
    return df, meta

def get_data_status(region_id):
    """Lấy trạng thái của toàn bộ 4 nguồn dữ liệu cho 1 vùng."""
    status = {}
    for stype in SCHEMAS.keys():
        df, meta = load_csv(stype, region_id)
        if df is None:
            status[stype] = {
                "available": False,
                "rows": 0,
                "date_min": None,
                "date_max": None,
                "is_synthetic": meta.get("is_synthetic", False),
                "source": meta.get("source", "nguồn: chưa khai báo")
            }
        else:
            status[stype] = meta
    return status
