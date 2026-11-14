# AERO-AGRI: Climate-Adaptive Crop Rotation Decision Support from NASA Data
*2026 NASA International Space Apps Challenge — Challenge: Field Shift: Adapting Farms with NASA Data*

> Vietnamese version: [README.vi.md](README.vi.md)

---

## 1. What it is
**AERO-AGRI** is a decision-support tool for whole-year crop rotation and crop transition. It combines NASA Earth observation data (NASA POWER, MODIS `MOD13Q1`) with standard agronomic water-balance methods (**FAO-56 Penman-Monteith** and **USDA-SCS** / FAO Training Manual 3 effective rainfall) for two pilot sites in Vietnam:

- **Bến Tre (Mekong Delta):** compares 4 whole-year rotation strategies: `S0` two rice crops (current practice), `S1` rice–shrimp, `S2` Summer–Autumn rice + soybean instead of Winter–Spring rice, `S3` Summer–Autumn rice + maize instead of Winter–Spring rice. A detailed table also compares single crops in the Winter–Spring window starting `11-01` (`rice`, `soybean`, `maize`, `rice_shrimp`).
- **Đắk Lắk (Central Highlands):** compares 2 ground-management strategies for perennial Robusta coffee in the dry season: `D0` coffee on bare soil (current practice) vs `D1` coffee with a cover crop / grass cover (`coffee`, `coffee_cover_crop`).

For each strategy the app shows the supplemental fresh water (irrigation need) for a typical year and for a dry year (1 in 5), each year 2015–2025, bare-soil months, a 12-month crop calendar against the salinity months, and cited evidence, benefits, information gaps and risks. It does not merge strategies into a single weighted score.

### Key findings (computed by the app from NASA data, 2015–2025)
- **Bến Tre:** replacing Winter–Spring rice with soybean or maize cuts supplemental fresh water by about 41% (≈ 15,300 → 9,000 m³/ha per year), and the ranking holds in **every** year 2015/16–2024/25. The 2016 drought year (crop year 2015/16) comes out as the driest year from NASA POWER weather alone.
- **Sowing dates seen from space:** MODIS EVI/LSWI flooding signals show Winter–Spring rice sown about 16 days later than the 1 Nov date usually assumed (median of 6 detected seasons); for 2023 the satellite date (17 Nov) is 5 days from the date reported in the local press (~22 Nov).
- **Independent checks:** NASA POWER rainfall matches GPM IMERG within about 1% per year at both sites; in Đắk Lắk, SMAP root-zone soil moisture in the dry season tracks the modeled coffee water deficit year by year (r ≈ −0.94).
- **Đắk Lắk:** a cover crop raises dry-season water need (FAO-56, upper bound) but published plot C-factors suggest up to about 87% less soil loss than bare inter-rows on a site where SRTM gives a median slope of 5° and IMERG puts 78% of the rain in May–October.

## 2. The problem
- **Bến Tre:** in the dry season, salt water intrudes up the rivers and canals. The National Agricultural Extension Center (NAEC) dry-season handbook for 2026–2027 flags February–April as the salinity months and advises coastal farmers to finish sowing Winter–Spring rice in October–November so it is harvested before the salinity peak. Farmers need to know which rotation needs the least fresh water and keeps the land productive in the dry season instead of leaving it bare.
- **Đắk Lắk:** Robusta coffee is irrigated through the dry season (January–April), which puts pressure on local water sources such as groundwater. Extension services recommend cover crops against erosion, but FAO-56 suggests a live grass cover raises crop water use. The tool makes this trade-off visible.

## 3. NASA data used
| Product | Variables | Resolution | Use in the app |
|---|---|---|---|
| **NASA POWER** daily API (`community=AG`) | `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`, `PRECTOTCORR` | grid cell of about 0.5° × 0.625° (roughly 50 km), daily, 2015–2025 | Daily FAO-56 ETo, effective rainfall, crop water deficit, heat-exceedance days |
| **NASA MODIS Terra `MOD13Q1` v061** via the ORNL DAAC REST API | `250m_16_days_NDVI`, `250m_16_days_pixel_reliability` | 250 m, 16-day composites; median of a 3×3 km window (81 pixels) | Observed crop calendar (NDVI) shown next to the modeled calendar |
| **NASA MODIS Terra `MOD09A1` v061** (via Google Earth Engine) | surface reflectance bands 1, 2, 3, 6 + `StateQA` → EVI, LSWI | 500 m, 8-day | Rice sowing dates from the flooding signal `LSWI + 0.05 ≥ EVI` |
| **NASA GPM IMERG Final** monthly V07 (via GEE) | `precipitation` | 0.1°, monthly | Cross-check of POWER rainfall; wet-season rain share |
| **NASA SMAP L4** `SPL4SMGP` v8 (via GEE) | `sm_rootzone` | 9 km, 3-hourly → monthly | Cross-check of the modeled coffee water deficit (Đắk Lắk) |
| **NASA SRTM** v3 `SRTMGL1` (via GEE) | elevation → slope | 30 m | Slope of the coffee site (erosion context) |

