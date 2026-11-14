# -*- coding: utf-8 -*-
"""
AERO-AGRI Data Status Inspector
Prints a status table of each data source x each monitored region.
"""
import os
import sys
for s in (sys.stdout, sys.stderr):
    if hasattr(s, "reconfigure"):
        s.reconfigure(encoding="utf-8", errors="replace")

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AERO_ROOT)
from core.loaders import get_data_status

REGIONS = ["Ben_Tre_DBSCL", "Dak_Lak_Tay_Nguyen"]

def check_all_data():
    print("=" * 85)
    print(f"{'REGION':<20} | {'SOURCE':<15} | {'STATUS':<12} | {'ROWS':<8} | {'START DATE':<10} | {'END DATE':<10} | {'SYNTHETIC?'}")
    print("-" * 85)
    for reg in REGIONS:
        status = get_data_status(reg)
        for stype, info in status.items():
            avail_str = "READY" if info["available"] else "MISSING"
            synth_str = "YES" if info["is_synthetic"] else "NO"
            d_min = info["date_min"] or "-"
            d_max = info["date_max"] or "-"
            print(f"{reg:<20} | {stype:<15} | {avail_str:<12} | {info['rows']:<8} | {d_min:<10} | {d_max:<10} | {synth_str}")
    print("=" * 85)

if __name__ == "__main__":
    check_all_data()

