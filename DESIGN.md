---
version: alpha
name: AERO-AGRI Swiss Editorial Agro-Climate
description: Minimalist, data-dense, anti-slop design system for NASA Space Apps agro-climate decision platform.
colors:
  bg: "#f7f7f5"
  surface: "#ffffff"
  surface-subtle: "#f9f9f8"
  border: "#e4e4df"
  border-focus: "#15803d"
  text: "#191c1a"
  muted: "#5e6560"
  muted-light: "#878f89"

  primary: "#15803d"
  primary-hover: "#166534"
  primary-light: "#f0fdf4"

  good: "#15803d"
  good-bg: "#f0fdf4"
  good-border: "#bbf7d0"

  warn: "#b45309"
  warn-bg: "#fffbeb"
  warn-border: "#fef3c7"

  bad: "#b91c1c"
  bad-bg: "#fef2f2"

  sal: "#be123c"
  sal-bg: "#fff1f2"
  heat: "#d97706"

  crop-rice: "#15803d"
  crop-shrimp: "#0284c7"
  crop-soybean: "#b45309"
  crop-maize: "#c2410c"
  crop-coffee: "#78350f"
  crop-cover: "#16a34a"
  crop-bare: "#e5e7eb"

typography:
  fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
  monoFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  title-page:
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.25
  title-section:
    fontSize: 18px
    fontWeight: 800
    letterSpacing: -0.3px
  title-card:
    fontSize: 15.5px
    fontWeight: 700
  metric-large:
    fontSize: 20px
    fontWeight: 800
    fontVariantNumeric: tabular-nums
  body-md:
    fontSize: 14.5px
    lineHeight: 1.55
  body-sm:
    fontSize: 13px
    lineHeight: 1.45
  caption:
    fontSize: 11.5px
    lineHeight: 1.4

rounded:
  xs: 3px
  sm: 4px
  md: 6px
  lg: 10px
  pill: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 20px
  xl: 32px

components:
  topbar:
    height: 56px
    background: "rgba(255, 255, 255, 0.92)"
    backdropFilter: "blur(10px)"
    borderBottom: "1px solid {colors.border}"
  rot-card:
    background: "{colors.surface}"
    border: "1px solid {colors.border}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.md}"
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
  ai-copilot:
    background: "{colors.surface}"
    border: "1px solid {colors.border}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.lg}"
---

# AERO-AGRI DESIGN SYSTEM (`DESIGN.md`)

> Visual design system written in the **`google-labs-code/design.md`** format.  
> Every AI coding agent, developer and designer working in this repository **must read and follow the rules below** before making any change to `web/`.

---

## 1. Design Philosophy

AERO-AGRI is a science tool that helps Vietnamese farmers and agricultural extension officers decide on crop-calendar shifts ("Field Shift") using NASA satellite data (POWER & MODIS 2015–2025) and the FAO-56 physical model.

The style is **Swiss Editorial & Modern Data Product**:
- **Restrained, precise, respectful of data**: the interface reads like an in-depth climate brief (*NYT Climate*, *Apple Weather*, *Linear*). It is not entertainment; it supports livelihood decisions season by season.
- **Field-First & Space-Backed**: every number traces back to satellite records and field evidence. No black boxes, no AI-generated numbers.
- **Anti-Slop Discipline**: no loud gradient backgrounds, thick `4px` borders, heavy shadows, pill-badge soup or nested boxes.
- **English UI**: everything judges see is in English (hackathon rule). Place names keep their Vietnamese spelling (Bến Tre, Đắk Lắk). Numbers use en-US formatting (`15,329`, `1.5`); months use `Jan`…`Dec` (or initials `J F M …` where space is tight).

---

## 2. Anti-"AI Slop" Rules (Negative Constraints & Don'ts)

When editing `web/style.css`, `web/index.html` or `web/app.js`:

- ❌ **NO decorative gradients**: no `linear-gradient` on card, button or callout backgrounds. The only exception is the `45deg` diagonal stripe pattern for the brackish-water shrimp phase on the calendar bar.
- ❌ **NO thick left borders (`border-left: 4px solid`)**: never use a thick border for emphasis. All separators are thin `1px solid var(--border)` (or `1.5px solid var(--primary)` for the best-recommended card).
- ❌ **NO heavy shadows**: no thick or opaque `box-shadow`. Only the ultra-light `0 1px 2px rgba(0,0,0,0.02)`.
- ❌ **NO "Pill Soup"**: each strategy card has **at most 1 status badge** in the top corner (`Current`, `Saves 52% water`, `Shrimp phase not modeled`). Never stack 4–5 green/red pills.
- ❌ **NO pulsing dots (`@keyframes pulse`) or decorative icons/emoji**: no blinking effects that distract.
- ❌ **NO Box-in-Box**: do not create 3–4 bordered, separately filled boxes inside one card. Use a thin horizontal rule `1px solid #f1f5f9` to separate content.
- ❌ **NO more than 500 CSS lines**: keep `web/style.css` under **500 lines** of clean, focused CSS.
- ❌ **NO external CDN libraries**: the app must be 100% offline-first. No Google Fonts, Tailwind CDN or FontAwesome CDN. Chart.js and Leaflet are vendored in `web/vendor/`.

---

## 3. Colour Tokens & Semantics (Semantic Palette)

```yaml
colors:
  bg: '#f7f7f5' # warm limestone paper background, softer than pure white
  surface: '#ffffff' # white card surface
  surface-subtle: '#f9f9f8' # very light secondary background for code, inputs
  border: '#e4e4df' # hairline border
  text: '#191c1a' # dark ink for reading text
  muted: '#5e6560' # grey for secondary labels and captions
  primary: '#15803d' # deep agricultural green (Emerald Deep)
```

### Season & crop colours:
- **Rice (`rice`)**: `#15803d` — traditional rice green.
- **Tiger shrimp, brackish water (`shrimp`)**: `#0284c7` with the diagonal stripe `repeating-linear-gradient(45deg, #0284c7, #0284c7 4px, #0369a1 4px, #0369a1 8px)`.
- **Soybean (`soybean`)**: `#b45309` — legume amber.
- **Maize (`maize`)**: `#c2410c` — biomass orange.
- **Robusta coffee (`coffee`)**: `#78350f` — Central Highlands basalt brown.
- **Cover crop (`cover_crop`)**: `#16a34a` — WASI trial green.
- **Bare soil (`bare`)**: `#e5e7eb` — light grey for fallow soil.
- **Salinity intrusion (`sal`)**: text `#be123c`, thin red line on the calendar; also marks documented stress years in the year-to-year strip.
- **Heat above threshold (`heat`)**: orange dot `#d97706`.

---

## 4. Typography & Hydrology Number Discipline

```yaml
typography:
  fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
  metrics:
    fontVariantNumeric: tabular-nums
```

- **Mandatory tabular nums**: every measured value (`m³/ha`, `mm`, `ETo`, `ETc`, `NDVI`, temperature, rainfall, crop table) **MUST** use `font-variant-numeric: tabular-nums`. This keeps the layout from jittering when users drag the weather-scenario sliders.
- **Modest type scale**: page title `20px`, card title `15.5px`, large metrics `19px–22px`. No oversized fonts that waste space.

---

## 5. Component Specifications

### A. Compact Sticky Header (`.topbar`)
- Fixed height `56px`, translucent white with `backdrop-filter: blur(10px)`.
- `AERO-AGRI` logo with a small `NASA Space Apps` tag.
- Region switch as a **Segmented Control** (`Bến Tre (Mekong Delta)` | `Đắk Lắk (Central Highlands)`).
- Quick link to the `Advisory report` on the right.

### B. Compact Simulator (`.scenario`)
- Sits in the intro row next to `#heroCard`.
- 3 one-tap scenario presets (`Today`, `Hot & dry`, `Very hot & dry`).
- 2 smooth sliders for Temperature and Rainfall, with clear `+X °C` and `+Y%` labels.

### C. Spec-Sheet Rotation Strategy Card (`.rot-card`)
- Laid out in a horizontal grid (`strategy-grid-horizontal`): 4 columns for Bến Tre, 2 symmetric columns for Đắk Lắk.
- Each card has 5 layers:
  1. **Header**: strategy name + a single status badge.
  2. **Short description**: 1–2 lines with the reason (`why`).
  3. **2 large metrics side by side**: supplemental fresh water (`m³/ha`, mean of crop years, with scenario delta) and bare-soil months (`months/year`). Below them, inside the same metrics row (no extra box): a compact year-to-year line `Typical year … · Dry year (1 in 5) … m³/ha` (median and 80th percentile) and a tiny bar strip, one bar per crop year, with documented stress years in salinity red and a tooltip giving the event and source (`not yet verified` when unverified).
  4. **12-month Gantt bar**: continuous, `24px–26px` tall, red underline on salinity months, orange heat dot inside.
  5. **Science note & actions**: WASI trial note (`D1`) or salinity-aligned note (`S1`) from config; 2–3 short bullets; footer `<details>` with sources and the button **`View report for this strategy →`**.

