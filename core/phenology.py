# -*- coding: utf-8 -*-
"""
AERO-AGRI rice calendar from satellite (task T3).

Detects rice sowing / flooding dates from a MODIS EVI + LSWI time series (8-day composites):
- Flood signal: LSWI + offset >= EVI (Xiao et al. 2005), parameters in config/phenology.json.
- Accepted only if EVI then greens up to a fraction of the crop-cycle peak within a few composites.
- Detected dates are compared with the configured (representative) sowing dates in config/rotations.json.
No thresholds live in this file; they all come from config/phenology.json with their sources.
"""
import json
import os

import pandas as pd

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_params():
    with open(os.path.join(AERO_ROOT, "config", "phenology.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def detect_sowing_dates(df, params):
    """
    Return the sorted list of detected rice sowing dates (pd.Timestamp).
    `df` needs columns date, evi, lswi; rows with missing EVI or LSWI are ignored.
    """
    if df is None or len(df) == 0:
        return []
    work = df.dropna(subset=["evi", "lswi"]).copy()
    if len(work) == 0:
        return []
    work["date"] = pd.to_datetime(work["date"])
    work = work.sort_values("date").reset_index(drop=True)

    offset = float(params["flood_signal"]["lswi_offset"])
    gu = params["green_up"]
    max_after = pd.Timedelta(days=8 * int(gu["max_composites_after_flood"]))
    frac = float(gu["fraction_of_cycle_peak"])
    cycle = pd.Timedelta(days=int(gu["cycle_days"]))
    min_peak = float(params["app_assumptions"]["min_cycle_peak_evi"])
    min_gap = pd.Timedelta(days=int(params["app_assumptions"]["min_days_between_seasons"]))

    dates = work["date"]
    evi = work["evi"].astype(float)
    flooded = (work["lswi"].astype(float) + offset) >= evi

    accepted = []
    for i in work.index[flooded]:
        t = dates[i]
        cycle_mask = (dates > t) & (dates <= t + cycle)
        if not cycle_mask.any():
            continue
        peak = float(evi[cycle_mask].max())
        if peak < min_peak:
            continue
        early = evi[(dates > t) & (dates <= t + max_after)]
        target = frac * peak
        if len(early) and float(early.max()) >= target > float(evi[i]):
            accepted.append(t)

    # Several flooded composites before one green-up are one season: keep the last (closest to sowing)
    seasons = []
    for t in accepted:
        if seasons and t - seasons[-1] < min_gap:
            seasons[-1] = t
        else:
            seasons.append(t)
    return seasons


def load_reflectance_series(region_id):
    """Read data/raw/gee/mod09a1_<region>.csv (written by scripts/gee_fetch.py). Returns (df, meta) or (None, {})."""
    from core.loaders import get_data_dir, get_manifest
    rel = f"gee/mod09a1_{region_id}.csv"
    path = os.path.join(get_data_dir(), "raw", rel)
    if not os.path.isfile(path):
        return None, {}
    return pd.read_csv(path), get_manifest().get(rel, {})


def observed_sowing_for_region(region_id, existing_phases, params=None):
    """
    Satellite-observed rice sowing for the current practice of a region.
    `existing_phases`: phases of the is_existing strategy (rice phases with a configured 'start').
    """
    params = params or load_params()
    phase_starts = {p["label"]: p["start"] for p in existing_phases if p.get("crop") == "rice" and p.get("start")}
    if not phase_starts:
        return {"available": False, "reason": "no rice phase in the current practice"}
    try:
        df, meta = load_reflectance_series(region_id)
    except Exception as e:  # unreadable optional file must not break the rotation API
        return {"available": False, "reason": f"unreadable MODIS MOD09A1 file: {e}"}
    if df is None or len(df) == 0 or not {"date", "evi", "lswi"} <= set(df.columns):
        return {"available": False, "reason": "no usable MODIS MOD09A1 EVI/LSWI file (run scripts/gee_fetch.py)"}
    if {"n_clear_pixels", "n_pixels"} <= set(df.columns):
        min_frac = float(params["app_assumptions"].get("min_clear_fraction", 0.0))
        frac = df["n_clear_pixels"] / df["n_pixels"].where(df["n_pixels"] > 0)
        df = df[frac >= min_frac]
    max_off = params["app_assumptions"].get("max_offset_days")
    found = detect_sowing_dates(df, params)
    cmp = compare_with_calendar(found, phase_starts, max_offset_days=max_off)
    years = sorted(pd.to_datetime(df["date"]).dt.year.unique())
    per_year = {str(y): int(cmp["seasons_per_year"].get(int(y), 0)) for y in years}
    phases = []
    for label, start in phase_starts.items():
        n = sum(1 for e in cmp["events"] if e["phase_label"] == label)
        phases.append({"label": label, "configured_start": start, "n_detected": n,
                       "median_offset_days": cmp["median_offset_days"].get(label)})
    checks = ground_truth_checks(found, params.get("ground_truth", {}).get(region_id, []), max_off)
    return {
        "available": True,
        "ground_truth_checks": checks,
        "events": cmp["events"],
        "n_unmatched": cmp["n_unmatched"],
        "max_offset_days": max_off,
        "seasons_per_year": per_year,
        "phases": phases,
        "n_composites_used": int(len(df)),
        "method": params["flood_signal"]["rule"] + " " + params["green_up"]["rule"],
        "method_source": params["flood_signal"]["source"],
        "expected_error": params["expected_error_days"]["text"],
        "assumptions": params["app_assumptions"]["note"],
        "source": meta.get("source", "NASA MODIS MOD09A1 (EVI/LSWI)"),
        "is_synthetic": bool(meta.get("is_synthetic", False)),
    }


def _signed_offset_days(date, mmdd):
    """Signed days from the nearest occurrence of MM-DD (previous, same or next year) to `date`."""
    m, d = (int(x) for x in mmdd.split("-"))
    best = None
    for y in (date.year - 1, date.year, date.year + 1):
        delta = (date - pd.Timestamp(year=y, month=m, day=d)).days
        if best is None or abs(delta) < abs(best):
            best = delta
    return int(best)


def ground_truth_checks(sowing_dates, reports, max_offset_days=None):
    """Pair each dated field report with the nearest detection within max_offset_days (else 'not detected')."""
    out = []
    for gt in reports:
        gt_date = pd.Timestamp(gt["date"])
        nearest = min(sowing_dates, key=lambda d: abs((d - gt_date).days), default=None)
        if nearest is not None and max_offset_days is not None and abs((nearest - gt_date).days) > max_offset_days:
            nearest = None
        out.append({**gt,
                    "detected_date": nearest.strftime("%Y-%m-%d") if nearest is not None else None,
                    "difference_days": int((nearest - gt_date).days) if nearest is not None else None})
    return out


def compare_with_calendar(sowing_dates, phase_starts, max_offset_days=None):
    """
    Match each detected date to the nearest configured phase start ({label: "MM-DD"}).
    Detections farther than max_offset_days from every start get phase_label None (unmatched).
    Returns events, seasons_per_year, n_unmatched and the median offset (observed minus configured) per phase.
    """
    events = []
    for dt in sorted(pd.Timestamp(x) for x in sowing_dates):
        offsets = {label: _signed_offset_days(dt, mmdd) for label, mmdd in phase_starts.items()}
        label = min(offsets, key=lambda k: abs(offsets[k]))
        if max_offset_days is not None and abs(offsets[label]) > max_offset_days:
            label = None
        events.append({
            "date": dt.strftime("%Y-%m-%d"),
            "year": int(dt.year),
            "phase_label": label,
            "offset_days": offsets[label] if label is not None else None,
        })
    per_year = {}
    for e in events:
        per_year[e["year"]] = per_year.get(e["year"], 0) + 1
    medians = {}
    for label in phase_starts:
        vals = [e["offset_days"] for e in events if e["phase_label"] == label]
        if vals:
            medians[label] = float(pd.Series(vals).median())
    return {"events": events, "seasons_per_year": per_year, "median_offset_days": medians,
            "n_unmatched": sum(1 for e in events if e["phase_label"] is None)}
