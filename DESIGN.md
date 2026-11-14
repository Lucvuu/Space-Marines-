---
version: alpha
name: AERO-AGRI Swiss Editorial Agro-Climate
description: Minimalist, data-dense, anti-slop design system for NASA Space Apps agro-climate decision platform.
colors:
  bg: "#f7f5ee"
  surface: "#fffefb"
  surface-subtle: "#f3f1e9"
  border: "#e5e1d5"
  border-focus: "#15803d"
  text: "#14261b"
  muted: "#5e6560"
  muted-light: "#878f89"

  primary: "#15803d"
  primary-hover: "#166534"
  primary-ink: "#14532d"
  mark: "#fcd977"
  primary-light: "#e4f2dc"

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
- ❌ **NO pulsing dots (`@keyframes pulse`) or emoji**: no blinking effects that distract. Line icons come only from the inline SVG sprite in `index.html` (`<use href="#i-…">`) and only where they help find or read something: menu items, step headers, tile labels, weather presets, action buttons. No decorative imagery or AI-generated photos.
- ❌ **NO Box-in-Box**: do not create 3–4 bordered, separately filled boxes inside one card. Use a thin horizontal rule `1px solid #f1f5f9` to separate content.
- ❌ **NO more than 500 CSS lines**: keep `web/style.css` under **500 lines** of clean, focused CSS.
- ❌ **NO external CDN libraries**: the app must be 100% offline-first. No Google Fonts, Tailwind CDN or FontAwesome CDN. Chart.js and Leaflet are vendored in `web/vendor/`.

---

## 3. Colour Tokens & Semantics (Semantic Palette)

```yaml
colors:
  bg: '#f7f5ee' # warm cream paper background
  surface: '#fffefb' # card surface
  surface-subtle: '#f9f9f8' # very light secondary background for code, inputs
  border: '#e5e1d5' # hairline border
  text: '#14261b' # dark green ink for reading text
  muted: '#5e6560' # grey for secondary labels and captions
  primary: '#15803d' # agricultural green (links, focus, best-option border)
  primary-ink: '#14532d' # dark green: active menu item, buttons, step icons
  primary-light: '#e4f2dc' # light green: answer panel, Details buttons
  mark: '#fcd977' # yellow marker for key phrases and step number dots
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
- **Type scale**: intro `h1` `30px`, step title `26px`, answer sentence `26px`, card title `19px`, large metrics `34px`, body `15px` (smaller on phones). System fonts only.

---

## 5. Component Specifications

The app is **farmer-first with progressive disclosure** and shows **one screen per step**: a fixed side menu (bottom tab bar on phones) switches between the four steps, so there is no long scrolling page. The answer comes first, every number has its source one tap away in the detail panel, and the expert material (charts, method, tables) sits in one collapsed section on the report screen. Four steps, each answering one Field Shift question:

| Step | Section id | Question it answers |
|------|------------|---------------------|
| 1 Your field today | `#step1` | How much fresh water does my field need now, what is the best saving, when is the salt water / slope risk? |
| 2 Compare options | `#rotationsSection` | Which rotation needs less water, leaves fewer bare-soil months, avoids salt water months? |
| 3 What satellites tell us | `#evidenceSection` | Do independent NASA data (MODIS, IMERG, SMAP, SRTM) agree with the model? |
| 4 Plan & report | `#reportSection` | Take a printable report or CSV to the extension officer; experts open "data & method". |

### A. Top bar (`.topbar`), side menu (`#stepNav`) and screens
- Top bar `64px`, fixed while scrolling: round logo + `AERO-AGRI`, region segmented control with a line icon (`Bến Tre (Mekong Delta)` | `Đắk Lắk (Central Highlands)`), `EN | VI` toggle (`#langToggle`). No extra report button: the menu already reaches every step.
- Side menu `236px`, fixed under the top bar: 4 items (icon with step number, `Step N`, step name), a `Data & method` link (opens `#techSection`), the NASA product line at the bottom. The active item is dark green with a yellow number dot. On phones (≤ 860 px) it becomes a fixed bottom tab bar with short labels (`Field`, `Compare`, `Satellites`, `Report`).
- Only the active step section is shown (`hidden` on the others). The URL hash keeps the place (`#rotationsSection`; back/forward work); a link to an element inside a step (`#methodCard`, `#btnCsv`) opens that step, opens any `<details>` around the target and scrolls to it. Steps 1–3 end with one `Next: <step>` link.

