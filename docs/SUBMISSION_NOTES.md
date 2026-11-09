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
  - Meteorology (POWER): `lat = 10.2433`, `lon = 106.3758`, `elevation = 2.0 m` (Winter–Spring Đông Xuân crop window starting `"11-01"`, plus full-year multi-phase rotation evaluation).
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

### 2.4. Rotation Strategies (`core/rotation.py`, `config/rotations.json`, `POST /api/rotations`)
- **Methodology:**
  - Rather than combining annual water deficit, bare-soil months, and unmodeled aquaculture phases into a single hidden weighted score, `evaluate_rotations(region_id, delta_temp_c, delta_rain_pct)` evaluates each multi-phase annual cropping strategy transparently and presents raw physical metrics alongside qualitative evidence, benefits, information gaps, and local verification risks.
  - **Modeled Crop Phases (`crop != null`):** Calls `calculate_water_balance(..., season_start=phase.get("start"))` to compute phase-specific `mean_deficit_mm`, `mean_etc_mm`, `mean_peff_mm`, `window` (`{"start", "end"}`), and phase `heat_ratio` (set to `null` when `heat_threshold_c` is `null`).
  - **Unmodeled Phases (`crop == null`, e.g., brackish-water shrimp in `S1`):** Marks `modeled: false` and sets `partial: true` at the strategy level so annual freshwater deficit (`annual_deficit_mm`, summed over modeled phases) is explicitly flagged as excluding the shrimp phase.
  - **12-Month Calendar & Bare-Soil Months (`calendar_12m`, `bare_months`):** Follows `_display_rule`: a calendar month is counted as covered by a phase if that phase occupies $\ge 10$ days in the month; perennial crops cover all 12 months (`bare_months = []`) while their irrigation deficit is evaluated over dry-season months 1–4. Each month also reports `salinity_month` (from documented regional intrusion windows) and monthly `heat_ratio`.
- **Sources in `config/rotations.json`:**

| Region / Strategy | Parameter / Evidence | Source Citation (`config/rotations.json`) | Verified |
|---|---|---|---|
| `Ben_Tre_DBSCL` (Region) | Peak salinity intrusion months `[1, 2, 3, 4]` | Quyết định 1705/QĐ-UBND tỉnh Bến Tre (02/8/2023) | `true` |
| `S0`: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | Ba Tri rice area >22,000 ha/year (2 seasons); 2024–2025 Đông Xuân sowing window 10/10–30/11 | Báo Nhân Dân (02/06/2025); Sở NN&PTNT Bến Tre (2024) | `true` |
| `S0`: 2 vụ lúa | 2015–2016 and 2019–2020 salinity damage to winter–spring rice; late-sown Ba Tri rice loss (>9,000 ha) | QĐ 1705/QĐ-UBND Bến Tre (2023); VnEconomy / Báo Chính phủ (2020) | `true` |
| `S1`: 1 vụ lúa mùa mưa + 1 vụ tôm nước lợ mùa khô | >7,200 ha rice–shrimp in Thạnh Phú; MARD 2016 recommendation to expand rice–shrimp in saline zones | VietnamPlus / TTXVN (25/06/2024); Báo Chính phủ (02/08/2016) | `true` |
| `S2`: Lúa Hè Thu + Ngô vụ Đông Xuân | Decision 1705 converting ineffective rice land to upland crops; Crop Production Dept recommending maize/soybean in Winter–Spring | QĐ 1705/QĐ-UBND Bến Tre (2023); Cục Trồng trọt / VnEconomy (21/09/2016) | `true` |
| `S2`: Lúa Hè Thu + Ngô vụ Đông Xuân | Maize $K_c$ (`0.30 / 1.20 / 0.35`) and $EC_e = 1.7\text{ dS/m}$ | FAO-56, Table 12 (p. 110) & Table 23 (p. 178) | `true` |
| `S3`: Lúa Hè Thu + Đậu tương vụ Đông Xuân | Crop Production Dept recommendation; Soybean $K_c$ (`0.40 / 1.15 / 0.50`) and $EC_e = 5.0\text{ dS/m}$; Rhizobium N-fixation | Cục Trồng trọt / VnEconomy (2016); FAO-56 Table 12 & Table 23; FAO Soils Bulletin 52 (1984) | `true` |
| `Dak_Lak_Tay_Nguyen` (`D0`: Bare-soil Robusta coffee) | Clean-weeded coffee $K_c$ (`0.90 / 0.95 / 0.95`) | FAO-56, Table 12 (p. 112) | `true` |
| `Dak_Lak_Tay_Nguyen` (`D0`: Bare-soil Robusta coffee) | Robusta optimal temperature 20.5°C and ~14% yield reduction per 1°C increase above thresholds | Kath et al. (2020), *Global Change Biology*, `doi:10.1111/gcb.15097` | `true` |
| `Dak_Lak_Tay_Nguyen` (`D1`: Coffee with cover crop / grass) | National Agricultural Extension recommendation on cover crops & contour trenches; Coffee with weeds $K_c$ (`1.05 / 1.10 / 1.10`) | Trung tâm Khuyến nông QG (2026); FAO-56, Table 12 (p. 112) | `true` |

---

## 2.5. Validation

