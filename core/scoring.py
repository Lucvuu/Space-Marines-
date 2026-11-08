# -*- coding: utf-8 -*-
"""
AERO-AGRI Crop Suitability Scoring Engine
Tính toán Điểm so sánh với hiện trạng (0 - 100), cấp độ rủi ro tuyệt đối, và thành phần rủi ro (Nước, Mặn, Nhiệt).
Tuân thủ:
- Thành phần nước chuẩn hóa theo deficit lớn nhất trong vùng:
  water_component = deficit_mm / max(deficit_mm của các cây có deficit hợp lệ trong vùng)
  (nếu max = 0 thì mọi cây có deficit hợp lệ đều có water_component = 0; cây có deficit None thì water_component = None).
- Giữ irrigation_share (tỷ lệ ETc phải tưới = deficit_mm / total_req).
- Ngưỡng mặn: chuyển đổi từ salinity_threshold_ece_dsm sang ‰ theo salinity_basis:
  + Nếu salinity_basis == "soil_water_submerged" (lúa nước, FAO-56 Table 23 p.179, footnote 6): ppt = EC / 1.56
  + Nếu salinity_basis == "ece" (cây cạn, FAO-56 Table 23 p.178-179): ppt = ECe / 1.5 / 1.56
    Quy chuẩn nông học: ECe ≈ 1.5·ECw (FAO-29), 1‰ ≈ 1.56 dS/m.
- Chỉ chia lại trọng số cho thành phần bị thiếu ở TẤT CẢ cây trong vùng.
  Nếu thành phần chỉ thiếu ở một số cây -> score = None, risk_level = "INSUFFICIENT_DATA".
- risk_level chỉ tính từ thành phần tuyệt đối: r = max(heat_ratio, salinity_exceed nếu có)
  theo ngưỡng risk_thresholds_exceed_ratio: LOW < 0.10, MODERATE < 0.25, SEVERE < 0.50, còn lại CRITICAL.
- Tính water_vs_baseline_pct so với cây đầu tiên trong candidate_crops (None khi deficit_mm = None).
- Không bao giờ bịa số liệu, ghi rõ nguồn và cờ is_synthetic.
"""
import os
import json
import numpy as np
import pandas as pd
from core.loaders import load_csv, get_data_dir
from core.water_balance import (
    calculate_water_balance,
    load_config,
    collect_crop_season_df,
    get_crop_season_window_info
)

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def classify_risk_by_exceed(r_val, exceed_thresholds):
    """
    Phân loại rủi ro từ tỷ lệ ngày mùa vụ vượt ngưỡng nhiệt/mặn:
    r = max(heat_ratio, salinity_exceed nếu có).
    LOW < 0.10, MODERATE < 0.25, SEVERE < 0.50, còn lại CRITICAL.
    """
    if r_val is None:
        return "INSUFFICIENT_DATA"
    if r_val < exceed_thresholds.get("LOW", 0.10):
        return "LOW"
    elif r_val < exceed_thresholds.get("MODERATE", 0.25):
        return "MODERATE"
    elif r_val < exceed_thresholds.get("SEVERE", 0.50):
        return "SEVERE"
    else:
        return "CRITICAL"

def ece_to_water_salinity_ppt(ece_dsm, salinity_basis="ece"):
    """
    Chuyển đổi ngưỡng độ dẫn điện (dS/m, FAO-56 Table 23 p.178-179) sang ngưỡng độ mặn nước (‰):
    - Nếu salinity_basis == "soil_water_submerged" (FAO-56 Table 23 p.179, footnote 6 cho lúa ngập nước):
      ppt = EC / 1.56
    - Nếu salinity_basis == "ece" (cây cạn):
      ppt = ECe / 1.5 / 1.56
    Docstring quy chuẩn: ECe ≈ 1.5·ECw (FAO-29), 1‰ ≈ 1.56 dS/m.
    """
    if ece_dsm is None:
        return None
    val = float(ece_dsm)
    if salinity_basis == "soil_water_submerged":
        return val / 1.56
    return val / 1.5 / 1.56

