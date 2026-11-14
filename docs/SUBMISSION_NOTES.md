# AERO-AGRI — Technical Submission Notes
**2026 NASA International Space Apps Challenge**  
**Challenge:** Field Shift: Adapting Farms with NASA Data

---

## 1. NASA Data & Earth Observation Products Used

| Product Name | Variables / Bands | Spatial & Temporal Resolution | Access URL / Endpoint | Usage in Application |
|---|---|---|---|---|
| **NASA POWER** (Prediction Of Worldwide Energy Resources, Agroclimatology Archive) | `T2M_MAX` (°C), `T2M_MIN` (°C), `RH2M` (%), `WS2M` (m/s), `ALLSKY_SFC_SW_DWN` (MJ/m²/day), `PRECTOTCORR` (mm/day) | Meteorology (MERRA-2): 0.5° × 0.625°; Solar radiation `ALLSKY_SFC_SW_DWN` (CERES): 1° × 1°; Daily (2015-01-01 to 2025-12-31) | `https://power.larc.nasa.gov/api/temporal/daily/point` (`community=AG`) | Core input for daily FAO-56 Penman-Monteith reference evapotranspiration ($ET_o$), USDA-SCS monthly effective rainfall ($P_{eff}$), crop water deficit, and seasonal heat-exceedance ratio. |
| **NASA MODIS Terra Vegetation Indices (`MOD13Q1` v061)** via ORNL DAAC REST API | `250m_16_days_NDVI` (scale factor `0.0001`, fill value `-3000` filtered out) & `250m_16_days_pixel_reliability` (keeping codes `0` good and `1` marginal, $\ge 20$ valid pixels/day) | 250 m (3×3 km window = 81 pixels median), 16-day composite (2015 to 2025) | `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates` and `/subset` (Bến Tre); GEE `MODIS/061/MOD13Q1` with the same QA rules for Đắk Lắk, because the ORNL API returned 502 errors on 2026-11-14 (checked on Bến Tre: 181 common dates, r = 0.999, mean absolute difference 0.0044) | Monthly mean NDVI shown against the modeled 12-month crop calendar (independent check of the 2-crop schedule). |
| **NASA MODIS Terra Surface Reflectance (`MOD09A1` v061)** via Google Earth Engine | `sur_refl_b01` (red), `b02` (NIR), `b03` (blue), `b06` (SWIR1), `StateQA` (cloud, cloud-shadow, internal-cloud flags) → EVI, LSWI, NDVI | 500 m, 3×3 km window median of clear pixels, 8-day composite (2015–2025, 506 composites) | GEE `MODIS/061/MOD09A1` (`scripts/gee_fetch.py`) | **Rice sowing dates from space (T3):** flooding signal `LSWI + 0.05 ≥ EVI` followed by EVI green-up; compared with the representative sowing dates used by the model. |
| **NASA GPM IMERG Final** monthly V07 via Google Earth Engine | `precipitation` (mm/hr → mm/month) | 0.1°, monthly (2015-01 to 2025-09) | GEE `NASA/GPM_L3/IMERG_MONTHLY_V07` | **Rainfall cross-check (T5)** of NASA POWER `PRECTOTCORR`; share of annual rain in the erosive wet season (T7). |
| **NASA SMAP L4** (`SPL4SMGP` Version 8) via Google Earth Engine | `sm_rootzone`, `sm_surface` (m³/m³) | 9 km, 3-hourly → monthly mean (2015-04 to 2025-12) | GEE `NASA/SMAP/SPL4SMGP/008` | **Soil-moisture cross-check (T4)** for Đắk Lắk: dry-season (Jan–Apr) root-zone anomaly vs. the model's yearly coffee water deficit. |
| **NASA SRTM** v3 (`SRTMGL1`) via Google Earth Engine | `elevation` → slope (`ee.Terrain.slope`) | 30 m, static | GEE `USGS/SRTMGL1_003` | Slope statistics of the coffee site (erosion context, T7). |