Cloud filtering keeps only pixels with reliability `0` (good) or `1` (marginal), drops fill values (`-3000`) and values outside [-0.2, 1.0], and drops any date with fewer than 20 valid pixels.

Full product table, equations, citations and limitations: [`docs/SUBMISSION_NOTES.md`](docs/SUBMISSION_NOTES.md).

## 4. Method
1. **Reference evapotranspiration ETo (FAO-56 Penman-Monteith, Eq. 6)** computed daily from NASA POWER. The Rs/Rso ratio is capped at `1.0` before net longwave radiation (Eq. 39); wind speed at 2 m is floored at `u2 = max(u2, 0.5 m/s)` per FAO-56 Ch. 3, p. 63.
2. **Crop water need** `ETc = Kc × ETo`, with Kc from FAO-56 Table 12 interpolated across growth stages. Annual crops follow a configurable `season_start` (cross-year seasons supported); coffee uses a fixed mid-season Kc over the dry-season months 1–4 (bare soil `0.95`, with grass cover `1.10`).
3. **Extra water for flooded rice** (FAO Training Manual 3, Brouwer & Heibloem 1986, Part II §4.4): land preparation 300 mm (soil saturation 200 mm + standing water 100 mm) plus percolation 4 mm/day for heavy clay (assumed soil type, not yet verified); 2 mm/day is shown as a low-percolation sensitivity bound.
4. **Effective rainfall:** FAO TM3 for rice (`Pe = 0.8P − 25` when P > 75 mm/month; `Pe = 0.6P − 10` when P < 75 mm/month), USDA-SCS for upland crops and coffee, prorated for partial months.
5. **Water deficit (supplemental fresh water)** is summed month by month: a wet month does not offset a dry month because soil water storage is not modeled yet. 1 mm = 10 m³/ha.
6. **Relative `score` vs absolute `risk_level`:** the crop table keeps a relative comparison score (0–100) separate from an absolute risk level computed only from the share of season days above heat/salinity thresholds (`LOW < 0.10`, `MODERATE < 0.25`, `SEVERE < 0.50`, otherwise `CRITICAL`). Missing components give `INSUFFICIENT_DATA`, never a guess.
7. **Salinity thresholds** from FAO-56 Table 23 are converted to water salinity (‰) according to each crop's `salinity_basis`.

Every parameter and every piece of evidence lives in `config/*.json` with its source and a `verified` flag. The advisory report is assembled deterministically from the same computed numbers (no AI-generated text).

## 5. How to run
```bash
pip install -r requirements.txt
python run.py
```
`run.py` checks the data, starts the server and opens http://127.0.0.1:8050.

Real NASA data CSVs are included in `data/raw/` (provenance in `data/manifest.json`), so the app works offline out of the box. To re-download them:
- NASA POWER: `python core/power_fetch.py`
- MODIS NDVI: `python core/ndvi_fetch.py`
- MODIS MOD09A1, GPM IMERG, SMAP L4, SRTM (needs a Google Earth Engine account; the app itself does not): `pip install earthengine-api`, `earthengine authenticate`, then `python scripts/gee_fetch.py --project <your-cloud-project>`
- Data status table: `python scripts/check_data.py`
- Offline synthetic demo data (flagged `is_synthetic: true`, only for testing): `python scripts/make_demo_data.py`

The data directory can be overridden with the `AERO_DATA_DIR` environment variable.

## 6. Tests
```bash
python -m pytest -q
```
75 unit and regression tests at the time of writing (FAO-56 worked examples, water balance, year-to-year P50/P80, satellite sowing detection, IMERG/SMAP cross-checks, erosion comparison, scoring, rotation strategies, REST API, web invariants). Tests run in temporary directories and never write to `data/raw/`.

