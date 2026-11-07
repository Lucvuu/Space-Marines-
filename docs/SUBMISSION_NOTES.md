# AERO-AGRI — Technical Submission Notes
**2026 NASA International Space Apps Challenge**  
**Challenge:** Field Shift: Adapting Farms with NASA Data

---

## 1. NASA Data & Earth Observation Products Used

| Product Name | Variables / Bands | Spatial & Temporal Resolution | Access URL / Endpoint | Usage in Application |
|---|---|---|---|---|
| **NASA POWER** (Prediction Of Worldwide Energy Resources, Agroclimatology Archive) | `T2M_MAX` (°C), `T2M_MIN` (°C), `RH2M` (%), `WS2M` (m/s), `ALLSKY_SFC_SW_DWN` (MJ/m²/day), `PRECTOTCORR` (mm/day) | 0.5° × 0.625° grid, Daily (2015-01-01 to 2025-12-31) | `https://power.larc.nasa.gov/api/temporal/daily/point` (`community=AG`) | Core input for daily FAO-56 Penman-Monteith reference evapotranspiration ($ET_o$), USDA-SCS monthly effective rainfall ($P_{eff}$), crop water deficit, and seasonal heat-exceedance ratio. |
| **NASA MODIS Terra Vegetation Indices (`MOD13Q1` v061)** via ORNL DAAC REST API | `250m_16_days_NDVI` (scale factor `0.0001`, fill value `-3000` filtered out) | 250 m, 16-day composite (2015 to 2025) | `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates` and `/subset` | Aggregated into monthly mean NDVI and plotted on the secondary axis (0–1) of the regional climate chart to visualize seasonal vegetation cover cycles. Not currently included in the numerical crop score formula. |
| **NASA SMAP L4 Global 3-hourly 9 km Surface and Rootzone Soil Moisture** *(Optional schema supported)* | `sm_rootzone` (m³/m³) | 9 km, Daily CSV contract (`data/raw/soil_moisture/<region_id>.csv`) | Local CSV ingestion contract | Supported by the data loader and `/api/climate` endpoint when user CSV files are provided; displays an explicit empty state when absent. |

**Pilot Coordinates Evaluated:**
- **Bến Tre (Mekong Delta, Vietnam):** `lat = 10.2433`, `lon = 106.3758`, `elevation = 2.0 m` (Dry season: Months 1–4).
- **Đắk Lắk (Central Highlands, Vietnam):** `lat = 12.6667`, `lon = 108.0500`, `elevation = 530.0 m` (Dry season: Months 1–4).

---

## 2. Methodology & Equations

### 2.1. Reference Evapotranspiration ($ET_o$) — FAO-56 Penman-Monteith
Daily reference evapotranspiration is computed using the FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998) Penman-Monteith equation (**Eq. 6**):

$$ET_o = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T_{mean} + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

Supporting equations implemented in `core/eto.py`:
- **Atmospheric Pressure ($P$, kPa) & Psychrometric Constant ($\gamma$, kPa/°C) — Eq. 7 & Eq. 8:**
  $$P = 101.3 \left(\frac{293 - 0.0065 z}{293}\right)^{5.26}, \quad \gamma = 0.000665 P$$
- **Saturation & Actual Vapor Pressure ($e_s, e_a$, kPa) — Eq. 11, Eq. 12, Eq. 19:**
  $$e^0(T) = 0.6108 \exp\left(\frac{17.27 T}{T + 237.3}\right), \quad e_s = \frac{e^0(T_{max}) + e^0(T_{min})}{2}, \quad e_a = \frac{RH_{2M}}{100} e_s$$
- **Slope of Saturation Vapor Pressure Curve ($\Delta$, kPa/°C) — Eq. 13:**
  $$\Delta = \frac{4098 \cdot e^0(T_{mean})}{(T_{mean} + 237.3)^2}$$