Google Earth Engine is only the access and processing platform for NASA products. `scripts/gee_fetch.py` runs once and writes small CSV files to `data/raw/gee/` (committed, listed in `data/manifest.json`); the app itself never calls GEE, so no account is needed to run it.

**Pilot Coordinates Evaluated** (NASA POWER, MODIS and GEE extractions all use the farm point):
- **Bến Tre (Mekong Delta, Vietnam):** `lat = 10.0992`, `lon = 106.6040`, `elevation = 2.0 m`: rice fields near Mỹ Nhơn market, former Ba Tri district (now part of Vĩnh Long province).
- **Đắk Lắk (Central Highlands, Vietnam):** `lat = 12.8314`, `lon = 108.1282`, `elevation = 530.0 m`: coffee farms near Quảng Phú, former Cư M'gar district.

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
  - Additional water requirements (`land_prep_mm` and `percolation_mm_day`) (paddy rice: 300 mm = 200 mm soil saturation + 100 mm water layer, plus 4 mm/day percolation and seepage for heavy clay, from FAO Training Manual 3, Brouwer & Heibloem 1986, Part II Sec. 4.4; soil type assumed):
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
  - **12-Month Calendar & Bare-Soil Months (`calendar`, `bare_months`):** Follows `_display_rule`: a calendar month counts as covered if a phase occupies at least 15 days of it (reference year 2025, cross-year allowed); perennial crops cover all 12 months (`bare_months = []`) while their irrigation deficit is evaluated over dry-season months 1–4. Each month also reports `salinity_month` (from documented regional intrusion windows) and monthly `heat_ratio`.
### 2.5. Year-to-Year Variability (T2)
Every modeled phase is evaluated for each year 2015–2025. A **crop year** `y` groups the phases sown in year `y` (e.g. Summer–Autumn rice sown 25 May `y` + dry-season crop sown 1 Nov `y`, labelled `y/y+1`); only crop years in which every modeled phase has a complete season are kept. Each strategy reports the per-year freshwater deficit, the **median year (P50)** and the **dry year exceeded about 1 year in 5 (P80)**, the usual design convention in irrigation planning. Documented drought and salinity years (2015/16 and 2019/20 for Bến Tre, `stress_years` in `config/rotations.json`) are highlighted.

### 2.6. Rice Sowing Dates from Space (T3, `core/phenology.py`, `config/phenology.json`)
- **Flooding signal:** a composite is flooded when $LSWI + 0.05 \ge EVI$ (Xiao et al. 2005; applied to the Mekong Delta by Tran Thi Hien & Vo Quang Minh 2014), with $EVI = 2.5\,\frac{NIR - Red}{NIR + 6 Red - 7.5 Blue + 1}$ and $LSWI = \frac{NIR - SWIR_1}{NIR + SWIR_1}$.
- **Green-up confirmation:** the flood is accepted as rice establishment if EVI reaches half of the crop-cycle maximum within five 8-day composites (Xiao et al. 2005).
- **App assumptions (stated, not sourced):** crop-cycle peak EVI ≥ 0.35; detections less than 60 days apart are merged; a composite is used only if ≥ 50% of the window is cloud-free; a detection more than 60 days from every configured sowing date is "unmatched" (excluded from the medians), and a field report is compared only with a detection within 60 days.
- Detected dates are matched to the nearest configured sowing date (Summer–Autumn `05-25`, Winter–Spring `11-01`) and reported as offsets; one dated field report (Ba Tri, Winter–Spring sown around 22 Nov 2023) is used as a ground check.

### 2.7. Independent Cross-Checks (T4, T5)
- **Rainfall (T5):** monthly POWER `PRECTOTCORR` totals vs. GPM IMERG Final monthly over the overlapping months; mean per calendar month, annual ratio and monthly correlation.
- **Soil moisture (T4, Đắk Lắk):** SMAP L4 root-zone soil moisture, mean of January–April per year, minus the 2015–2025 mean of the same months (anomaly, m³/m³), set against the model's yearly dry-season deficit for current practice (D0). Bến Tre is excluded: a 9 km SMAP cell over flooded coastal paddies mixes open water and fields.

