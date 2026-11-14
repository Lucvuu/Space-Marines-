# -*- coding: utf-8 -*-
"""
AERO-AGRI Evapotranspiration Engine (FAO-56 Penman-Monteith)
Implements daily reference evapotranspiration according to FAO Irrigation and Drainage Paper No. 56.

Core equation (FAO-56 Eq. 6):
        0.408 * Δ * (Rn - G) + γ * (900 / (Tmean + 273)) * u2 * (es - ea)
ETo = --------------------------------------------------------------------
                          Δ + γ * (1 + 0.34 * u2)

Where:
- Rn: net radiation at the crop surface (MJ/m²/day) = Rns - Rnl (Eq. 40)
- G: soil heat flux = 0 for a daily time step (MJ/m²/day)
- Tmean: mean daily temperature = (Tmax + Tmin) / 2 (°C)
- u2: wind speed at 2 m height (m/s)
- es: mean saturation vapour pressure (kPa) (Eq. 12)
- ea: actual vapour pressure (kPa) = es * (RHmean / 100)
- Δ: slope of the saturation vapour pressure curve at Tmean (kPa/°C) (Eq. 13)
- γ: psychrometric constant (kPa/°C) = 0.665e-3 * P (Eq. 8)
- P: atmospheric pressure at elevation z (kPa) (Eq. 7)
- Ra: extraterrestrial radiation from latitude and day of year (Eq. 21)
- Rso: clear-sky radiation = (0.75 + 2e-5 * z) * Ra (Eq. 37)
- Rnl: net longwave radiation (Eq. 39), with the Rs/Rso ratio capped at 1.0
- Lower bound on wind speed u2: FAO-56 ch.3, p.63: u2 should be limited to about u2 >= 0.5 m/s when used in Eq. 6 (verified: true)
"""
import os
import json
import numpy as np
import pandas as pd


def _load_u2_min_ms():
    """
    Read the lower bound on wind speed u2 from config/scoring.json.
    Source: FAO-56 ch.3, p.63: u2 should be limited to about u2 >= 0.5 m/s when used in Eq. 6 (verified: true).
    """
    cfg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "scoring.json")
    try:
        with open(cfg_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data.get("eto_u2_min"), dict):
            return float(data["eto_u2_min"].get("u2_min_ms", 0.5))
        return float(data.get("u2_min_ms", 0.5))
    except Exception:
        return 0.5

def calculate_atmospheric_pressure(elevation_m):
    """FAO-56 Eq. 7: atmospheric pressure P (kPa) at elevation z (m)."""
    return 101.3 * ((293.0 - 0.0065 * elevation_m) / 293.0) ** 5.26

def calculate_psychrometric_constant(pressure_kpa):
    """FAO-56 Eq. 8: psychrometric constant γ (kPa/°C)."""
    return 0.665e-3 * pressure_kpa

def calculate_saturation_vapor_pressure(t_celsius):
    """FAO-56 Eq. 11: saturation vapour pressure e°(T) (kPa) at temperature T (°C)."""
    return 0.6108 * np.exp((17.27 * t_celsius) / (t_celsius + 237.3))

def calculate_slope_vapor_pressure_curve(tmean_celsius):
    """FAO-56 Eq. 13: slope of the vapour pressure curve Δ (kPa/°C) at Tmean."""
    numerator = 4098.0 * (0.6108 * np.exp((17.27 * tmean_celsius) / (tmean_celsius + 237.3)))
    denominator = (tmean_celsius + 237.3) ** 2
    return numerator / denominator

def calculate_extraterrestrial_radiation(lat_deg, day_of_year):
    """FAO-56 Eq. 21, 23, 24, 25: extraterrestrial radiation Ra (MJ/m²/day)."""
    phi = np.radians(lat_deg)
    dr = 1.0 + 0.033 * np.cos(2.0 * np.pi * day_of_year / 365.0)
    delta = 0.409 * np.sin(2.0 * np.pi * day_of_year / 365.0 - 1.39)

    x = -np.tan(phi) * np.tan(delta)
    # Handle polar day / polar night
    if isinstance(x, np.ndarray) or isinstance(x, pd.Series):
        omega_s = np.where(x <= -1.0, np.pi, np.where(x >= 1.0, 0.0, np.arccos(np.clip(x, -1.0, 1.0))))
    else:
        if x <= -1.0:
            omega_s = np.pi
        elif x >= 1.0:
            omega_s = 0.0
        else:
            omega_s = np.arccos(x)

    g_sc = 0.0820  # Solar constant (MJ/m²/min)
    const_factor = (24.0 * 60.0 / np.pi) * g_sc
    ra = const_factor * dr * (omega_s * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(omega_s))
    return ra