- **Extraterrestrial Radiation ($R_a$, MJ/m²/day) & Clear-Sky Solar Radiation ($R_{so}$) — Eq. 21 & Eq. 37:**
  $$R_{so} = (0.75 + 2 \times 10^{-5} z) R_a$$
- **Net Shortwave ($R_{ns}$) & Net Longwave Radiation ($R_{nl}$) — Eq. 38 & Eq. 39** (with relative shortwave ratio $\min(R_s / R_{so}, 1.0)$):
  $$R_{ns} = (1 - 0.23) R_s, \quad R_{nl} = \sigma \left(\frac{T_{max,K}^4 + T_{min,K}^4}{2}\right)(0.34 - 0.14\sqrt{e_a})\left(1.35 \frac{R_s}{R_{so}} - 0.35\right)$$
- **Daily Soil Heat Flux ($G$):** $G = 0\text{ MJ/m}^2/\text{day}$ (**Eq. 42**).

When a user adjusts the climate simulator temperature slider ($\Delta T$ in °C), $T_{max}$ and $T_{min}$ are shifted by $\Delta T$ and the full Penman-Monteith equation is recomputed day-by-day.

### 2.2. Crop Water Requirement, Effective Rainfall ($P_{eff}$), and Seasonal Deficit
- **Crop Evapotranspiration ($ET_c$):**
  - Annual crops (`rice`, `soybean`, `maize`): daily $K_c$ is linearly interpolated across four growth stages (`ini`, `dev`, `mid`, `late`) starting on January 1 of each dry season ($ET_c = K_c \cdot ET_o$).
  - Perennial crops (`coffee`, `coffee_cover_crop`): evaluated across dry-season months (1–4) using fixed $K_c = K_{c,\text{mid}}$.
  - Additional water requirements (`land_prep_mm` and `percolation_mm_day`, e.g., $200\text{ mm}$ land preparation and $3\text{ mm/day}$ percolation for paddy rice per FAO-56 Ch. 7 / CROPWAT):
    $$W_{\text{req}} = \sum ET_c + W_{\text{land\_prep}} + (d_{\text{season}} \cdot W_{\text{percolation}})$$
- **Monthly Effective Rainfall ($P_{eff}$, mm) — USDA Soil Conservation Service (USDA-SCS) method:**
  $$P_{eff} = \begin{cases} P \cdot \frac{125 - 0.2 P}{125} & \text{if } P \le 250\text{ mm/month} \\ 125 + 0.1 P & \text{if } P > 250\text{ mm/month} \end{cases}$$
- **Seasonal Irrigation Deficit & Irrigation Share:**
  $$\text{deficit\_mm} = \max(W_{\text{req}} - \sum P_{eff}, 0), \quad \text{irrigation\_share} = \text{clip}\left(\frac{\text{deficit\_mm}}{W_{\text{req}}}, 0, 1\right)$$

### 2.3. Salinity Conversion & Suitability / Risk Separation
- **Soil Saturation Extract ($EC_e$) to Irrigation Water Salinity ($\text{ppt}$, ‰):**
  Crop salinity thresholds from FAO-56 Table 23 are given as $EC_e$ (dS/m). Assuming $EC_e \approx 1.5 \cdot EC_w$ (FAO Irrigation and Drainage Paper 29) and $1\text{ ‰} \approx 1.56\text{ dS/m}$:
  $$\text{salinity\_threshold\_ppt} = \frac{EC_e}{1.5 \times 1.56}$$
- **Relative Comparison Score (`score`, 0–100):**
  Measures suitability relative to the region's baseline crop (first crop in `candidate_crops`):
  $$\text{water\_component} = \text{clip}\left(\frac{\text{deficit\_mm}}{\text{baseline\_deficit\_mm}}, 0, 1\right)$$
  $$\text{score} = 100 \times \left(1 - \sum_{k \in \text{active}} \tilde{w}_k \cdot c_k\right)$$
  Weights are only redistributed for components missing across **all** crops in a region. If a crop is missing a component that is available for other crops in the same region (e.g., `rice_shrimp` lacking plant $K_c$), its `score` is set to `null` and `risk_level` is marked `INSUFFICIENT_DATA`.