### 2.8. Relative Soil Loss, Bare vs. Cover-Cropped Coffee (T7, `core/erosion.py`, `config/erosion.json`)
RUSLE: $A = R \cdot K \cdot LS \cdot C \cdot P$. D0 (clean-weeded inter-rows) and D1 (cover crop) share the same rain, soil and slope, so $R$, $K$, $LS$ and $P$ cancel and $A_{D1}/A_{D0} = C_{D1}/C_{D0}$. C-factors are plot measurements for coffee in Lampung, Indonesia (Afandi et al. 2003): 0.045 clean-weeded, 0.006 with *Paspalum conjugatum* cover. No absolute tonnes are reported. SRTM slope and the IMERG wet-season rain share are shown as site context only.

### 2.9. Sources in `config/rotations.json` and `config/crops.json`

<!-- BEGIN SOURCES (auto-generated by scripts/gen_sources_table.py, do not edit) -->
| Region | Strategy | Evidence | Source | Verified |
|---|---|---|---|---|
| `Ben_Tre_DBSCL` | S0: Current practice: 2 rice crops (Summer–Autumn + early Winter–Spring) | NDVI at point 10.0992, 106.6040 (2022–2024): two peaks each year (June–August and December–January), low from March to May. | NASA MODIS MOD13Q1 v061 via ORNL DAAC | `True` |
| `Ben_Tre_DBSCL` | S0: Current practice: 2 rice crops (Summer–Autumn + early Winter–Spring) | Mỹ Chánh commune, Ba Tri: 'only two rice crops a year'; farmers were urged 'not to sow the 2023 Autumn–Winter crop' (translated from Vietnamese). | Báo Nông nghiệp Việt Nam [Vietnam Agriculture newspaper], 22/02/2024 | `True` |
| `Ben_Tre_DBSCL` | S0: Current practice: 2 rice crops (Summer–Autumn + early Winter–Spring) | Coastal areas: 'finish all sowing within October to November (solar calendar) so as to harvest before salinity intrusion peaks' (translated from Vietnamese). | NAEC salinity handbook 2026–2027, p.10 | `True` |
| `Ben_Tre_DBSCL` | S1: Rice–shrimp (wet-season rice, tiger shrimp in the dry season) | Bình Đại (coastal district next to Ba Tri): 'Rice crop from 9/2012 to 12/2012… Tiger shrimp crop from 3/2013 to 7/2013.' (translated from Vietnamese) | Nguyễn Mỹ Hoa, Trần Sơn Tùng, Nguyễn Hồng Giang, Võ Thị Gương (2016). Tạp chí KH ĐH Cần Thơ [Can Tho University Journal of Science], Part A, 42: 40–49 | `True` |
| `Ben_Tre_DBSCL` | S1: Rice–shrimp (wet-season rice, tiger shrimp in the dry season) | Coastal Vĩnh Long: 'zone saline and brackish areas, do not rigidly convert them to fresh water; arrange livelihoods to suit the water source.' (translated from Vietnamese) | NAEC salinity handbook 2026–2027, p.50 | `True` |
| `Ben_Tre_DBSCL` | S2: Summer–Autumn rice + soybean instead of the Winter–Spring crop | ECe threshold: soybean 5.0 dS/m; maize 1.7 dS/m. | FAO-56, Table 23, pp.178–179 | `True` |
| `Ben_Tre_DBSCL` | S2: Summer–Autumn rice + soybean instead of the Winter–Spring crop | Bến Tre has a policy supporting the conversion of rice land to upland crops: Decision 1353/QĐ-UBND of 11/07/2014. | caselaw.vn (full text not yet read) | `False` |
| `Ben_Tre_DBSCL` | S2: Summer–Autumn rice + soybean instead of the Winter–Spring crop | Long Khánh commune, Cai Lậy, Tiền Giang (triple-rice land inside dikes, freshwater zone): after mung bean in the Summer–Autumn season, the following rice crop took up 98 kg N/ha from the soil, versus 69 kg N/ha in fields with three continuous rice crops; rice yield of the following crop was 4.6 t/ha, versus 3 t/ha. The test crop was mung bean, not soybean. | Võ Thị Gương, Nguyễn Minh Đông, Châu Minh Khôi (2010). Tạp chí Khoa học ĐH Cần Thơ [Can Tho University Journal of Science] 16b: 147–154, p.152 | `True` |
| `Ben_Tre_DBSCL` | S3: Summer–Autumn rice + maize instead of the Winter–Spring crop | Maize ECe threshold is 1.7 dS/m, the lowest of the compared crops. | FAO-56, Table 23, p.179 | `True` |
| `Ben_Tre_DBSCL` | S3: Summer–Autumn rice + maize instead of the Winter–Spring crop | Ba Tri, low-salinity sub-zone (4/2012–6/2013): a maize–rice–rice system was tested, together with watermelon–rice–rice and okra–rice–rice, against three rice crops. The okra–rice–rice system gave the highest economic return. | Nguyễn Mỹ Hoa et al. (2014). Tạp chí Khoa học ĐH Cần Thơ [Can Tho University Journal of Science], special issue on Agriculture: 31–37 (abstract) | `True` |
| `Ben_Tre_DBSCL` | S3: Summer–Autumn rice + maize instead of the Winter–Spring crop | Same experiment in Cai Lậy, Tiền Giang (freshwater zone): after baby corn, the following rice crop took up 105 kg N/ha, versus 69 kg N/ha in fields with three rice crops; yield 4.0 t/ha, versus 3 t/ha. The test crop was baby corn, not grain maize. | Võ Thị Gương, Nguyễn Minh Đông, Châu Minh Khôi (2010). Tạp chí Khoa học ĐH Cần Thơ [Can Tho University Journal of Science] 16b: 147–154, p.152 | `True` |
| `Dak_Lak_Tay_Nguyen` | D0: Current practice: Robusta coffee on bare soil | Kc for coffee on bare ground 0.90 / 0.95 / 0.95. | FAO-56, Table 12, p.112 | `True` |
| `Dak_Lak_Tay_Nguyen` | D0: Current practice: Robusta coffee on bare soil | NDVI at point 12.8314, 108.1282 is high all year (about 0.66–0.80): a perennial crop. | NASA MODIS MOD13Q1 v061 via ORNL DAAC | `True` |
| `Dak_Lak_Tay_Nguyen` | D1: Robusta coffee with cover crop / grass cover | 'Strengthen the system of shade trees and windbreaks, plant ground-cover crops…'; 'On slopes, lay out trenches, strips or water-catchment pits along contour lines to increase water retention and limit surface runoff and erosion.' (translated from Vietnamese) | National Agricultural Extension Center (NAEC), coffee and pepper drought and salinity leaflet (2026) | `True` |
| `Dak_Lak_Tay_Nguyen` | D1: Robusta coffee with cover crop / grass cover | Kc for coffee with weeds 1.05 / 1.10 / 1.10. | FAO-56, Table 12, p.112 | `True` |
| `Dak_Lak_Tay_Nguyen` | D1: Robusta coffee with cover crop / grass cover | WASI guideline: 'clear weeds 3–4 times/year'; 'On slopes: weed in strips, do not clear-weed the whole area'; at the start of the dry season 'clear weeds around the coffee orchard to prevent fire'; at the end of the rainy season 'mulch the base, add green manure'. (translated from Vietnamese) | WASI, ICM guideline for Robusta coffee in the bearing stage, Decision 26/QĐ-VNLT-KHKH of 04/3/2013 | `True` |

