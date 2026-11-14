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

AERO-AGRI is a science tool that helps Vietnamese farmers and agricultural extension officers decide on crop-calendar shifts ("Field Shift") using NASA data (POWER, MODIS, GPM IMERG, SMAP, SRTM; 2015–2025) and the FAO-56 physical model.

The style is **Swiss Editorial & Modern Data Product**:
- **Restrained, precise, respectful of data**: the interface reads like an in-depth climate brief (*NYT Climate*, *Apple Weather*, *Linear*). It is not entertainment; it supports livelihood decisions season by season.
- **Field-First & Space-Backed**: every number traces back to satellite records and field evidence. No black boxes, no AI-generated numbers.
- **Farmer-first**: plain words (water to pump, months with bare soil, salt water months), one answer sentence first, detail one tap away; every number stays traceable to its source.
- **Anti-Slop Discipline**: no loud gradient backgrounds, thick `4px` borders, heavy shadows, pill-badge soup or nested boxes.
- **English UI by default**: everything judges see is in English (hackathon rule); a VI toggle serves Vietnamese farmers (see §5G). Place names keep their Vietnamese spelling (Bến Tre, Đắk Lắk). Numbers use en-US formatting (`15,329`, `1.5`); months use `Jan`…`Dec` (or initials `J F M …` where space is tight).

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

The page is **farmer-first with progressive disclosure**: the answer and the option cards come first, every number has its source one tap away, and the expert material (charts, method, tables) sits in one collapsed section at the end. Four steps, each answering one Field Shift question:

| Step | Section id | Question it answers |
|------|------------|---------------------|
| 1 Your field today | `#step1` | How much fresh water does my field need now, what is the best saving, when is the salt water / slope risk? |
| 2 Compare options | `#rotationsSection` | Which rotation needs less water, leaves fewer bare-soil months, avoids salt water months? |
| 3 What satellites tell us | `#evidenceSection` | Do independent NASA data (MODIS, IMERG, SMAP, SRTM) agree with the model? |
| 4 Plan & report | `#reportSection` | Take a printable report or CSV to the extension officer; experts open "data & method". |

### A. Top bar (`.topbar`) and step nav (`#stepNav`)
- Top bar `56px`, translucent white with `backdrop-filter: blur(10px)`: logo, region segmented control (`Bến Tre (Mekong Delta)` | `Đắk Lắk (Central Highlands)`), `EN | VI` toggle (`#langToggle`), `Report` link.
- Sticky step nav below it: 4 pills; the active pill follows the scroll position. On phones the top bar scrolls away and only the active pill shows its label.

### B. Step 1: answer card (`#heroCard`) and weather chips (`.scenario`)
- `#heroTitle` is **one plain sentence built only from API numbers**: best non-partial option vs current practice, with the per-year check (`annual_deficit_by_year`): "in every year since 2015" only when it holds in all matched crop years, otherwise "in N of M years". When no option saves water (Đắk Lắk), the sentence says so and adds the erosion result when available.
- Three tiles separated by hairlines (no boxes): water to pump today (m³/ha and per 1,000 m²), best saving % (or extra water), salt water months (Bến Tre) or SRTM slope + IMERG wet-season share (Đắk Lắk).
- Weather: 3 large chips (`Today`, `Hot & dry`, `Very hot & dry`, 44 px); the two sliders sit under an `Adjust` disclosure, with a value bubble above the thumb. Inline status text ("Updating…"), never toasts.

### C. Step 2: option card (`.rot-card`), one set only
- Collapsed: single badge (above the title), big number m³/ha with the per-1,000 m² figure, bare-soil months, a relative bar against current practice (tick = current practice), typical vs dry-year line, 12-month calendar (red underline = salt water month, orange dot = heat), top 1 benefit + top 1 risk, `Details` button.
- `Details` expands with an animated height (`grid-template-rows 0fr → 1fr`) to: year strip (one bar per crop year, stress years in salinity red with event + source, `not yet verified` when unverified), lower-percolation range, per-1,000 m² breakdown (`plainLine`), config note, erosion block for `D1`, all benefits / risks / info gaps, sources, water-balance arithmetic, `View report for this strategy →`.

