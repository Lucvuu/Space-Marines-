# -*- coding: utf-8 -*-
"""
AERO-AGRI Crop Suitability Scoring Engine
Tính toán điểm thích nghi (0 - 100), cấp độ rủi ro, và thành phần rủi ro (Nước, Mặn, Nhiệt).
Tuân thủ:
- Thành phần nước tính tương đối: water_component = clip(deficit_mm / baseline_deficit_mm, 0, 1),
  với baseline là cây đầu tiên trong candidate_crops của vùng.
- Giữ irrigation_share (tỷ lệ ETc phải tưới = deficit_mm / total_req).
- Ngưỡng mặn: chuyển đổi từ salinity_threshold_ece_dsm sang ‰: ppt = ece / 1.5 / 1.56
  Quy chuẩn nông học: ECe ≈ 1.5·ECw (FAO-29), 1‰ ≈ 1.56 dS/m.
- Tự động tái phân phối trọng số khi có thành phần null (thiếu mặn hoặc thiếu Kc).
- Tính water_vs_baseline_pct so với cây đầu tiên trong candidate_crops.
- Không bao giờ bịa số liệu, ghi rõ nguồn và cờ is_synthetic.
"""
import os
import json
import numpy as np
import pandas as pd
from core.loaders import load_csv, get_data_dir
from core.water_balance import calculate_water_balance, load_config

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def classify_risk(score, thresholds):
    """Phân loại rủi ro dựa trên ngưỡng cấu hình."""
    if score is None:
        return "UNKNOWN"
    if score >= thresholds.get("LOW", 80.0):
        return "LOW"
    elif score >= thresholds.get("MODERATE", 60.0):
        return "MODERATE"
    elif score >= thresholds.get("SEVERE", 40.0):
        return "SEVERE"
    else:
        return "CRITICAL"

def ece_to_water_salinity_ppt(ece_dsm):
    """
    Chuyển đổi độ dẫn điện bão hòa của đất (ECe) sang ngưỡng độ mặn nước tưới (‰):
    ppt = ece / 1.5 / 1.56
    Docstring quy chuẩn: ECe ≈ 1.5·ECw (FAO-29), 1‰ ≈ 1.56 dS/m.
    """
    if ece_dsm is None:
        return None
    return float(ece_dsm) / 1.5 / 1.56

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
    thresholds = scoring_cfg["risk_thresholds"]

    # 1. Đọc dữ liệu POWER (bắt buộc)
    power_df, power_meta = load_csv("power", region_id)
    if power_df is None:
        return {
            "available": False,
            "region_id": region_id,
            "error": "chưa có dữ liệu POWER cho vùng"
        }

    # Đọc các nguồn dữ liệu phụ trợ
    sal_df, sal_meta = load_csv("salinity", region_id)
    ndvi_df, ndvi_meta = load_csv("ndvi", region_id)
    sm_df, sm_meta = load_csv("soil_moisture", region_id)

    data_used = [power_meta]
    if sal_df is not None:
        data_used.append(sal_meta)
    if ndvi_df is not None:
        data_used.append(ndvi_meta)
    if sm_df is not None:
        data_used.append(sm_meta)

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

    # 3. Đánh giá từng cây trồng
    raw_crop_results = []

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

        # water_component = clip(deficit_mm / baseline_deficit_mm, 0, 1)
        water_component = None
        if deficit_mm is not None:
            if baseline_deficit_mm is not None and baseline_deficit_mm > 0:
                water_component = round(float(np.clip(deficit_mm / baseline_deficit_mm, 0.0, 1.0)), 3)
            elif irrigation_share is not None:
                water_component = round(float(np.clip(irrigation_share, 0.0, 1.0)), 3)
            else:
                water_component = 0.0

        # B. Rủi ro nhiệt (heat_ratio)
        heat_thresh = c_info.get("heat_threshold_c", 35.0)
        # Chỉ xét trong mùa khô
        dry_months = reg_info.get("dry_season_months", [1, 2, 3, 4])
        df_dry = power_df[power_df["date"].dt.month.isin(dry_months)].copy()
        sim_tmax = df_dry["T2M_MAX"] + delta_temp_c
        heat_exceed_days = int((sim_tmax > heat_thresh).sum())
        heat_ratio = round(heat_exceed_days / max(len(df_dry), 1), 3)

        # C. Rủi ro mặn (salinity_exceed) từ salinity_threshold_ece_dsm
        ece_thresh = c_info.get("salinity_threshold_ece_dsm")
        sal_thresh = ece_to_water_salinity_ppt(ece_thresh)
        salinity_exceed = None
        missing_notes = []

        if sal_thresh is not None:
            if sal_df is not None and "salinity_ppt" in sal_df.columns:
                sal_dry = sal_df[sal_df["date"].dt.month.isin(dry_months)]
                if len(sal_dry) > 0:
                    sal_exceed_days = int((sal_dry["salinity_ppt"] > sal_thresh).sum())
                    salinity_exceed = round(sal_exceed_days / len(sal_dry), 3)
                else:
                    missing_notes.append("chưa tính mặn do thiếu dữ liệu mùa khô")
            else:
                missing_notes.append("chưa tính mặn do thiếu dữ liệu")
        else:
            missing_notes.append("cây không có ngưỡng mặn")

        if water_component is None:
            missing_notes.append("chưa tính bốc thoát hơi nước do thiếu Kc nông học")

        # D. Tái phân phối trọng số cho các thành phần khả dụng
        comp_dict = {}
        if water_component is not None:
            comp_dict["water"] = (weights_base["w_water"], water_component)
        if salinity_exceed is not None:
            comp_dict["salinity"] = (weights_base["w_salinity"], salinity_exceed)
        if heat_ratio is not None:
            comp_dict["heat"] = (weights_base["w_heat"], heat_ratio)

        total_weight_avail = sum(w for w, _ in comp_dict.values())
        if total_weight_avail > 0:
            weighted_penalty = sum((w / total_weight_avail) * val for w, val in comp_dict.values())
            score = round(100.0 * (1.0 - weighted_penalty), 1)
            score = max(0.0, min(100.0, score))
            risk_level = classify_risk(score, thresholds)
        else:
            score = None
            risk_level = "UNKNOWN"

        raw_crop_results.append({
            "crop_id": crop_id,
            "crop_name": c_info.get("name_vi", crop_id),
            "score": score,
            "risk_level": risk_level,
            "components": {
                "water_component": water_component,
                "irrigation_share": irrigation_share,
                "water_stress": irrigation_share,
                "salinity_exceed": salinity_exceed,
                "heat_ratio": heat_ratio
            },
            "deficit_mm": deficit_mm,
            "missing_components": missing_notes
        })

    # 4. Tính water_vs_baseline_pct
    final_crops = []
    for item in raw_crop_results:
        def_mm = item["deficit_mm"]
        if baseline_deficit_mm is not None and baseline_deficit_mm > 0 and def_mm is not None:
            water_saved_pct = round((1.0 - (def_mm / baseline_deficit_mm)) * 100.0, 1)
        else:
            water_saved_pct = 0.0

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
