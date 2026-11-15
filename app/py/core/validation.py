# -*- coding: utf-8 -*-
"""
AERO-AGRI independent cross-checks with other NASA products (tasks T4, T5).

- T5: monthly rainfall from NASA POWER (PRECTOTCORR, MERRA-2 based, ~50 km) vs GPM IMERG Final (0.1 deg).
- T4: SMAP L4 root-zone soil moisture anomaly in the dry season vs the model's yearly water deficit.
Both read the small CSVs written by scripts/gee_fetch.py; nothing here changes the strategy numbers.
"""
import os

import pandas as pd

from core.loaders import get_data_dir, get_manifest, load_csv


def _read_gee(name, region_id):
    rel = f"gee/{name}_{region_id}.csv"
    path = os.path.join(get_data_dir(), "raw", rel)
    if not os.path.isfile(path):
        return None, {}
    return pd.read_csv(path), get_manifest().get(rel, {})


def rainfall_power_vs_imerg(region_id):
    """Mean rainfall per calendar month from both sources, over the months both cover."""
    imerg, meta = _read_gee("imerg_monthly", region_id)
    power, _ = load_csv("power", region_id)
    if imerg is None or power is None or len(power) == 0:
        return {"available": False, "reason": "missing NASA POWER or GPM IMERG file"}
    p = power.copy()
    p["date"] = pd.to_datetime(p["date"])
    ym = p["date"].dt.strftime("%Y-%m")
    p_month = p.groupby(ym)["PRECTOTCORR"].sum()
    n_days = p.groupby(ym)["PRECTOTCORR"].count()  # non-missing days
    days_in = p.groupby(ym)["date"].first().dt.days_in_month
    p_month = p_month[n_days == days_in]  # complete months only
    i_month = imerg.dropna(subset=["precip_mm"]).set_index("month")["precip_mm"].astype(float)
    common = sorted(set(p_month.index) & set(i_month.index))
    if not common:
        return {"available": False, "reason": "no overlapping months"}
    df = pd.DataFrame({"power": p_month[common].values, "imerg": i_month[common].values},
                      index=pd.to_datetime(common))
    clim = df.groupby(df.index.month).mean()
    monthly = [{"month": int(m), "power_mm": round(float(clim.loc[m, "power"]), 1),
                "imerg_mm": round(float(clim.loc[m, "imerg"]), 1)} for m in clim.index]
    corr = float(df["power"].corr(df["imerg"])) if len(df) > 2 else None
    return {
        "available": True,
        "monthly": monthly,
        "n_months": len(common),
        "period": [common[0], common[-1]],
        "annual_power_mm": round(float(clim["power"].sum()), 1),
        "annual_imerg_mm": round(float(clim["imerg"].sum()), 1),
        "annual_ratio_imerg_to_power": round(float(clim["imerg"].sum() / clim["power"].sum()), 3)
        if clim["power"].sum() > 0 else None,
        "monthly_correlation": round(corr, 3) if corr is not None and pd.notna(corr) else None,
        "source_imerg": meta.get("source", "NASA GPM IMERG Final monthly"),
        "source_power": "NASA POWER daily PRECTOTCORR (MERRA-2 based), summed per month",
    }


def _safe(fn, *args, **kwargs):
    """Run one optional cross-check; an unreadable or malformed file gives available:false, not an error."""
    try:
        return fn(*args, **kwargs)
    except Exception as e:  # noqa: BLE001 - optional data must never break /api/rotations
        return {"available": False, "reason": f"unreadable or malformed data file: {type(e).__name__}: {e}"}