### D. Step 3: evidence tiles (`.ev-tile`)
- One takeaway line each + `See data` disclosure (same animation): `#sowingCheck` (MODIS MOD09A1 sowing dates, Bến Tre; years with fewer detections than expected are always stated, with the cloud explanation), `#rainCheck` (GPM IMERG vs NASA POWER, both regions), `#smapCard` (SMAP L4 dry-season anomaly vs modeled deficit, Đắk Lắk; the driest-year disagreement stated plainly), `#erosionCheck` (RUSLE C-factor + SRTM slope + IMERG wet-season share, Đắk Lắk, `not yet verified`). Tiles hide when the API says `available: false`.

### E. Step 4: report and expert section
- `#btnReport` (big primary), `#btnPrint`, `#btnCsv`; output in `#chatOutput`. Phones get a sticky bottom `Build report` bar.
- `<details id="techSection">` "For experts: data & method": data chips (`chip-*`), `#climateChart` (POWER and IMERG bars + ETo line), NDVI strip with the model calendar above it, `#methodCard`, crop table, assumptions. Links into it (e.g. `#methodCard`) open it first.

### F. Motion and interaction (subtle, purposeful)
- Number count-up on region / scenario change, static skeleton placeholders while loading, fade/slide-in of cards the first time a step scrolls into view, animated expand/collapse, slider value bubble, 1 px hover lift + border colour change (no heavy shadow), visible `:focus-visible` rings, 44 px touch targets.
- Everything respects `prefers-reduced-motion: reduce` (no transitions, no count-up, no smooth scroll).

### G. Language (EN | VI)
- Default English. Static text lives in `index.html` with `data-i18n` keys (English captured at start-up); `I18N.vi` replaces it. Dynamic text uses `t(key)` with `I18N = { en, vi }`. The choice persists in `localStorage` (wrapped in try/catch) and sets `<html lang>`. Numbers use `en-US` / `vi-VN`; months `Jan…Dec` / `T1…T12`.
- Config text in Vietnamese comes from the API `vi` blocks (strategy `vi.name/why/note/benefits/risks/info_gaps/evidence_text`, phase `label_vi`, region `vi.assumptions/salinity_months_source/ndvi_years_source`, stress year `event_vi`), with English fallback. Citations stay as published. The advisory report is English for now; in VI the page says "Báo cáo hiện có bằng tiếng Anh".

---

## 6. Required DOM IDs & Invariant Strings (Test Invariants)

These IDs and strings are UI conventions. Pytest does not parse index.html for most IDs; test_fix8_1 greps banned strings in web/app.js, web/index.html and core/advisor.py, test_fix11_2 / test_fix13_1 check the step anchors, role entries and method card, test_fix14_1 checks the satellite cross-check IDs and API fields, and test_fix15_1 checks the EN | VI toggle and the I18N dictionary. Do not keep wording only because you think a test locks it.

### 36 required DOM IDs in `web/index.html` (26 core + 10 added by the cross-checks and the redesign):
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

Satellite cross-checks and redesign:
27. sowingCheck   28. rainCheck   29. smapCard   30. erosionCheck   31. chip-imerg
32. chip-srtm     33. chip-mod09  34. evidenceSection   35. stepNav   36. langToggle
```
Also kept as anchors: `step1`, `reportSection`, `techSection`, `methodCard`, `btnCsv`, `btnPrint`, `btnReport`, `ndviModelRow`.

### Required text strings in `web/app.js` (English dictionary):
- `"11-01"` (Bến Tre dry-season sowing window).
- `"04-30"` (end of the Đắk Lắk dry season).
- `"shrimp phase not modeled"` (shown when a strategy has `partial: true`, the brackish-water shrimp phase).
- `"assumed soil type"` (percolation and rice land-preparation assumption).
- `"not yet verified"` (evidence with `verified: false`).

Behaviour in `app.js` is driven by structured API fields (`is_existing`, `partial`, `phases[].modeled`, `water_full_year`, `salinity_months`, `stress_years[].verified`, `components.salinity_exceed`, `available`), never by substring-matching config text, because config text exists in two languages.

---

## 7. References
- Source spec: [`docs/design-md-spec/spec.md`](docs/design-md-spec/spec.md) (Google Labs `design.md` alpha format).
- Source philosophy: [`docs/design-md-spec/PHILOSOPHY.md`](docs/design-md-spec/PHILOSOPHY.md).