### E. Satellite Cross-Checks (shown next to the model, never inside the water formula)
- `#sowingCheck` (Step 1, Bến Tre): "Sowing dates seen from space (MODIS)": one line per rice season (median offset from the model date, number of detected seasons), the ground-truth check, seasons detected per year (years below the expected count in warn colour) with a plain sentence that clouds hide many images, the expected error, and a `<details>` with every detection, method, assumptions and sources.
- `D1` card (Đắk Lắk): one plain line "Soil loss about N% lower than bare inter-rows (C-factor, plot study in Indonesia; not yet verified)" plus one site-context line (SRTM slope, IMERG wet-season rain share). Caveats and sources go into the card's existing `Sources & calculation` details; no extra box or badge.
- Step 4: GPM IMERG as a second rain series in `#climateChart` with `#rainCheck` (annual totals, monthly correlation); `#smapCard` (Đắk Lắk) with the per-year SMAP L4 anomaly next to the modeled deficit, the correlation sentence and the driest-year disagreement stated plainly.
- Status chips `chip-imerg`, `chip-sm` (SMAP L4), `chip-srtm`, `chip-mod09` show "not used here" with the API `reason` as tooltip when unavailable.

### D. Advisory Report (`#reportSection`)
- Built deterministically from the same numbers shown on the page (no AI-generated text).
- A context line shows the region, weather scenario and selected strategy.
- `Build report for the whole region` and `Print report` buttons; output goes to `#chatOutput`.

---

## 6. The 32 Required DOM IDs & Invariant Strings (Test Invariants)

These IDs and strings are UI conventions. Pytest does not parse index.html for most IDs; test_fix8_1 greps banned strings in web/app.js, web/index.html and core/advisor.py, test_fix11_2 / test_fix13_1 check the English step labels, role entries and method card, and test_fix14_1 checks the satellite cross-check IDs and API fields. Do not keep wording only because you think a test locks it.

### 32 required DOM IDs in `web/index.html` (26 core + 6 satellite cross-checks):
```text
1. rotationsSection         10. sliderRain             19. chip-sal
2. rotationCardsGrid        11. valTemp                20. climateChart
3. rotationLegend           12. valRain                21. ndviStrip
4. rotationAssumptionsBox   13. btnReset               22. ndviNote
5. heroCard                 14. chatOutput             23. cropTableWrapper
6. heroPlace                15. statusBar              24. cropTableBody
7. heroTitle                16. chip-power             25. waterOnlyScoreNote
8. heroBody                 17. chip-ndvi              26. evaluateEmpty
9. sliderTemp               18. chip-sm (SMAP L4)

Satellite cross-checks:
27. sowingCheck   28. rainCheck   29. smapCard   30. chip-imerg   31. chip-srtm   32. chip-mod09
```

### Required text strings in `web/app.js`:
- `"11-01"` (Bến Tre dry-season sowing window).
- `"04-30"` (end of the Đắk Lắk dry season).
- `"shrimp phase not modeled"` (shown when a strategy has `partial: true`, the brackish-water shrimp phase).
- `"assumed soil type"` (percolation and rice land-preparation assumption).
- `"not yet verified"` (evidence with `verified: false`).

Behaviour in `app.js` is driven by structured API fields (`is_existing`, `partial`, `phases[].modeled`, `water_full_year`, `salinity_months`, `stress_years[].verified`, `components.salinity_exceed`), never by substring-matching config text, because config text is translated.

---

## 7. References
- Source spec: [`docs/design-md-spec/spec.md`](docs/design-md-spec/spec.md) (Google Labs `design.md` alpha format).
- Source philosophy: [`docs/design-md-spec/PHILOSOPHY.md`](docs/design-md-spec/PHILOSOPHY.md).
