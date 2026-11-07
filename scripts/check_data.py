# -*- coding: utf-8 -*-
"""
AERO-AGRI Data Status Inspector
In bảng trạng thái nguồn dữ liệu x từng vùng quan trắc.
"""
import os
import sys

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_status

REGIONS = ["Ben_Tre_DBSCL", "Dak_Lak_Tay_Nguyen"]

def check_all_data():
    print("=" * 85)
    print(f"{'VÙNG':<20} | {'NGUỒN':<15} | {'TRẠNG THÁI':<12} | {'SỐ DÒNG':<8} | {'NGÀY BẮT ĐẦU':<10} | {'NGÀY KẾT THÚC':<10} | {'MẪU?'}")
    print("-" * 85)
    for reg in REGIONS:
        status = get_data_status(reg)
        for stype, info in status.items():
            avail_str = "SẴN SÀNG" if info["available"] else "CHƯA CÓ"
            synth_str = "YES" if info["is_synthetic"] else "NO"
            d_min = info["date_min"] or "-"
            d_max = info["date_max"] or "-"
            print(f"{reg:<20} | {stype:<15} | {avail_str:<12} | {info['rows']:<8} | {d_min:<10} | {d_max:<10} | {synth_str}")
    print("=" * 85)

if __name__ == "__main__":
    check_all_data()