### B. Step 1: answer panel (`#heroCard`) and weather presets (`.scenario`)
- Short intro (the page `h1`) on top, then the step header (dark green icon square with a yellow number dot, title, one-line hint).
- `#heroTitle` sits in a light green panel: **one plain sentence built only from API numbers**: best non-partial option vs current practice, with the per-year check (`annual_deficit_by_year`): "in every year since 2015" only when it holds in all matched crop years, otherwise "in N of M years". When no option saves water (Đắk Lắk), the sentence says so and adds the erosion result when available. Key phrases (`<b>`) get a flat yellow marker background.
- Three tiles under the panel, each a separate white card with an icon circle and label: water to pump today (m³/ha and per 1,000 m²), best saving % (or extra water), salt water months with a 12-month strip (Bến Tre) or SRTM slope + IMERG wet-season share (Đắk Lắk).
- Weather: 3 large preset buttons with icons (`Today`, `Hot & dry`, `Very hot & dry`); the two sliders sit under an `Adjust` disclosure, with a value bubble above the thumb. Inline status text ("Updating…"), never toasts.

### C. Step 2: option card (`.rot-card`), one set only, two columns on desktop
- Card: single badge (above the title), `S0`-style id + name, big blue number m³/ha with the per-1,000 m² figure, two comparison bars (this option vs current practice), `↘ N% less than today`, typical vs dry-year line, `N months with bare soil` above the 12-month calendar (red underline = salt water month, orange dot = heat), top 1 benefit + top 1 risk, full-width `Details ›` button. The best complete option gets the `1.5px` green border.
- `Details` opens the **detail panel** (`#drawer`): a right-side panel on desktop, a bottom sheet on phones, with backdrop, close button, Escape and focus kept inside. It shows the summary again, the year bar chart (one bar per crop year, stress years in salinity red with event + source, `not yet verified` when unverified), lower-percolation range, per-1,000 m² rows (`plainLine`), config note, erosion block for `D1`, benefits / risks / info gaps side by side, sources, water-balance arithmetic, and `View report for this strategy →` (goes to Step 4). The panel follows language, weather and region changes.

### D. Step 3: evidence tiles (`.ev-tile`)
- Icon circle + dataset tag, title, one takeaway line, `See data ›` (opens the same detail panel): `#sowingCheck` (MODIS MOD09A1 sowing dates, Bến Tre; years with fewer detections than expected are always stated, with the cloud explanation), `#rainCheck` (GPM IMERG vs NASA POWER, both regions), `#smapCard` (SMAP L4 dry-season anomaly vs modeled deficit, Đắk Lắk; the driest-year disagreement stated plainly), `#erosionCheck` (RUSLE C-factor + SRTM slope + IMERG wet-season share, Đắk Lắk, `not yet verified`). Tiles hide when the API says `available: false`.

### E. Step 4: report and expert section
- `#btnReport` (big primary), `#btnPrint`, `#btnCsv` with icons; output in `#chatOutput` (empty state until built). Printing shows only the report.
- `<details id="techSection">` "For experts: data & method" (a full-width row with chevron): data chips (`chip-*`), `#climateChart` (POWER and IMERG bars + ETo line), NDVI strip with the model calendar above it, `#methodCard`, crop table, assumptions. Links into it (e.g. `#methodCard`) open it first.

### F. Motion and interaction (subtle, purposeful)
- Number count-up on region / scenario change, static skeleton placeholders while loading, screen fade-in and staggered card entrance each time a step opens, sliding detail panel, slider value bubble, 2 px hover lift + border colour change (no heavy shadow), visible `:focus-visible` rings, 44 px touch targets.
- Everything respects `prefers-reduced-motion: reduce` (no transitions or animations, no count-up, no smooth scroll).

### G. Language (EN | VI)
- Default English. Static text lives in `index.html` with `data-i18n` keys (English captured at start-up); `I18N.vi` replaces it. Dynamic text uses `t(key)` with `I18N = { en, vi }`. The choice persists in `localStorage` (wrapped in try/catch) and sets `<html lang>`. Numbers use `en-US` / `vi-VN`; months `Jan…Dec` / `T1…T12`.
- Config text in Vietnamese comes from the API `vi` blocks (strategy `vi.name/why/note/benefits/risks/info_gaps/evidence_text`, phase `label_vi`, region `vi.assumptions/salinity_months_source/ndvi_years_source`, stress year `event_vi`), with English fallback. Citations stay as published. The advisory report is English for now; in VI the page says "Báo cáo hiện có bằng tiếng Anh".

---

## 6. Required DOM IDs & Invariant Strings (Test Invariants)

These IDs and strings are UI conventions. Pytest does not parse index.html for most IDs; test_fix8_1 greps banned strings in web/app.js, web/index.html and core/advisor.py, test_fix11_2 / test_fix13_1 check the step anchors, side menu, detail panel and method card, test_fix14_1 checks the satellite cross-check IDs and API fields, and test_fix15_1 checks the EN | VI toggle and the I18N dictionary. Do not keep wording only because you think a test locks it.

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
Also kept as anchors: `step1`, `reportSection`, `techSection`, `methodCard`, `btnCsv`, `btnPrint`, `btnReport`, `ndviModelRow`, `drawer`.

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
