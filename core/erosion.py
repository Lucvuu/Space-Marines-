# -*- coding: utf-8 -*-
"""
AERO-AGRI relative soil-loss comparison (task T7), RUSLE A = R * K * LS * C * P.

D0 (bare inter-rows) and D1 (cover crop) are the same field under the same rain and slope, so
R, K, LS and P cancel: soil loss D1 / D0 = C_D1 / C_D0. C-factors come from config/erosion.json
with their source. NASA SRTM slope and GPM IMERG rainfall are reported as site context
(how erosion-prone the site is), not turned into absolute tonnes.
"""
import json
import os

import pandas as pd

from core.loaders import get_data_dir, get_manifest

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _cfg():
    with open(os.path.join(AERO_ROOT, "config", "erosion.json"), encoding="utf-8") as f:
        return json.load(f)


def _gee(name, region_id, required_cols):
    """Read an optional GEE CSV; a missing, empty or malformed file gives (None, {})."""
    rel = f"gee/{name}_{region_id}.csv"
    path = os.path.join(get_data_dir(), "raw", rel)
    if not os.path.isfile(path):
        return None, {}
    try:
        df = pd.read_csv(path)
    except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeDecodeError):
        return None, {}
    if len(df) == 0 or not set(required_cols) <= set(df.columns):
        return None, {}
    return df, get_manifest().get(rel, {})


def erosion_comparison(region_id):
    cfg = _cfg().get(region_id)
    if not cfg:
        return {"available": False, "reason": "no erosion comparison configured for this region"}
    c = cfg["c_factors"]
    (base_sid, base_key), (alt_sid, alt_key) = list(cfg["strategy_c"].items())
    c_base = float(c[base_key]["value"])
    c_alt = float(c[alt_key]["value"])
    out = {
        "available": True,
        "baseline_strategy": base_sid,
        "compared_strategy": alt_sid,
        "c_baseline": c_base,
        "c_compared": c_alt,
        "c_labels": {base_sid: c[base_key]["label"], alt_sid: c[alt_key]["label"]},
        "soil_loss_ratio": round(c_alt / c_base, 3),
        "reduction_pct": round((1 - c_alt / c_base) * 100, 1),
        "c_source": cfg["c_source"],
        "verified": bool(cfg.get("verified", False)),
        "caveats": cfg.get("caveats", []),
        "slope_deg_p50": None,
        "slope_deg_p90": None,
        "wet_season_rain_share": None,
    }
    srtm, srtm_meta = _gee("srtm_stats", region_id, ["slope_deg_p50", "slope_deg_p90"])
    if srtm is not None:
        out["slope_deg_p50"] = float(srtm.loc[0, "slope_deg_p50"])
        out["slope_deg_p90"] = float(srtm.loc[0, "slope_deg_p90"])
        out["slope_source"] = srtm_meta.get("source", "NASA SRTM v3 30 m")
    imerg, imerg_meta = _gee("imerg_monthly", region_id, ["month", "precip_mm"])
    if imerg is not None:
        im = imerg.dropna(subset=["precip_mm"]).copy()
        im["m"] = im["month"].str[5:7].astype(int)
        total = float(im["precip_mm"].sum())
        if total > 0:
            wet = float(im.loc[im["m"].isin(cfg["wet_season_months"]), "precip_mm"].sum())
            out["wet_season_rain_share"] = round(wet / total, 3)
            out["wet_season_months"] = cfg["wet_season_months"]
            out["rain_source"] = imerg_meta.get("source", "NASA GPM IMERG monthly")
    return out