| Crop | Kc source | Salinity source | Heat threshold (°C) | Heat source | Water extra source | verified_params |
|---|---|---|---|---|---|---|
| `rice` | FAO-56 Table 12 p.111 (Kc end range 0.90-0.60, 0.75 chosen) | FAO-56 Table 23 p.179, footnote 6 | `35.0` | Jagadish et al. 2007, J. Exp. Bot. 58(7):1627, abstract: spikelet sterility at >=33.7 °C tissue temperature at anthesis (chamber air setpoint 35 °C; tissue 0.4-1.8 °C below air). | FAO Training Manual 3 (Brouwer & Heibloem 1986), Part II Sec. 4.4: SAT 200 mm + WL 100 mm (land_prep_mm = 300); PERC 4 mm/day for heavy clay (range 4-8 mm/day). Soil type at the Ba Tri point is assumed heavy clay, not verified. | `["kc", "salinity", "heat"]` |
| `soybean` | FAO-56 Table 12 p.111 (Kc ini = Legumes group value 0.4) | FAO-56 Table 23 p.178 | `35.0` | VHD35 (Tmax >= 35 °C) is a climate-index definition (Plants 2026), not a measured damage threshold: low confidence. | N/A (upland crop, null) | `["kc", "salinity"]` |
| `maize` | FAO-56 Table 12 p.111 (Kc ini = Cereals group 0.3; Kc end 0.35 = dry harvest, footnote 11) | FAO-56 Table 23 p.179 | `35.0` | ~35 °C air temperature for tropical maize pollination (Maydica 2016 heat-stress study; Lizaso et al. 2018 cited secondarily). Primary source not read: low confidence. | N/A (upland crop, null) | `["kc", "salinity"]` |
| `rice_shrimp` | TODO: shrimp has no plant Kc; local experts needed | TODO: shrimp has no plant ECe; local experts needed | `35.0` | TODO: source needed | TODO: local experts needed | `[]` |
| `coffee` | FAO-56 Table 12 p.112, Coffee - bare ground cover / - with weeds | N/A (highland region, no salinity) | `null` | No sourced daily-Tmax damage threshold for Coffea canephora. Kath et al. 2020 (Global Change Biology 26:3677) give a growing-season mean optimum (mean Tmax <= 24.1 °C), not a daily threshold, so heat is not scored for coffee. | N/A (upland crop, null) | `["kc"]` |
| `coffee_cover_crop` | FAO-56 Table 12 p.112, Coffee - bare ground cover / - with weeds | N/A (highland region, no salinity) | `null` | No sourced daily-Tmax damage threshold for Coffea canephora. Kath et al. 2020 (Global Change Biology 26:3677) give a growing-season mean optimum (mean Tmax <= 24.1 °C), not a daily threshold, so heat is not scored for coffee. | N/A (upland crop, null) | `["kc"]` |
<!-- END SOURCES -->