def region_cross_checks(region_id, rotations_result, delta_temp_c=0.0, delta_rain_pct=0.0):
    """
    Independent checks attached to /api/rotations:
    - rainfall: POWER vs GPM IMERG (T5)
    - soil_moisture: SMAP root-zone dry-season anomaly vs the current practice's yearly deficit (T4).
      Only for regions whose dry-season deficit is evaluated over fixed dry months (perennial crops);
      the 9 km SMAP cell over flooded coastal rice is not meaningful.
    - erosion: relative soil loss of the cover-crop strategy (T7)
    Observations are always compared with the baseline weather (no slider scenario): when a scenario
    is active, the baseline rotations are recomputed for the SMAP comparison.
    """
    from core.erosion import erosion_comparison
    from core.rotation import evaluate_rotations
    from core.water_balance import load_config
    reg = load_config("regions").get(region_id, {})
    crops = load_config("crops")
    perennial = all(crops.get(c, {}).get("perennial", False) for c in reg.get("candidate_crops", [])) \
        and bool(reg.get("candidate_crops"))
    if perennial:
        base = rotations_result
        if float(delta_temp_c or 0.0) != 0.0 or float(delta_rain_pct or 0.0) != 0.0:
            base = evaluate_rotations(region_id, 0.0, 0.0)
        existing = next((s for s in base.get("strategies", []) if s.get("is_existing")), None)
    else:
        existing = None
    if existing is not None:
        sm = _safe(smap_dry_season_anomaly, region_id, reg.get("dry_season_months", [1, 2, 3, 4]),
                   existing.get("annual_deficit_by_year", []))
        sm["strategy_id"] = existing.get("id")
        sm["baseline_weather"] = True
    else:
        sm = {"available": False,
              "reason": "SMAP 9 km cells over flooded coastal rice mix open water and paddies; not used here"}
    return {
        "rainfall": _safe(rainfall_power_vs_imerg, region_id),
        "soil_moisture": sm,
        "erosion": _safe(erosion_comparison, region_id),
    }


def smap_dry_season_anomaly(region_id, months, modeled_by_year):
    """
    Root-zone soil moisture anomaly (m3/m3) for the given months of each year, relative to the mean of
    the same months over all years, next to the model's deficit for that year.
    """
    smap, meta = _read_gee("smap_monthly", region_id)
    if smap is None:
        return {"available": False, "reason": "missing SMAP L4 file"}
    s = smap.dropna(subset=["sm_rootzone"]).copy()
    s["year"] = s["month"].str[:4].astype(int)
    s["m"] = s["month"].str[5:7].astype(int)
    s = s[s["m"].isin([int(m) for m in months])]
    if len(s) == 0:
        return {"available": False, "reason": "no SMAP values in the requested months"}
    clim = s.groupby("m")["sm_rootzone"].mean()
    s["anom"] = s["sm_rootzone"] - s["m"].map(clim)
    # keep only years with every requested month present
    counts = s.groupby("year")["m"].nunique()
    full_years = counts[counts == len(set(months))].index
    yearly = s[s["year"].isin(full_years)].groupby("year")["anom"].mean()
    modeled = {int(r["crop_year"]): float(r["deficit_mm"]) for r in modeled_by_year}
    by_year = [{"year": int(y), "anomaly": round(float(a), 4), "modeled_deficit_mm": modeled.get(int(y))}
               for y, a in yearly.items()]
    paired = [r for r in by_year if r["modeled_deficit_mm"] is not None]
    corr = None
    agrees = None
    if len(paired) >= 2:
        pdf = pd.DataFrame(paired)
        if len(pdf) > 2:
            c = pdf["anomaly"].corr(pdf["modeled_deficit_mm"])
            corr = round(float(c), 3) if pd.notna(c) else None
        driest_model = max(paired, key=lambda r: r["modeled_deficit_mm"])["year"]
        driest_smap = min(paired, key=lambda r: r["anomaly"])["year"]
        agrees = driest_model == driest_smap
    return {
        "available": True,
        "months": [int(m) for m in months],
        "by_year": by_year,
        "n_years_compared": len(paired),
        "correlation_anomaly_vs_deficit": corr,
        "agrees_driest_year": agrees,
        "source": meta.get("source", "NASA SMAP L4 root-zone soil moisture"),
    }
