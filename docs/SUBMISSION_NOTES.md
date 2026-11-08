# AERO-AGRI — Technical Submission Notes
**2026 NASA International Space Apps Challenge**  
**Challenge:** Field Shift: Adapting Farms with NASA Data

---

## 1. NASA Data & Earth Observation Products Used

| Product Name | Variables / Bands | Spatial & Temporal Resolution | Access URL / Endpoint | Usage in Application |
|---|---|---|---|---|
| **NASA POWER** (Prediction Of Worldwide Energy Resources, Agroclimatology Archive) | `T2M_MAX` (°C), `T2M_MIN` (°C), `RH2M` (%), `WS2M` (m/s), `ALLSKY_SFC_SW_DWN` (MJ/m²/day), `PRECTOTCORR` (mm/day) | Meteorology (MERRA-2): 0.5° × 0.625°; Solar radiation `ALLSKY_SFC_SW_DWN` (CERES): 1° × 1°; Daily (2015-01-01 to 2025-12-31) | `https://power.larc.nasa.gov/api/temporal/daily/point` (`community=AG`) | Core input for daily FAO-56 Penman-Monteith reference evapotranspiration ($ET_o$), USDA-SCS monthly effective rainfall ($P_{eff}$), crop water deficit, and seasonal heat-exceedance ratio. |
| **NASA MODIS Terra Vegetation Indices (`MOD13Q1` v061)** via ORNL DAAC REST API | `250m_16_days_NDVI` (scale factor `0.0001`, fill value `-3000` filtered out) & `250m_16_days_pixel_reliability` (keeping codes `0` good and `1` marginal, $\ge 20$ valid pixels/day) | 250 m (3×3 km window = 81 pixels median), 16-day composite (2015 to 2025) | `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates` and `/subset` | Aggregated into monthly mean NDVI and plotted on the secondary axis (0–1) of the regional climate chart to visualize seasonal vegetation cover cycles. Not currently included in the numerical crop score formula. |

**Pilot Coordinates Evaluated:**
- **Bến Tre (Mekong Delta, Vietnam):**
  - Meteorology (POWER): `lat = 10.2433`, `lon = 106.3758`, `elevation = 2.0 m` (Dry season: Months 1–4).
  - Agricultural NDVI window (`ndvi_point`): `lat = 10.0992`, `lon = 106.6040` (Rice fields near Mỹ Nhơn market, former Ba Tri district).
- **Đắk Lắk (Central Highlands, Vietnam):**
  - Meteorology (POWER): `lat = 12.6667`, `lon = 108.0500`, `elevation = 530.0 m` (Dry season: Months 1–4).
  - Agricultural NDVI window (`ndvi_point`): `lat = 12.8314`, `lon = 108.1282` (Coffee plantations near Quảng Phú, former Cư M'gar district).

---

## 2. Methodology & Equations

### 2.1. Reference Evapotranspiration ($ET_o$) — FAO-56 Penman-Monteith
Daily reference evapotranspiration is computed using the FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998) Penman-Monteith equation (**Eq. 6**), with wind speed at 2 m floored at $u_2 = \max(u_2, 0.5\text{ m/s})$ per FAO-56 Ch. 3, p. 63:

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
  - Annual crops (`rice`, `soybean`, `maize`): daily $K_c$ is linearly interpolated across four growth stages (`ini`, `dev`, `mid`, `late`) over `season_days` starting from the configurable `season_start` (`MM-DD`, with optional per-crop override `crop_season_start` in `config/regions.json`, supporting cross-year seasons) ($ET_c = K_c \cdot ET_o$).
  - Perennial crops (`coffee`, `coffee_cover_crop`): evaluated across dry-season months (1–4) using fixed $K_c = K_{c,\text{mid}}$.
  - Additional water requirements (`land_prep_mm` and `percolation_mm_day`, e.g., $200\text{ mm}$ land preparation and $3\text{ mm/day}$ percolation for paddy rice — assumed values, not from FAO-56; source TODO (`verified: false`)):
    $$W_{\text{req}} = \sum ET_c + W_{\text{land\_prep}} + (d_{\text{season}} \cdot W_{\text{percolation}})$$
- **Monthly Effective Rainfall ($P_{eff}$, mm) — USDA Soil Conservation Service (USDA-SCS) method (prorated for partial months):**
  $$P_{eff,\text{full}} = \begin{cases} P \cdot \frac{125 - 0.2 P}{125} & \text{if } P \le 250\text{ mm/month} \\ 125 + 0.1 P & \text{if } P > 250\text{ mm/month} \end{cases}, \quad P_{eff,\text{season}} = \sum_{m} P_{eff,\text{full}}(m) \cdot \frac{d_{\text{season},m}}{d_{\text{month},m}}$$