---

## 2.10. Validation

Results below were computed by the app on the committed real data (NASA POWER retrieved 2026-11-14; GEE extractions 2026-11-14).

1. **Drought years appear in the water balance on their own.** For Bến Tre, crop year 2015/16 (the 2016 drought and salinity intrusion) is the year with the highest freshwater deficit for current practice (S0) and both upland alternatives (S2, S3), using only NASA POWER weather. Crop year 2019/20 (the 2020 event) does not stand out: that event was driven mainly by low Mekong river flow, which a local rain/evaporation balance cannot see.
2. **Strategy ranking is stable across years.** In every crop year 2015/16–2024/25, S2 (soybean) and S3 (maize) need less supplemental fresh water than S0 (two rice crops).
3. **POWER rainfall agrees with GPM IMERG.** Mean annual rainfall differs by about 1.2% at both sites (Bến Tre 1,752 vs 1,773 mm; Đắk Lắk 1,873 vs 1,895 mm), with a monthly correlation of about 0.89–0.90 (2015-01 to 2025-09). Individual months differ more (e.g. Đắk Lắk Jul–Aug: POWER higher; Nov–Dec: IMERG higher).
4. **SMAP soil moisture tracks the modeled coffee deficit.** Across 2016–2025, the dry-season root-zone anomaly correlates at r ≈ −0.94 with the model's yearly deficit for bare-soil coffee: years the model calls dry are years SMAP measures drier soil. The single driest year differs (SMAP: 2020; model: 2024; both rank high in the other source).
5. **Sowing dates seen from space.** In Bến Tre, the satellite detects Winter–Spring rice sowing a median of about 16 days after the 1 Nov date assumed by the model (6 detections; Summer–Autumn: +8 days, 3 detections; 3 further detections more than 60 days from either date are listed as unmatched and excluded); for 2023 it detects 17 Nov, 5 days before the ~22 Nov date reported for Ba Tri by Báo Nông nghiệp Việt Nam (22/02/2024). Wet-season cloud cover means many seasons, especially Summer–Autumn, are not detected (182 of 506 composites usable).
6. **MODIS NDVI confirms the 2-season cropping schedule in Bến Tre:**
   - Multi-year monthly mean MODIS `MOD13Q1` NDVI (2015–2025, 3×3 km agricultural window at `10.0992, 106.6040` in Ba Tri) exhibits two distinct annual vegetation peaks and two low-NDVI troughs: NDVI peaks in January (`0.735`, Winter–Spring Đông Xuân rice canopy) and July–August (`0.781–0.736`, Summer–Autumn Hè Thu rice canopy), while dropping sharply during March–May (`0.398–0.482`, dry-season harvest/fallow) and September (`0.569`, inter-season harvest/land preparation). This satellite observation independently corroborates the 2-crop schedule (`S0`) and the fallow months `[2, 3, 4, 5, 9, 10]`.