def calculate_clear_sky_radiation(ra, elevation_m):
    """FAO-56 Eq. 37: clear-sky radiation Rso (MJ/m²/day)."""
    return (0.75 + 2e-5 * elevation_m) * ra

def calculate_daily_eto(tmax, tmin, rh_mean, u2, rs, lat_deg, elevation_m, day_of_year):
    """
    Daily reference evapotranspiration ETo (mm/day) by FAO-56 Penman-Monteith.
    Accepts scalars as well as numpy arrays / pandas Series.
    """
    tmean = (tmax + tmin) / 2.0
    pressure = calculate_atmospheric_pressure(elevation_m)
    gamma = calculate_psychrometric_constant(pressure)
    delta = calculate_slope_vapor_pressure_curve(tmean)

    es_tmax = calculate_saturation_vapor_pressure(tmax)
    es_tmin = calculate_saturation_vapor_pressure(tmin)
    es = (es_tmax + es_tmin) / 2.0
    ea = (rh_mean / 100.0) * es

    ra = calculate_extraterrestrial_radiation(lat_deg, day_of_year)
    rso = calculate_clear_sky_radiation(ra, elevation_m)

    # Net shortwave radiation (Eq. 38) with albedo = 0.23
    rns = (1.0 - 0.23) * rs

    # Technical constraint #6: cap the Rs/Rso ratio at 1.0 before computing Rnl
    safe_rso = np.where(rso > 0.01, rso, 0.01) if isinstance(rso, (np.ndarray, pd.Series)) else max(rso, 0.01)
    rs_rso_ratio = np.clip(rs / safe_rso, 0.0, 1.0)

    # Net longwave radiation (Eq. 39)
    sigma = 4.903e-9  # Stefan-Boltzmann constant MJ/K4/m2/day
    tk_max = tmax + 273.16
    tk_min = tmin + 273.16
    temp_factor = (tk_max ** 4 + tk_min ** 4) / 2.0
    humidity_factor = 0.34 - 0.14 * np.sqrt(np.maximum(ea, 0.0))
    cloudiness_factor = 1.35 * rs_rso_ratio - 0.35

    rnl = sigma * temp_factor * humidity_factor * cloudiness_factor
    rnl = np.maximum(rnl, 0.0)

    # Net radiation (Eq. 40)
    rn = rns - rnl
    g = 0.0  # Daily time step

    # FAO-56 ch.3, p.63: u2 should be limited to about u2 >= 0.5 m/s when used in Eq. 6 (verified: true)
    u2_min = _load_u2_min_ms()
    u2 = np.maximum(u2, u2_min) if isinstance(u2, (np.ndarray, pd.Series)) else max(u2, u2_min)

    # FAO-56 Eq. 6
    radiation_term = 0.408 * delta * (rn - g)
    aerodynamic_term = gamma * (900.0 / (tmean + 273.0)) * u2 * (es - ea)
    denominator = delta + gamma * (1.0 + 0.34 * u2)

    eto = (radiation_term + aerodynamic_term) / denominator
    return np.maximum(eto, 0.0)

def calculate_eto_series(df, lat_deg, elevation_m, delta_temp_c=0.0):
    """
    Compute ETo for a weather DataFrame (with T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN).
    Supports a climate what-if scenario: delta_temp_c is added directly to Tmax/Tmin.
    """
    doy = df["date"].dt.dayofyear.values
    tmax = df["T2M_MAX"].values + delta_temp_c
    tmin = df["T2M_MIN"].values + delta_temp_c
    rh = np.clip(df["RH2M"].values, 5.0, 100.0)
    u2_min = _load_u2_min_ms()
    u2 = np.maximum(df["WS2M"].values, u2_min)
    rs = np.maximum(df["ALLSKY_SFC_SW_DWN"].values, 0.0)

    eto = calculate_daily_eto(
        tmax=tmax,
        tmin=tmin,
        rh_mean=rh,
        u2=u2,
        rs=rs,
        lat_deg=lat_deg,
        elevation_m=elevation_m,
        day_of_year=doy
    )
    return pd.Series(eto, index=df.index, name="ETo_mm")