1. **MODIS NDVI Confirms the 2-Season Cropping Schedule in Bến Tre:**
   - Multi-year monthly mean MODIS `MOD13Q1` NDVI (2015–2025, 3×3 km agricultural window at `10.0992, 106.6040` in Ba Tri) exhibits two distinct annual vegetation peaks and two low-NDVI troughs: NDVI peaks in January (`0.735`, Winter–Spring Đông Xuân rice canopy) and July–August (`0.781–0.736`, Summer–Autumn Hè Thu rice canopy), while dropping sharply during March–May (`0.398–0.482`, dry-season harvest/fallow) and September (`0.569`, inter-season harvest/land preparation). This satellite observation independently corroborates the 2-crop schedule (`S0`) and the fallow months `[2, 3, 4, 5, 9, 10]`.
2. **Actual Coffee Irrigation in Central Highlands vs. Model Atmospheric Deficit:**
   - Per the 3rd assumption of `Dak_Lak_Tay_Nguyen` in `config/rotations.json` (translated verbatim to English):
     > *"Calculated deficit (~351 mm for bare-soil coffee in 2015–2025) is the atmospheric water balance $ET_c - P_{eff}$ when maintaining full $ET_c$ throughout months 1–4. In practice, Central Highlands farmers apply deficit irrigation only during flower differentiation and fruit setting (3–4 applications × 400–600 L/tree at 1,100 trees/ha ≈ 130–230 mm/season, per WASI / National Agricultural Extension Center). Thus, the model number represents theoretical maximum atmospheric demand, not actual irrigation volume."*

---

## 3. Known Limitations

1. **Spatial Resolution of Meteorology & Solar Radiation:** NASA POWER meteorology variables (MERRA-2) have a $0.5^\circ \times 0.625^\circ$ grid resolution (~55 km), and solar radiation `ALLSKY_SFC_SW_DWN` (CERES) has a $1^\circ \times 1^\circ$ grid resolution, which smooth out local microclimates and topographic gradients in Central Highlands valleys.
2. **No Crop Yield or Economic Modeling:** The engine calculates physical water balance (mm) and threshold-exceedance frequency ($r$), not agronomic yield (tons/ha) or market revenue.
3. **SMAP & In-Situ Salinity Data:** SMAP CSV schema supported, no SMAP data used in current results. Real river/canal salinity time series (`salinity_ppt`) for Bến Tre is also not automatically fetched from a public unauthenticated API; when absent, the application explicitly reports them as missing (`available: false`) rather than substituting synthetic numbers.
4. **Representative Sowing Dates (`season_start`):** Sowing dates (`"11-01"` for Đông Xuân and `"05-25"` for Hè Thu in Bến Tre) are representative regional dates within the provincial schedule (10/10–30/11); actual farm-level sowing varies by sub-region and sluice-gate operation.
5. **Unsourced Rice Land-Preparation & Percolation Parameters (`verified: false`):** `rice` additional water parameters (`land_prep_mm = 200`, `percolation_mm_day = 3`) are assumed values (`source.water_extra: "TODO: giả định 200 mm làm đất và 3 mm/ngày thấm, chưa có nguồn chuẩn, không lấy từ FAO-56"`).
6. **Unmodeled Brackish-Water Shrimp Phase (`S1`):** In the rice–shrimp rotation (`S1`), the dry-season shrimp phase (`01-15 → 05-15`, `crop: null`) is not hydrologically modeled (`modeled: false`, `partial: true`) because shrimp ponds require brackish water rather than crop evapotranspiration calculations.
7. **Document-Based Salinity Intrusion Months:** Monthly salinity flags (`salinity_months: [1, 2, 3, 4]`) on the 12-month rotation strip are taken from provincial planning documents (Decision 1705/QĐ-UBND Bến Tre) rather than continuous daily canal sensor records.
8. **Two Strategies in Đắk Lắk & Unscored Coffee Heat:** Because Robusta coffee is a long-lived perennial plantation, `Dak_Lak_Tay_Nguyen` compares 2 orchard-floor management strategies (`D0` bare soil vs. `D1` cover crop/grass) rather than annual crop replacement. Furthermore, `heat_threshold_c` for `coffee` and `coffee_cover_crop` is set to `null` (not scored via a daily $T_{max}$ step threshold) because Kath et al. (2020) model seasonal mean/minimum temperature effects rather than a hard daily $T_{max}$ cutoff.
9. **Whole-Season Heat Exceedance Counting (Annual Crops):** For rice (`35.0°C`, Yoshida 1981 / Jagadish et al. 2007), maize (`35.0°C`, Dupuis & Dumas 1990 / Sánchez et al. 2014), and soybean (`35.0°C`, Hatfield et al. 2011), heat exceedance counts all days in the season with $T_{max} > 35^\circ\text{C}$, whereas physiological sterility is primarily concentrated during flowering/anthesis.
10. **Upland Salinity Conversion Assumption:** For upland crops, the salinity threshold is converted from $EC_e$ to water salinity using the FAO-29 assumption $EC_e \approx 1.5 \cdot EC_w$. This assumes a steady-state leaching fraction and has not been field-checked for the Mekong Delta.
11. **Wind Speed Floor & Actual Vapour Pressure Formulation:** The POWER `WS2M` floor is applied at $0.5\text{ m/s}$ (FAO-56 p.63). Actual vapour pressure is computed from daily mean `RH2M` using FAO-56 Eq. 19.
12. **Representative Point NDVI Window:** NDVI comes from a 3×3 km window around one selected farm point, not the whole province.

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