7. **Coffee irrigation practice vs. model deficit.** The FAO-56 deficit is the crop's full water requirement. Vietnamese extension guidance recommends 350–420 L/tree per irrigation every 30–35 days (National Agricultural Extension Center, 2026 leaflet) or 500–520 L/tree every 30–40 days on basalt soils (WASI ICM procedure, Decision 26/QĐ-VNLT-KHKH, 2013). At 1,111 trees/ha this is roughly 130–230 mm per dry season, below the model's 351 mm for bare-soil coffee, because farmers deliberately deficit-irrigate and basalt soils carry over water stored in the rainy season, which the model does not account for. We do not tune parameters to close this gap.

---

## 3. Known Limitations

1. **Spatial Resolution of Meteorology & Solar Radiation:** NASA POWER meteorology variables (MERRA-2) have a $0.5^\circ \times 0.625^\circ$ grid resolution (~55 km), and solar radiation `ALLSKY_SFC_SW_DWN` (CERES) has a $1^\circ \times 1^\circ$ grid resolution, which smooth out local microclimates and topographic gradients in Central Highlands valleys.
2. **No Crop Yield or Economic Modeling:** The engine calculates physical water balance (mm) and threshold-exceedance frequency ($r$), not agronomic yield (tons/ha) or market revenue.
3. **SMAP & In-Situ Salinity Data:** SMAP L4 is used only as an independent cross-check for Đắk Lắk (9 km cell; root zone 0–100 cm); it does not change any strategy number. SMAP L4 Version 8 itself assimilates IMERG V07 precipitation, so the SMAP and IMERG checks are not independent of each other (both are independent of the POWER-driven model). No river/canal salinity time series for Bến Tre is available from a public unauthenticated API; salinity is reported as missing (`available: false`) rather than substituted with synthetic numbers.
4. **Representative Sowing Dates (`season_start`):** The water balance still uses representative dates (`"11-01"` Winter–Spring, `"05-25"` Summer–Autumn). The satellite detections (Section 2.6) are shown next to them, not substituted, because cloud cover leaves many seasons undetected and published MODIS methods have errors of about 9–18 days. Some detections fall on 1 January composites and look like artefacts; the full event list is shown so users can judge.
4b. **Erosion C-factors from another country:** the D1 vs D0 soil-loss reduction uses plot C-factors from Lampung, Indonesia (Afandi et al. 2003, abstract read, `verified: false`). WASI recommends strip weeding rather than full cover on slopes, so the reduction is an upper bound. MODIS NDVI at 250 m mostly sees the coffee canopy, so a satellite C-factor (van der Knijff et al.) cannot separate D0 from D1 and is not used.
5. **Rice Extra Water:** Rice water requirement adds 200 mm soil saturation, 100 mm water layer and 4 mm/day percolation (FAO Training Manual 3, Part II Sec. 4.4). The 4 mm/day value is FAO's figure for heavy clay; the soil type at the Ba Tri point is assumed, not measured (FAO gives 6 mm/day on average and 8 mm/day for sandy soils). This extra water makes up most of the rice deficit and is shown separately as `assumed_extra_mm` in the UI. Effective rainfall uses USDA-SCS, which was developed for upland crops; FAO Training Manual 3 uses a simpler formula (0.8P − 25 for P > 75 mm/month, 0.6P − 10 otherwise). Applying USDA-SCS to flooded rice is a simplification. A Bến Tre water-accounting study (Nguyen Trung Nam, VGU/TU Darmstadt master thesis, 2022–2023, p.29) uses 2 mm/day percolation, citing TCVN 9168:2012; we could not read the standard itself. With 2 mm/day the rice extra water would be 510 mm per 105-day season instead of 720 mm.
6. **Unmodeled Brackish-Water Shrimp Phase (`S1`):** In the rice–shrimp rotation (`S1`), the dry-season shrimp phase (`03-01 → 07-31`, `crop: null`) is not hydrologically modeled (`modeled: false`, `partial: true`) because shrimp ponds require brackish water rather than crop evapotranspiration calculations.
7. **Document-Based Salinity Intrusion Months:** Salinity months for Bến Tre ([2, 3, 4]) come from the National Agricultural Extension Center dry-season handbook 2026–2027, p.50 ('Tập trung cảnh giác từ tháng 2/2027 - 4/2027'). They are document-based, not station measurements.
8. **Two Strategies in Đắk Lắk & Unscored Coffee Heat:** Because Robusta coffee is a long-lived perennial plantation, `Dak_Lak_Tay_Nguyen` compares 2 orchard-floor management strategies (`D0` bare soil vs. `D1` cover crop/grass) rather than annual crop replacement.
9. **Heat Exceedance Counting:** Heat exceedance counts all days in a crop phase with Tmax above the threshold, although damage is concentrated around flowering. Rice 35 °C is checked against Jagadish et al. 2007 (abstract). Maize and soybean 35 °C are low-confidence (see `source.heat` in config/crops.json). Coffee heat is not scored.
10. **Upland Salinity Conversion Assumption:** For upland crops, the salinity threshold is converted from $EC_e$ to water salinity using the FAO-29 assumption $EC_e \approx 1.5 \cdot EC_w$. This assumes a steady-state leaching fraction and has not been field-checked for the Mekong Delta.
11. **Wind Speed Floor & Actual Vapour Pressure Formulation:** The POWER `WS2M` floor is applied at $0.5\text{ m/s}$ (FAO-56 p.63). Actual vapour pressure is computed from daily mean `RH2M` using FAO-56 Eq. 19.
12. **Representative Point NDVI Window:** NDVI comes from a 3×3 km window around one selected farm point, not the whole province.