- **Seasonal Irrigation Deficit & Irrigation Share:**
  $$\text{deficit\_mm} = \max(W_{\text{req}} - \sum P_{eff}, 0), \quad \text{irrigation\_share} = \text{clip}\left(\frac{\text{deficit\_mm}}{W_{\text{req}}}, 0, 1\right)$$

### 2.3. Salinity Conversion & Suitability / Risk Separation
- **Salinity Threshold Conversion to Water Salinity ($\text{ppt}$, ‰):**
  Crop salinity thresholds from FAO-56 Table 23 (pp. 178–179) are converted according to each crop's `salinity_basis` (`1 ‰ ≈ 1.56 dS/m`):
  - **Submerged paddy rice (`salinity_basis = "soil_water_submerged"`):** Per FAO-56 Table 23 (p. 179, Footnote 6): *"Because paddy rice is grown under flooded conditions, values refer to the electrical conductivity of the soil water while the plants are submerged."* Thus the $3.0\text{ dS/m}$ threshold for rice is already the electrical conductivity of the standing soil water and is **not** divided by $1.5$:
    $$\text{salinity\_threshold\_ppt}_{\text{submerged}} = \frac{EC_{\text{sw}}}{1.56} \quad (\text{for rice: } \frac{3.0}{1.56} \approx 1.923\text{ ‰})$$
  - **Upland crops (`salinity_basis = "ece"`, e.g., soybean, maize):** Thresholds are soil saturation extract conductivity ($EC_e$, dS/m). Assuming $EC_e \approx 1.5 \cdot EC_w$ (FAO Irrigation and Drainage Paper 29):
    $$\text{salinity\_threshold\_ppt}_{\text{ece}} = \frac{EC_e}{1.5 \times 1.56} \quad (\text{for soybean: } \frac{5.0}{1.5 \times 1.56} \approx 2.137\text{ ‰})$$
- **Relative Comparison Score (`score`, 0–100):**
  Measures suitability across candidate crops in the region by normalizing the water component against the maximum seasonal deficit among crops with valid deficit in the region:
  $$\text{water\_component}_i = \begin{cases} \frac{\text{deficit\_mm}_i}{\max_{j \in \text{valid}} (\text{deficit\_mm}_j)} & \text{if } \max_{j \in \text{valid}} (\text{deficit\_mm}_j) > 0 \\ 0 & \text{if } \max_{j \in \text{valid}} (\text{deficit\_mm}_j) = 0 \end{cases}$$
  $$\text{score} = 100 \times \left(1 - \sum_{k \in \text{active}} \tilde{w}_k \cdot c_k\right)$$
  Weights are only redistributed for components missing across **all** crops in a region. If a crop is missing a component that is available for other crops in the same region (e.g., `rice_shrimp` lacking plant $K_c$), its `score` is set to `null` and `risk_level` is marked `INSUFFICIENT_DATA`.
- **Absolute Risk Classification (`risk_level`):**
  Computed strictly from absolute threshold-exceedance ratios during the dry season:
  $$r = \max(\text{heat\_ratio}, \text{salinity\_exceed})$$
  classified via `risk_thresholds_exceed_ratio` (`LOW < 0.10`, `MODERATE < 0.25`, `SEVERE < 0.50`, `CRITICAL >= 0.50`).

---

## 3. Known Limitations

1. **Spatial Resolution of Meteorology & Solar Radiation:** NASA POWER meteorology variables (MERRA-2) have a $0.5^\circ \times 0.625^\circ$ grid resolution (~55 km), and solar radiation `ALLSKY_SFC_SW_DWN` (CERES) has a $1^\circ \times 1^\circ$ grid resolution, which smooth out local microclimates and topographic gradients in Central Highlands valleys.
2. **No Crop Yield or Economic Modeling:** The engine calculates physical water balance (mm) and threshold-exceedance frequency ($r$), not agronomic yield (tons/ha) or market revenue.
3. **SMAP & In-Situ Salinity Data:** SMAP CSV schema supported, no SMAP data used in current results. Real river/canal salinity time series (`salinity_ppt`) for Bến Tre is also not automatically fetched from a public unauthenticated API; when absent, the application explicitly reports them as missing (`available: false`) rather than substituting synthetic numbers.
4. **Unverified Agronomic Parameters (`verified: false`):** Crop parameters in `config/crops.json`, region definitions in `config/regions.json`, and scoring thresholds in `config/scoring.json` carry `"verified": false` at the top level:
   - `heat_threshold_c` values carry `"source": {"heat": "TODO: cần nguồn"}` because FAO-56 does not define daily maximum temperature thresholds.
   - `rice` additional water parameters (`land_prep_mm = 200`, `percolation_mm_day = 3`) are assumed values, not from FAO-56; source TODO (`verified: false`).
   - `rice_shrimp` rotational aquaculture-rice parameters (`kc_*`, `salinity_threshold_ece_dsm`) are `null` (`TODO`) awaiting local agricultural extension validation.