## 7. Project structure
```text
SpaceMarine/
├── README.md / README.vi.md      # This page (English) / Vietnamese version
├── DESIGN.md                     # UI design system spec (read before editing web/)
├── LICENSE                       # Apache License 2.0
├── docs/SUBMISSION_NOTES.md      # Technical submission notes: NASA products, equations, citations, limitations
├── config/
│   ├── regions.json              # Region coordinates, ndvi_point, season_start, candidate crops
│   ├── crops.json                # Stage Kc, salinity thresholds + salinity_basis, heat thresholds, sources
│   ├── rotations.json            # Whole-year rotation strategies with evidence, benefits, information gaps, risks
│   ├── scoring.json              # Weights, absolute risk thresholds, u2 lower bound
│   ├── phenology.json            # Rice sowing-date detection parameters (with sources) and ground check
│   └── erosion.json              # Coffee C-factors (with source) for the D0 vs D1 soil-loss comparison
├── core/
│   ├── loaders.py                # CSV schema validation, manifest.json, AERO_DATA_DIR
│   ├── power_fetch.py            # NASA POWER daily API downloader
│   ├── ndvi_fetch.py             # MODIS MOD13Q1 v061 downloader (ORNL DAAC, cloud-filtered 3×3 km median)
│   ├── eto.py                    # FAO-56 Penman-Monteith ETo
│   ├── water_balance.py          # Season windows, Kc interpolation, effective rainfall, deficit
│   ├── rotation.py               # Whole-year rotation evaluation, 12-month calendar, observed NDVI
│   ├── scoring.py                # Relative score (0–100) and absolute risk level
│   ├── phenology.py              # Rice sowing dates from MODIS EVI/LSWI
│   ├── validation.py             # POWER vs IMERG rainfall, SMAP soil-moisture cross-check
│   ├── erosion.py                # Relative soil loss, bare vs cover-cropped coffee
│   └── advisor.py                # Deterministic 3-section advisory report
├── data/manifest.json, data/raw/ # Data provenance and CSVs
├── scripts/                      # gee_fetch.py, check_data.py, make_demo_data.py, gen_sources_table.py
├── server.py                     # HTTP server and REST API (/api/status, /api/regions, /api/climate, /api/evaluate, /api/rotations, /api/advise)
├── run.py                        # One-command launcher
├── tests/                        # test_core.py and fixtures
└── web/                          # index.html, style.css, app.js; Leaflet 1.9.4 and Chart.js 4.4.1 vendored (no CDN)
```

## 8. Limitations
- NASA POWER values are grid-cell averages (about 0.5° × 0.625°, roughly 50 km), not field measurements.
- There is no station salinity data yet: salinity months come from published documents, not measurements.
- The shrimp phase of `S1` is not modeled (water and risk); `S1` figures cover the rice phase only and are marked as partial.
- Soil type at Ba Tri (heavy clay, percolation 4 mm/day) is assumed, not verified; the 2 mm/day bound shows the sensitivity.
- Soil water storage is not modeled, so monthly deficits are summed without carry-over.
- The water balance uses representative sowing dates (Summer–Autumn rice 25 May, Winter–Spring rice 1 Nov). Satellite-detected dates are shown next to them, not substituted: wet-season clouds leave many seasons undetected.
- The soil-loss comparison uses C-factors measured in Indonesia (not yet verified for Đắk Lắk) and gives a relative reduction only, as an upper bound.
- No sourced daily heat threshold exists for Robusta coffee, so heat risk is not scored for coffee. The FAO-56 "with weeds" Kc assumes full grass cover, so `D1` figures are an upper bound.
- FAO-56 water need for coffee is the full crop requirement; Vietnamese irrigation guidelines apply less water (deliberate deficit irrigation, basalt soil storage not modeled).
- Yield, cost, labour and market price are not modeled. The tool supports, but does not replace, local extension officers and farmer experience.

## 9. AI disclosure
AI coding assistants (Google Antigravity/Gemini; Anthropic Claude Code) were used under the team's direction to write and review parts of the code and documentation, including the English translation of this repository. The problem framing, sites, strategies and research plan are the team's. See [`docs/SUBMISSION_NOTES.md`](docs/SUBMISSION_NOTES.md) §5 for details. All numbers and citations shown by the app come from `config/*.json` (with sources and `verified` flags) or are computed by `core/`.

## 10. License
Apache License 2.0 — see [`LICENSE`](LICENSE).