---

## 4. Data Citations & Acknowledgements

- **NASA POWER:** *"These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program."* (`https://power.larc.nasa.gov/`, accessed 2026-11-14).
- **MODIS MOD13Q1:** Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*. NASA EOSDIS Land Processes DAAC. `doi:10.5067/MODIS/MOD13Q1.061`.
- **ORNL DAAC Subset Web Service:** ORNL DAAC MODIS/VIIRS Land Product Subsets web service (`https://modis.ornl.gov/`, accessed 2026-11-14).
- **MODIS MOD09A1:** Vermote, E. (2021). *MODIS/Terra Surface Reflectance 8-Day L3 Global 500m SIN Grid V061*. NASA EOSDIS Land Processes DAAC. `doi:10.5067/MODIS/MOD09A1.061`.
- **GPM IMERG:** Huffman, G. J., et al. *GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07*. NASA GES DISC. `doi:10.5067/GPM/IMERG/3B-MONTH/07`.
- **SMAP L4:** Reichle, R., et al. *SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data, Version 8* (SPL4SMGP). NASA NSIDC DAAC. `doi:10.5067/T5RUATAQREF8`.
- **SRTM:** NASA JPL (2013). *NASA Shuttle Radar Topography Mission Global 1 arc second* (SRTMGL1 v003). NASA EOSDIS Land Processes DAAC. `doi:10.5067/MEaSUREs/SRTM/SRTMGL1.003`.
- **Google Earth Engine:** Gorelick, N., et al. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. *Remote Sensing of Environment* 202: 18–27. Used only to extract the NASA products above (accessed 2026-11-14).
- **Methods:** Xiao, X., et al. (2005). Mapping paddy rice agriculture in southern China using multi-temporal MODIS images. *Remote Sensing of Environment* 95: 480–492. · Afandi, Manik, T. K., Rosadi, B., Utomo, M., Senge, M., Adachi, T., Oki, Y. (2003). An Evaluation of Coffee Crop Factor under Different Weed Managements Using USLE Method in Hilly Humid Tropical Area of Lampung, South Sumatra, Indonesia. *Journal of the Japanese Society of Soil Physics* 93: 21–33. · Ambio (2021), the 2016 and 2020 Mekong Delta droughts, https://pmc.ncbi.nlm.nih.gov/articles/PMC8800995.
- **OpenStreetMap:** Online map tiles when network connectivity is available, *"© OpenStreetMap contributors"*, licensed under the Open Data Commons Open Database License (ODbL).