- **Absolute Risk Classification (`risk_level`):**
  Computed strictly from absolute threshold-exceedance ratios during the dry season:
  $$r = \max(\text{heat\_ratio}, \text{salinity\_exceed})$$
  classified via `risk_thresholds_exceed_ratio` (`LOW < 0.10`, `MODERATE < 0.25`, `SEVERE < 0.50`, `CRITICAL >= 0.50`).

---

## 3. Known Limitations

1. **Spatial Resolution of Meteorology:** NASA POWER agroclimatology variables have a $0.5^\circ \times 0.625^\circ$ grid resolution (~55 km), which smooths out local microclimates and topographic gradients in Central Highlands valleys.
2. **No Crop Yield or Economic Modeling:** The engine calculates physical water balance (mm) and threshold-exceedance frequency ($r$), not agronomic yield (tons/ha) or market revenue.
3. **Missing In-Situ Salinity & SMAP Data:** Real river/canal salinity time series (`salinity_ppt`) for Bến Tre and SMAP L4 rootzone soil moisture (`sm_rootzone`) are not automatically fetched from a public unauthenticated API; when absent, the application explicitly reports them as missing (`available: false`) rather than substituting synthetic numbers.
4. **Unverified Agronomic Parameters (`verified: false`):** All crop parameters in `config/crops.json`, region definitions in `config/regions.json`, and scoring thresholds in `config/scoring.json` are marked `"verified": false`. Specifically:
   - `heat_threshold_c` values carry `"source": {"heat": "TODO: cần nguồn"}` because FAO-56 does not define daily maximum temperature thresholds.
   - `rice_shrimp` rotational aquaculture-rice parameters (`kc_*`, `salinity_threshold_ece_dsm`) are `null` (`TODO`) awaiting local agricultural extension validation.
5. **Relative Water Clipping Ceiling:** Because `water_component = clip(deficit_mm / baseline_deficit_mm, 0, 1)` caps at `1.0`, any candidate crop whose water deficit exceeds the baseline crop's deficit (such as `coffee_cover_crop` with $K_{c,\text{mid}} = 1.10$ vs. bare-ground `coffee` with $K_{c,\text{mid}} = 0.95$) receives the same maximum water penalty (`1.0`) as the baseline crop.

---

## 4. Third-Party Libraries & AI Disclosure

### Third-Party Software & Libraries
| Library | Version | License | Role |
|---|---|---|---|
| Python Standard Library (`http.server`, `unittest`, `json`, `urllib`) | Python 3.11+ | PSF License | Local HTTP server, REST routing, test runner |
| `pandas` | $\ge 2.0.0$ | BSD-3-Clause | Time-series alignment and monthly/seasonal aggregation |
| `numpy` | $\ge 1.24.0$ | BSD-3-Clause | Vectorized FAO-56 Penman-Monteith calculations |
| `requests` | $\ge 2.28.0$ | Apache-2.0 | HTTP client for NASA POWER and ORNL DAAC MODIS APIs |
| `pytest` | $\ge 7.0.0$ | MIT | Automated unit and regression testing |
| Leaflet | `1.9.4` (vendored offline) | BSD-2-Clause | Interactive map rendering (`L.circleMarker`) |
| Chart.js | `4.4.1` (vendored offline) | MIT | Monthly rainfall, $ET_o$, and MODIS NDVI visualization |

### AI & Tooling Disclosure
Code scaffolded with Google Antigravity (Gemini) and reviewed with Claude.

---

## 5. License

This project is licensed under the **Apache License, Version 2.0**. See the [LICENSE](../LICENSE) file for the full license text.