def evaluate_crop_suitability(region_id, delta_temp_c=0.0, delta_rain_pct=0.0):
    """
    Đánh giá toàn bộ candidate_crops của 1 vùng.
    Trả về danh sách kết quả scoring chi tiết và danh sách data_used.
    """
    regions_cfg = load_config("regions")
    crops_cfg = load_config("crops")
    scoring_cfg = load_config("scoring")

    if region_id not in regions_cfg:
        raise ValueError(f"Vùng không tồn tại: {region_id}")

    reg_info = regions_cfg[region_id]
    candidate_crops = reg_info.get("candidate_crops", [])
    weights_base = scoring_cfg["weights"]
    exceed_thresholds = scoring_cfg.get("risk_thresholds_exceed_ratio", {
        "LOW": 0.10,
        "MODERATE": 0.25,
        "SEVERE": 0.50,
        "CRITICAL": 1.00
    })

    # 1. Đọc dữ liệu POWER (bắt buộc)
    power_df, power_meta = load_csv("power", region_id)
    if power_df is None:
        return {
            "available": False,
            "region_id": region_id,
            "error": "chưa có dữ liệu POWER cho vùng"
        }

    # Đọc nguồn độ mặn phụ trợ (nếu có để tính rủi ro mặn)
    sal_df, sal_meta = load_csv("salinity", region_id)

    # data_used chỉ liệt kê nguồn THỰC SỰ tham gia vào phép tính điểm (POWER và Salinity)
    # NDVI và SMAP chỉ hiển thị trên biểu đồ khí hậu, không đưa vào điểm
    data_used = [power_meta]
    if sal_df is not None:
        data_used.append(sal_meta)

    # 2. Xác định deficit của cây baseline (cây đầu tiên trong candidate_crops)
    baseline_crop_id = candidate_crops[0] if candidate_crops else None
    baseline_deficit_mm = None
    if baseline_crop_id and baseline_crop_id in crops_cfg:
        wb_base = calculate_water_balance(
            power_df, region_id, baseline_crop_id,
            delta_temp_c=delta_temp_c,
            delta_rain_pct=delta_rain_pct
        )
        baseline_deficit_mm = wb_base.get("mean_deficit_mm")

    # 3. Bước 1: Tính các thành phần (water, salinity, heat) cho từng cây trồng
    pre_crop_list = []

    for idx, crop_id in enumerate(candidate_crops):
        if crop_id not in crops_cfg:
            continue
        c_info = crops_cfg[crop_id]

        # A. Cân bằng nước & thành phần nước tương đối
        wb = calculate_water_balance(
            power_df, region_id, crop_id,
            delta_temp_c=delta_temp_c,
            delta_rain_pct=delta_rain_pct
        )

        irrigation_share = wb.get("mean_water_stress")
        deficit_mm = wb.get("mean_deficit_mm")

        # Lọc dữ liệu theo đúng cửa sổ mùa vụ của từng cây (dùng chung iter_crop_season_slices / collect_crop_season_df)
        df_crop_season = collect_crop_season_df(power_df, reg_info, crop_id, c_info)

        # B. Rủi ro nhiệt (heat_ratio)
        heat_thresh = c_info.get("heat_threshold_c")
        heat_ratio = None
        if heat_thresh is not None and len(df_crop_season) > 0:
            sim_tmax = df_crop_season["T2M_MAX"] + delta_temp_c
            heat_exceed_days = int((sim_tmax > heat_thresh).sum())
            heat_ratio = round(heat_exceed_days / max(len(df_crop_season), 1), 3)

        # C. Rủi ro mặn (salinity_exceed) từ salinity_threshold_ece_dsm và salinity_basis
        ece_thresh = c_info.get("salinity_threshold_ece_dsm")
        sal_basis = c_info.get("salinity_basis") or "ece"
        sal_thresh = ece_to_water_salinity_ppt(ece_thresh, salinity_basis=sal_basis)
        salinity_exceed = None
        missing_notes = []

        if sal_thresh is not None:
            if sal_df is not None and "salinity_ppt" in sal_df.columns:
                sal_season = collect_crop_season_df(sal_df, reg_info, crop_id, c_info)
                if len(sal_season) > 0:
                    sal_exceed_days = int((sal_season["salinity_ppt"] > sal_thresh).sum())
                    salinity_exceed = round(sal_exceed_days / len(sal_season), 3)
                else:
                    missing_notes.append("chưa tính mặn do thiếu dữ liệu mùa khô")
            else:
                missing_notes.append("chưa tính mặn do thiếu dữ liệu")
        else:
            missing_notes.append("cây không có ngưỡng mặn")

        if deficit_mm is None:
            missing_notes.append("chưa tính bốc thoát hơi nước do thiếu Kc nông học")

        pre_crop_list.append({
            "crop_id": crop_id,
            "crop_name": c_info.get("name_vi", crop_id),
            "components": {
                "water_component": None,
                "irrigation_share": irrigation_share,
                "water_stress": irrigation_share,
                "salinity_exceed": salinity_exceed,
                "heat_ratio": heat_ratio
            },
            "deficit_mm": deficit_mm,
            "missing_components": missing_notes
        })

    # Chuẩn hóa water_component theo max(deficit_mm của các cây có deficit hợp lệ trong vùng)
    valid_deficits = [item["deficit_mm"] for item in pre_crop_list if item["deficit_mm"] is not None]
    max_deficit_mm = max(valid_deficits) if valid_deficits else None
    for item in pre_crop_list:
        def_mm = item["deficit_mm"]
        if def_mm is None:
            item["components"]["water_component"] = None
        elif max_deficit_mm is not None and max_deficit_mm > 0:
            item["components"]["water_component"] = round(float(def_mm / max_deficit_mm), 3)
        else:
            item["components"]["water_component"] = 0.0

    # 4. Bước 2: Xác định các thành phần active của vùng
    comp_keys_map = {
        "water": "water_component",
        "salinity": "salinity_exceed",
        "heat": "heat_ratio"
    }
    active_components = [
        k for k, field in comp_keys_map.items()
        if any(item["components"][field] is not None for item in pre_crop_list)
    ]

    # 5. Bước 3: Tính score, r = max(heat_ratio, salinity_exceed), risk_level và water_vs_baseline_pct
    final_crops = []
    for item in pre_crop_list:
        comp = item["components"]
        is_missing_any_active = any(comp[comp_keys_map[k]] is None for k in active_components)

        # Tính r = max(heat_ratio, salinity_exceed nếu có)
        abs_ratios = [v for v in [comp["heat_ratio"], comp["salinity_exceed"]] if v is not None]
        r_val = round(float(max(abs_ratios)), 3) if abs_ratios else None
        comp["exceed_ratio_r"] = r_val

        if not active_components or is_missing_any_active:
            score = None
            risk_level = "INSUFFICIENT_DATA"
        else:
            total_weight_avail = sum(weights_base[f"w_{k}"] for k in active_components)
            if total_weight_avail > 0:
                weighted_penalty = sum(
                    (weights_base[f"w_{k}"] / total_weight_avail) * comp[comp_keys_map[k]]
                    for k in active_components
                )
                score = round(100.0 * (1.0 - weighted_penalty), 1)
                score = max(0.0, min(100.0, score))
                risk_level = classify_risk_by_exceed(r_val, exceed_thresholds)
            else:
                score = None
                risk_level = "INSUFFICIENT_DATA"

        def_mm = item["deficit_mm"]
        if def_mm is None or baseline_deficit_mm is None or baseline_deficit_mm <= 0:
            water_saved_pct = None
        else:
            water_saved_pct = round((1.0 - (def_mm / baseline_deficit_mm)) * 100.0, 1)

        item["score"] = score
        item["exceed_ratio_r"] = r_val
        item["risk_level"] = risk_level
        item["water_vs_baseline_pct"] = water_saved_pct
        item["data_used"] = data_used
        final_crops.append(item)

    is_any_synthetic = any(d.get("is_synthetic", False) for d in data_used)

    return {
        "available": True,
        "region_id": region_id,
        "region_name": reg_info["name"],
        "is_synthetic": is_any_synthetic,
        "baseline_crop": candidate_crops[0] if candidate_crops else None,
        "simulation": {
            "delta_temp_c": delta_temp_c,
            "delta_rain_pct": delta_rain_pct
        },
        "crops": final_crops,
        "data_used": data_used
    }
