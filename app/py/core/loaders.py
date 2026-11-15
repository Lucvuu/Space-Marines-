# -*- coding: utf-8 -*-
"""
AERO-AGRI Data Loaders & Schema Validation
Enforces the strict data contract (spec section 3, constraints 1.1, 1.2, 1.3)
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
    """Return the data directory from the AERO_DATA_DIR environment variable (default: <repo>/data)."""
    return os.environ.get("AERO_DATA_DIR", os.path.join(AERO_ROOT, "data"))

def get_manifest():
    """Read manifest.json."""
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
    """Update one entry in manifest.json."""
    data_dir = get_data_dir()
    manifest_path = os.path.join(data_dir, "manifest.json")
    manifest = get_manifest()
    manifest[rel_path] = metadata
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

def load_csv(source_type, region_id):
    """
    Read and validate a CSV against the data-contract schema.
    Returns (DataFrame, meta_dict) when the data exists;
    returns (None, meta_dict) when the file does not exist.
    Raises ValueError naming the file and the missing columns if the schema does not match.
    """
    if source_type not in SCHEMAS:
        raise ValueError(f"Unknown data source: {source_type}")

    data_dir = get_data_dir()
    rel_path = f"{source_type}/{region_id}.csv"
    file_path = os.path.join(data_dir, "raw", source_type, f"{region_id}.csv")

    manifest = get_manifest()
    manifest_entry = manifest.get(rel_path, {})
    is_synthetic = manifest_entry.get("is_synthetic", False)
    source_name = manifest_entry.get("source", "source: not declared")

    if not os.path.isfile(file_path):
        return None, {
            "available": False,
            "source": source_name,
            "is_synthetic": is_synthetic,
            "file": rel_path
        }

    # Read the CSV
    df = pd.read_csv(file_path, encoding="utf-8")

    # Check required columns
    required_cols = SCHEMAS[source_type]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"File {file_path} is missing required columns: {', '.join(missing_cols)}")

    # Parse the date column as YYYY-MM-DD
    try:
        df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d")
    except Exception as e:
        raise ValueError(f"File {file_path} has an invalid date format (YYYY-MM-DD required): {e}")

    # Sort by date
    df = df.sort_values("date").reset_index(drop=True)

    # Cast the other columns to numbers and turn -999 into NaN
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
    """Return the status of all 4 data sources for one region."""
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
                "source": meta.get("source", "source: not declared")
            }
        else:
            status[stype] = meta
    return status