5. **Crop Calendar Placeholders:** season start dates are configurable; current values are placeholders pending local crop-calendar sources.
6. **Whole-Season Heat Exceedance Counting:** Heat exceedance counts all days with $T_{max} > \text{threshold}$ in the season, not only sensitive stages such as anthesis.
7. **Upland Salinity Conversion Assumption:** For upland crops, the salinity threshold is converted from $EC_e$ to water salinity using the FAO-29 assumption $EC_e \approx 1.5 \cdot EC_w$. This assumes a steady-state leaching fraction and has not been field-checked for the Mekong Delta.
8. **Wind Speed Floor:** The POWER `WS2M` floor is applied at $0.5\text{ m/s}$ (FAO-56 p.63, Fix 1).
9. **Actual Vapour Pressure Formulation:** Actual vapour pressure is computed from daily mean `RH2M` using FAO-56 Eq. 19, which FAO-56 calls "less desirable" than Eq. 17/18 because POWER provides no $RH_{max}/RH_{min}$. Sensitivity check: using POWER `T2MDEW` with Eq. 14 instead raises Jan–Apr $ET_o$ in Bến Tre by about 7–9% and changes Đắk Lắk by less than 1%. Crop ranking is unaffected because all crops in a region share the same $ET_o$.
10. **Representative Point NDVI Window:** NDVI comes from a 3×3 km window around one selected farm point, not the whole province.

---

## 4. Data Citations & Acknowledgements

- **NASA POWER:** *"These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program."* (`https://power.larc.nasa.gov/`, accessed 2026-11-07).
- **MODIS MOD13Q1:** Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*. NASA EOSDIS Land Processes DAAC. `doi:10.5067/MODIS/MOD13Q1.061`.
- **ORNL DAAC Subset Web Service:** ORNL DAAC MODIS/VIIRS Land Product Subsets web service (`https://modis.ornl.gov/`, accessed 2026-11-08).
- **OpenStreetMap:** Online map tiles when network connectivity is available, *"© OpenStreetMap contributors"*, licensed under the Open Data Commons Open Database License (ODbL).

---

## 5. Third-Party Libraries & AI Disclosure

### Third-Party Software & Libraries
| Library / Service | Requirement | Tested Version | License | Role |
|---|---|---|---|---|
| Python Standard Library (`http.server`, `unittest`, `json`, `urllib.parse`) | Python 3.11+ | `3.13.15` | PSF License | Local HTTP server, URL parsing, unit test framework |
| `pandas` | $\ge 2.0.0$ | `3.0.6` | BSD-3-Clause | Time-series alignment and monthly/seasonal aggregation |
| `numpy` | $\ge 1.24.0$ | `2.5.2` | BSD-3-Clause | Vectorized FAO-56 Penman-Monteith calculations |
| `requests` | $\ge 2.28.0$ | `2.34.2` | Apache-2.0 | HTTP client for NASA POWER and ORNL DAAC MODIS APIs |
| `pytest` | $\ge 7.0.0$ | `9.2.0` | MIT | Automated unit and regression testing |
| Leaflet | `1.9.4` (vendored offline) | `1.9.4` | BSD-2-Clause | Interactive map rendering (`L.circleMarker`) |
| Chart.js | `4.4.1` (vendored offline) | `4.4.1` | MIT | Monthly rainfall, $ET_o$, and MODIS NDVI visualization |
| OpenStreetMap Tiles | Online when reachable | N/A | ODbL (`© OpenStreetMap contributors`) | Optional background basemap tiles |

### AI & Tooling Disclosure
Code scaffolded with Google Antigravity (Gemini) and reviewed with Claude.

---

## 6. License

This project is licensed under the **Apache License, Version 2.0**. See the [LICENSE](../LICENSE) file for the full license text.