---

## 5. Third-Party Libraries & AI Disclosure

### Third-Party Software & Libraries
| Library / Service | Requirement | Tested Version | License | Role |
|---|---|---|---|---|
| Python Standard Library (`http.server`, `unittest`, `json`, `urllib.parse`) | Python 3.11+ | `3.14.0` | PSF License | Local HTTP server, URL parsing, unit test framework |
| `pandas` | $\ge 2.0.0$ | `2.3.3` | BSD-3-Clause | Time-series alignment and monthly/seasonal aggregation |
| `numpy` | $\ge 1.24.0$ | `2.3.5` | BSD-3-Clause | Vectorized FAO-56 Penman-Monteith calculations |
| `requests` | $\ge 2.28.0$ | `2.34.2` | Apache-2.0 | HTTP client for NASA POWER and ORNL DAAC MODIS APIs |
| `pytest` | $\ge 7.0.0$ | `9.2.0` | MIT | Automated unit and regression testing |
| `earthengine-api` | optional, only for `scripts/gee_fetch.py` | `1.7.52` | Apache-2.0 | One-off extraction of MODIS MOD09A1, GPM IMERG, SMAP L4 and SRTM |
| Leaflet | `1.9.4` (vendored offline) | `1.9.4` | BSD-2-Clause | Interactive map rendering (`L.circleMarker`) |
| Chart.js | `4.4.1` (vendored offline) | `4.4.1` | MIT | Monthly rainfall, $ET_o$, and MODIS NDVI visualization |
| OpenStreetMap Tiles | Online when reachable | N/A | ODbL (`© OpenStreetMap contributors`) | Optional background basemap tiles |

### AI & Tooling Disclosure
The problem framing, choice of pilot sites, strategies and the research plan behind each analysis were made by the team. AI coding assistants were used to write and review code and documentation under the team's direction: Google Antigravity (Gemini) for the initial scaffold, and Anthropic Claude (Claude Code) for the year-to-year analysis, the satellite sowing-date detection, the IMERG/SMAP/SRTM cross-checks, the English translation of the interface and documentation, and code review. All numbers shown in the app come from NASA data processed by the code in `core/` or from cited sources in `config/*.json`; no AI-generated data, images or video are used.

---

## 6. License

This project is licensed under the **Apache License, Version 2.0**. See the [LICENSE](../LICENSE) file for the full license text.
