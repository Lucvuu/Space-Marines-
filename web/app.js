// AERO-AGRI Client Controller — NASA Space Apps Challenge (Field Shift)
// Swiss Editorial design · 100% offline-first

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let baselineDeficits = {}; // baseline deficits (0 °C, 0%) used for scenario deltas
let selectedStrategy = null;
let selectedStrategyName = "";
let lastRotations = null;
let lastRotationData = null;
let reportReady = false;

// Pilot regions and the MODIS NDVI pixel location
const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: "Ba Tri, Mekong Delta · Winter–Spring rice sown 11-01, salinity Feb–Apr",
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: "Cư M'gar, Central Highlands · Dry season 01-01 to 04-30",
        ndvi_point: { lat: 12.8314, lon: 108.1282 }
    }
};

const CROP_NAMES = {
    rice: "Rice",
    shrimp: "Tiger shrimp",
    soybean: "Soybean",
    maize: "Maize",
    coffee: "Robusta coffee",
    coffee_cover_crop: "Coffee + cover crop",
    other: "Other crop"
};
const KNOWN_CROPS = Object.keys(CROP_NAMES);

const RISK_TEXT = {
    LOW: "Low",
    MODERATE: "Moderate",
    SEVERE: "High",
    CRITICAL: "Very high",
    INSUFFICIENT_DATA: "Insufficient data"
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ==========================================================================
// APP START
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const q = new URLSearchParams(location.search).get("region");
    if (REGIONS_DATA[q]) currentRegion = q;

    document.querySelectorAll(".region-tab").forEach(b => {
        b.setAttribute("aria-pressed", String(b.dataset.region === currentRegion));
    });

    initControls();
    loadRegionData();
});

// Formatting helpers
function isNum(v) { return v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)); }
function fmt(v, d = 0) { return isNum(v) ? Number(v).toLocaleString("en-US", { maximumFractionDigits: d }) : "n/a"; }
function m3(mm) { return isNum(mm) ? fmt(mm * 10, 0) : "n/a"; } // 1 mm over 1 ha = 10 m³
function esc(s) {
    return String(s === null || s === undefined ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function cropKey(crop) {
    if (crop === null || crop === undefined) return "shrimp";
    return KNOWN_CROPS.includes(crop) ? crop : "other";
}
function show(id, on) { const el = document.getElementById(id); if (el) el.hidden = !on; }
function rawName(st) { return String((st && (st.name || st.name_vi)) || (st && st.id) || ""); }
// Display name of a strategy. For current practice the config name may carry a
// "<label>: " prefix; the card already says "Current", so drop the prefix
// using the structured is_existing flag (not the prefix wording).
function stratName(st) {
    let s = rawName(st);
    const i = s.indexOf(": ");
    if (st && st.is_existing && i > 0 && i < 30) s = s.slice(i + 2);
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function monthSpans(ms) {
    const out = [];
    ms.forEach(m => {
        const last = out[out.length - 1];
        if (last && m === last[1] + 1) last[1] = m; else out.push([m, m]);
    });
    return out.map(([a, b]) => (a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]}–${MONTHS[b - 1]}`)).join(", ");
}
function monthRange(ms) { return monthSpans(ms.map(Number)); }
function waterLabel(st) {
    return st.water_full_year === false && st.water_months && st.water_months.length
        ? `Supplemental fresh water in ${monthRange(st.water_months)}`
        : "Supplemental fresh water per year";
}
function scenarioText(t, r) { return `${t > 0 ? "+" : ""}${fmt(t, 1)} °C, rain ${r > 0 ? "+" : ""}${r}%`; }

// ==========================================================================
// EVENTS & SLIDERS
// ==========================================================================
function initControls() {
    // Region switch Bến Tre / Đắk Lắk
    document.querySelectorAll(".region-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRegion = btn.dataset.region;
            selectedStrategy = null;
            selectedStrategyName = "";
            document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
            baselineDeficits = {};
            loadRegionData();
        });
    });

    const sTemp = document.getElementById("sliderTemp");
    const sRain = document.getElementById("sliderRain");
    const onChange = () => { updateSliderLabels(); syncPresetChipState(); debouncedEvaluate(); };

    sTemp.addEventListener("input", onChange);
    sRain.addEventListener("input", onChange);

    document.getElementById("btnReset").addEventListener("click", () => {
        sTemp.value = "0";
        sRain.value = "0";
        onChange();
    });

    // One-tap scenario presets
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            sTemp.value = chip.dataset.temp;
            sRain.value = chip.dataset.rain;
            onChange();
        });
    });

    // Advisory report
    document.getElementById("btnCsv").addEventListener("click", downloadCsv);
    document.getElementById("btnPrint").addEventListener("click", async () => {
        if (!reportReady) await loadReport();
        window.print();
    });
    document.getElementById("btnReport").addEventListener("click", () => {
        selectedStrategy = null;
        selectedStrategyName = "";
        loadReport();
    });
    document.getElementById("rotationCardsGrid").addEventListener("click", e => {
        const b = e.target.closest(".card-report-btn");
        if (!b) return;
        selectedStrategy = b.dataset.strategy;
        selectedStrategyName = b.dataset.name;
        document.getElementById("reportSection").scrollIntoView({ behavior: "smooth" });
        loadReport();
    });
}

function updateSliderLabels() {
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.getElementById("valTemp").textContent =
        t === 0 ? "As today" : (t > 0 ? `+${fmt(t, 1)} °C` : `${fmt(t, 1)} °C`);
    document.getElementById("valRain").textContent =
        r === 0 ? "As today" : (r > 0 ? `+${r}%` : `${r}%`);
    updateReportContext();
}

function syncPresetChipState() {
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.querySelectorAll(".preset-chip").forEach(chip => {
        const ct = parseFloat(chip.dataset.temp);
        const cr = parseInt(chip.dataset.rain, 10);
        chip.classList.toggle("active", Math.abs(t - ct) < 0.05 && r === cr);
    });
}

function scenarioBody() {
    return JSON.stringify({
        region: currentRegion,
        delta_temp_c: parseFloat(document.getElementById("sliderTemp").value),
        delta_rain_pct: parseFloat(document.getElementById("sliderRain").value)
    });
}

function debouncedEvaluate() {
    resetReport();
    if (simDebounceTimer) clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(() => {
        loadRotations();
        evaluateCrops();
    }, 250);
}

// ==========================================================================
// SATELLITE DATA STATUS
// ==========================================================================
async function updateStatusBar() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const status = await res.json();
        latestRegionStatus = status[currentRegion] || {};

        updateChip("chip-power", "NASA POWER", latestRegionStatus.power, "days");
        updateChip("chip-ndvi", "MODIS NDVI", latestRegionStatus.ndvi, "images");
        updateChip("chip-sal", "Salinity (ground stations)", latestRegionStatus.salinity, "rows");

        const isSynth = Object.values(latestRegionStatus).some(s => s && s.is_synthetic);
        document.getElementById("dataBadgeArea").innerHTML = isSynth
            ? `<div style="background:#fffbeb; color:#b45309; border:1px solid #fef3c7; padding:8px 14px; border-radius:6px; font-size:13px; margin-bottom:14px;"><strong>Note:</strong> this region is using simulated demo data because no measured local file is available yet.</div>`
            : "";
    } catch (e) {
        console.error("Data status error:", e);
    }
}

function updateChip(elementId, label, info, unit) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!info || !info.available) {
        el.className = "chip chip-missing";
        el.textContent = `${label}: not available`;
    } else if (info.is_synthetic) {
        el.className = "chip chip-synthetic";
        el.textContent = `${label}: demo data`;
    } else {
        el.className = "chip chip-real";
        el.textContent = `${label}: measured (${fmt(info.rows)} ${unit})`;
    }
}

async function loadRegionData() {
    resetReport();
    const reg = REGIONS_DATA[currentRegion];
    document.getElementById("heroPlace").textContent = `${reg.name} · ${reg.place}`;
    updateSliderLabels();
    await updateStatusBar();

    if (!latestRegionStatus.power || !latestRegionStatus.power.available) {
        show("chartWrapper", false); show("climateEmpty", true);
        show("rotationsContent", false); show("rotationsEmpty", true);
        show("cropTableWrapper", false); show("evaluateEmpty", true);
        document.getElementById("heroTitle").textContent = "No weather data for this region yet";
        document.getElementById("heroBody").innerHTML = "";
        return;
    }

    await loadClimateChart();
    await loadRotations();
    await evaluateCrops();
}

// ==========================================================================
// NASA POWER CLIMATE CHART
// ==========================================================================
async function loadClimateChart() {
    try {
        const res = await fetch(`/api/climate?region=${encodeURIComponent(currentRegion)}`);
        const data = res.ok ? await res.json() : {};
        const clim = data.climatology || [];
        if (clim.length !== 12) {
            show("chartWrapper", false); show("climateEmpty", true);
            return;
        }
        show("chartWrapper", true); show("climateEmpty", false);
        if (climateChart) climateChart.destroy();
        climateChart = new Chart(document.getElementById("climateChart").getContext("2d"), {
            data: {
                labels: clim.map(c => MONTHS[c.month - 1]),
                datasets: [
                    { type: "bar", label: "Rain, NASA POWER (mm/month)", data: clim.map(c => c.rain_mm), backgroundColor: "rgba(3, 105, 161, 0.8)", borderRadius: 2, order: 2 },
                    { type: "line", label: "Reference ET, ETo (mm/month)", data: clim.map(c => c.eto_mm), borderColor: "#b45309", backgroundColor: "#b45309", borderWidth: 2, pointRadius: 2.5, tension: 0.3, order: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                locale: "en-US",
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { position: "top", align: "end", labels: { color: "#334155", usePointStyle: true, boxWidth: 6, font: { size: 11 } } } },
                scales: {
                    x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
                    y: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "#f1f5f9" }, title: { display: true, text: "mm/month", color: "#64748b", font: { size: 11 } } }
                }
            }
        });
        if (lastRotationData && lastRotationData.region_id === currentRegion) applyImergSeries(lastRotationData);
    } catch (e) {
        show("chartWrapper", false); show("climateEmpty", true);
    }
}

// ==========================================================================
// WHOLE-YEAR ROTATION STRATEGIES (SPEC-SHEET CARDS)
// ==========================================================================
async function loadRotations() {
    try {
        const res = await fetch("/api/rotations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: scenarioBody()
        });
        if (!res.ok) {
            show("rotationsContent", false); show("rotationsEmpty", true);
            return;
        }
        const data = await res.json();
        show("rotationsContent", true); show("rotationsEmpty", false);

        const strategies = (data.strategies || []).slice().sort((a, b) => (b.is_existing ? 1 : 0) - (a.is_existing ? 1 : 0));

        // Store the baseline under default weather
        const t = parseFloat(document.getElementById("sliderTemp").value);
        const r = parseInt(document.getElementById("sliderRain").value, 10);
        if (Math.abs(t) < 0.01 && r === 0) {
            strategies.forEach(s => {
                if (isNum(s.annual_deficit_mm)) baselineDeficits[s.id] = s.annual_deficit_mm;
            });
        }

        lastRotations = strategies;
        lastRotationData = data;
        renderHero(data, strategies);
        renderCompareBars(strategies);
        renderStrategyCards(data, strategies);
        renderNdviStrip(data, strategies);
        renderAssumptionsBox(data);
        renderCrossChecks(data);
    } catch (e) {
        console.error("Rotation render error:", e);
        show("rotationsContent", false); show("rotationsEmpty", true);
    }
}

function renderCompareBars(strategies) {
    const el = document.getElementById("compareBars");
    const vals = strategies.map(s => s.annual_deficit_mm).filter(isNum);
    if (!vals.length) { el.innerHTML = ""; return; }
    const max = Math.max(...vals);
    const pct = v => (isNum(v) && max > 0 ? (v / max * 100).toFixed(1) : "0");
    let hasRange = false;
    const rows = strategies.map(st => {
        const hi = st.annual_deficit_mm;
        const lo = isNum(st.annual_deficit_low_mm) ? st.annual_deficit_low_mm : hi;
        const ranged = isNum(lo) && isNum(hi) && hi - lo >= 1;
        if (ranged) hasRange = true;
        const notes = [];
        if (st.is_existing) notes.push("Current practice");
        if (st.partial) notes.push("shrimp phase not modeled");
        if (st.water_full_year === false && st.water_months && st.water_months.length) notes.push(`only ${monthRange(st.water_months)} counted`);
        const name = stratName(st);
        return `<div class="cmp-row">
            <div class="cmp-name">${name}${notes.length ? `<span class="cmp-note">${notes.join(" · ")}</span>` : ""}</div>
            <div class="cmp-bar" role="img" aria-label="${esc(name)}: ${m3(hi)} m³/ha">
                <span class="cmp-hi" style="width:${pct(hi)}%"></span><span class="cmp-lo" style="width:${pct(lo)}%"></span>
            </div>
            <div class="cmp-val"><b>${m3(hi)}</b> m³/ha${ranged ? `<small>${m3(lo)} if soil percolates less</small>` : ""}</div>
            <div class="cmp-bare">${(st.bare_months || []).length} bare-soil months</div>
        </div>`;
    }).join("");
    const legend = hasRange
        ? `<div class="cmp-legend"><span><i style="background:var(--water)"></i>Supplemental fresh water if soil percolates 2 mm/day</span><span><i style="background:var(--water-light)"></i>Extra if soil percolates 4 mm/day (setting in use)</span><span>Field soil type not yet verified.</span></div>`
        : "";
    el.innerHTML = rows + legend;
}

function heroInsight(strategies) {
    const base = strategies.find(s => s.is_existing);
    if (!base || !isNum(base.annual_deficit_mm)) return "";
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const parts = [];
    const b0 = baselineDeficits[base.id];
    if ((t !== 0 || r !== 0) && isNum(b0)) {
        const d = Math.round((base.annual_deficit_mm - b0) * 10);
        const w = scenarioText(t, r);
        parts.push(d >= 0
            ? `With weather at ${w}, current practice needs <b>${fmt(d)} m³/ha</b> more fresh water than under the 2015–2025 climate.`
            : `With weather at ${w}, current practice needs <b>${fmt(-d)} m³/ha</b> less fresh water than under the 2015–2025 climate.`);
    }
    const alts = strategies.filter(s => !s.is_existing && !s.partial && isNum(s.annual_deficit_mm))
        .sort((a, b) => a.annual_deficit_mm - b.annual_deficit_mm);
    const best = alts[0];
    if (best && best.annual_deficit_mm < base.annual_deficit_mm) {
        const saved = Math.round((base.annual_deficit_mm - best.annual_deficit_mm) * 10);
        parts.push(`Lowest fresh-water strategy in the model: <b>${stratName(best)}</b>, <b>${fmt(saved)} m³/ha</b> less than current practice. The model does not include cost, labor or market price.`);
    } else if (alts.length) {
        parts.push("In the model, no strategy uses less fresh water than current practice. See each card for other benefits, such as soil cover.");
    }
    return parts.length ? `<p class="hero-insight">${parts.join(" ")}</p>` : "";
}

function dayMonth(s) {
    const [m, d] = String(s).split("-");
    return `${MONTHS[Number(m) - 1] || m} ${Number(d)}`;
}

function plainLine(st, base) {
    const items = (st.phases || []).map(ph => {
        const win = ph.window && ph.window.start ? `, ${dayMonth(ph.window.start)}–${dayMonth(ph.window.end)}` : "";
        return ph.modeled && isNum(ph.deficit_mm)
            ? `<li>${ph.label}${win}: supply <b>${fmt(ph.deficit_mm)} m³</b></li>`
            : `<li>${ph.label}${win}: water not modeled</li>`;
    });
    let total = "";
    if (isNum(st.annual_deficit_mm)) {
        total = `${st.water_full_year === false ? "Total for these months" : "Whole year"}: <b>${fmt(st.annual_deficit_mm)} m³</b>`;
        if (!st.is_existing && base && isNum(base.annual_deficit_mm)) {
            const d = Math.round(st.annual_deficit_mm - base.annual_deficit_mm);
            total += d < 0 ? `, ${fmt(-d)} m³ less than current practice` : (d > 0 ? `, ${fmt(d)} m³ more than current practice` : ", same as current practice");
            if (st.partial) total += " (shrimp phase not modeled)";
        }
        total += ".";
    }
    return `<div class="plain-box" title="1 mm of water on the field = 1 m³ per 1,000 m²">
        <div class="plain-head">Per 1,000 m²: fresh water to supply</div>
        <ul>${items.join("")}</ul>${total ? `<p>${total}</p>` : ""}
    </div>`;
}

// Stress years are matched on crop_year AND label: a strategy whose years are
// calendar years ("2015") must not inherit a "2015/16" dry-season event.
function stressKey(y) { return `${Number(y.crop_year)}|${y.label}`; }

// T2: year-to-year variability. Typical (median) and dry (1-in-5) year plus one bar per crop year.
function yearStrip(st, stressYears) {
    const yrs = (st.annual_deficit_by_year || []).filter(y => y && y.label);
    const p50 = st.annual_deficit_p50_mm, p80 = st.annual_deficit_p80_mm;
    if (!yrs.length && !isNum(p50) && !isNum(p80)) return "";
    const dry = st.driest_crop_year;
    const line = `<div class="yr-line"${dry && dry.label ? ` title="Driest crop year in the record: ${esc(dry.label)}, ${m3(dry.deficit_mm)} m³/ha"` : ""}>Typical year <b>${m3(p50)}</b> m³/ha · Dry year (1 in 5) <b>${m3(p80)}</b> m³/ha</div>`;
    if (!yrs.length) return line;
    const max = Math.max(0, ...yrs.map(y => y.deficit_mm).filter(isNum));
    const stress = new Map((stressYears || []).map(s => [stressKey(s), s]));
    const bars = yrs.map(y => {
        const s = stress.get(stressKey(y));
        const h = isNum(y.deficit_mm) && max > 0 ? Math.max(6, y.deficit_mm / max * 100) : 0;
        let tip = `${y.label}: ${isNum(y.deficit_mm) ? `${m3(y.deficit_mm)} m³/ha` : "no data"}`;
        if (s) tip += ` · ${s.event} (${s.source}${s.verified === false ? "; not yet verified" : ""})`;
        return `<span class="yr-bar${s ? " stress" : ""}" style="height:${h.toFixed(0)}%" title="${esc(tip)}"></span>`;
    }).join("");
    return `${line}
        <div class="yr-strip" role="img" aria-label="Fresh water to supply in each crop year, ${esc(yrs[0].label)} to ${esc(yrs[yrs.length - 1].label)}">${bars}</div>
        <div class="yr-axis"><span>${yrs[0].label}</span><span>one bar per crop year</span><span>${yrs[yrs.length - 1].label}</span></div>`;
}

function csvCell(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_COLUMNS = ["row_type", "region", "delta_temp_c", "delta_rain_pct", "strategy_id", "strategy_name", "phase", "start_mmdd", "end_mmdd", "modeled",
    "etc_mm", "peff_mm", "rice_extra_mm", "deficit_mm", "deficit_low_perc_mm", "annual_deficit_mm", "annual_deficit_low_perc_mm",
    "annual_deficit_p50_mm", "annual_deficit_p80_mm", "bare_months", "partial",
    "crop_year", "crop_year_label", "crop_year_deficit_mm", "stress_event", "stress_source", "stress_verified",
    "obs_date", "obs_month", "obs_value", "obs_value2", "obs_unit", "obs_source"];

function downloadCsv() {
    if (!lastRotations) return;
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const data = lastRotationData || {};
    const stress = new Map((data.stress_years || []).map(s => [stressKey(s), s]));
    const rows = [];
    const add = obj => rows.push(CSV_COLUMNS.map(c => obj[c]));
    const scen = { region: currentRegion, delta_temp_c: t, delta_rain_pct: r };
    lastRotations.forEach(st => {
        const common = { ...scen, strategy_id: st.id, strategy_name: rawName(st),
            annual_deficit_mm: st.annual_deficit_mm, annual_deficit_low_perc_mm: st.annual_deficit_low_mm,
            annual_deficit_p50_mm: st.annual_deficit_p50_mm, annual_deficit_p80_mm: st.annual_deficit_p80_mm,
            bare_months: (st.bare_months || []).join(" "), partial: st.partial };
        (st.phases || []).forEach(ph => add({ row_type: "phase", ...common, phase: ph.label,
            start_mmdd: ph.window ? ph.window.start : "", end_mmdd: ph.window ? ph.window.end : "", modeled: ph.modeled,
            etc_mm: ph.etc_mm, peff_mm: ph.peff_mm, rice_extra_mm: ph.assumed_extra_mm, deficit_mm: ph.deficit_mm, deficit_low_perc_mm: ph.deficit_low_mm }));
        (st.annual_deficit_by_year || []).forEach(y => {
            const s = stress.get(stressKey(y));
            add({ row_type: "crop_year", ...common, crop_year: y.crop_year, crop_year_label: y.label, crop_year_deficit_mm: y.deficit_mm,
                stress_event: s ? s.event : "", stress_source: s ? s.source : "", stress_verified: s ? s.verified : "" });
        });
    });
    // Satellite cross-checks (shown next to the model, not used in the water formula)
    const os = data.observed_sowing;
    if (os && os.available) {
        (os.events || []).forEach(e => add({ row_type: "sowing_detected", ...scen, phase: e.phase_label || "unmatched", obs_date: e.date,
            obs_value: e.offset_days, obs_unit: "days vs configured start", obs_source: os.source }));
        (os.ground_truth_checks || []).forEach(g => add({ row_type: "sowing_ground_check", ...scen, obs_date: g.date,
            obs_value: g.difference_days, obs_value2: g.detected_date, obs_unit: "days (satellite minus reported); value2 = satellite date",
            obs_source: g.source }));
    }
    const xc = data.cross_checks || {};
    if (xc.rainfall && xc.rainfall.available) {
        (xc.rainfall.monthly || []).forEach(m => add({ row_type: "rain_monthly", ...scen, obs_month: m.month,
            obs_value: m.power_mm, obs_value2: m.imerg_mm, obs_unit: "mm/month: value = NASA POWER, value2 = GPM IMERG",
            obs_source: `${xc.rainfall.source_power} | ${xc.rainfall.source_imerg}` }));
    }
    if (xc.soil_moisture && xc.soil_moisture.available) {
        (xc.soil_moisture.by_year || []).forEach(y => add({ row_type: "smap_dry_season", ...scen, strategy_id: xc.soil_moisture.strategy_id,
            crop_year: y.year, obs_value: y.anomaly, obs_value2: y.modeled_deficit_mm,
            obs_unit: "value = SMAP soil moisture anomaly (m3/m3), value2 = modeled deficit (mm)", obs_source: xc.soil_moisture.source }));
    }
    if (xc.erosion && xc.erosion.available) {
        const e = xc.erosion;
        add({ row_type: "erosion_c_factor", ...scen, strategy_id: e.compared_strategy, obs_value: e.reduction_pct, obs_value2: e.soil_loss_ratio,
            obs_unit: `value = % lower soil loss than ${e.baseline_strategy}, value2 = soil-loss ratio (C ${e.c_compared} / ${e.c_baseline}); verified=${e.verified}`,
            obs_source: e.c_source });
    }
    const csv = String.fromCharCode(0xFEFF) + [CSV_COLUMNS, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `aero-agri_${currentRegion}_T${t}_R${r}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderHero(data, strategies) {
    const base = strategies.find(s => s.is_existing);
    const titleEl = document.getElementById("heroTitle");
    const bodyEl = document.getElementById("heroBody");
    if (!base) {
        titleEl.textContent = "No current-practice information";
        bodyEl.innerHTML = "";
        return;
    }

    const bareN = (base.bare_months || []).length;
    titleEl.textContent = `Current practice: ${stratName(base)}`;

    const sal = (data.salinity_months || []).map(Number);
    const riskSeasonTxt = sal.length
        ? `${monthSpans(sal)} (salinity intrusion)`
        : "Jan–Apr (dry-season drought)";

    bodyEl.innerHTML = `
        <div class="hero-stats-row">
            <div>
                <div class="hero-stat-num">${m3(base.annual_deficit_mm)} <small>m³/ha</small></div>
                <div class="hero-stat-lbl">${waterLabel(base)}</div>
            </div>
            <div>
                <div class="hero-stat-num">${bareN} <small>months</small></div>
                <div class="hero-stat-lbl">Bare-soil months ${bareN ? `(${monthSpans(base.bare_months)})` : ""}</div>
            </div>
            <div>
                <div class="hero-risk ${sal.length ? "sal" : "dry"}">${riskSeasonTxt}</div>
                <div class="hero-stat-lbl">High-risk weather window</div>
            </div>
        </div>` + heroInsight(strategies);
}

// 12-month Gantt timeline
function renderGanttTimeline(st, salMonths, usedCrops) {
    const cropByLabel = {};
    (st.phases || []).forEach(ph => { cropByLabel[ph.label] = cropKey(ph.crop); });

    // Month header row (initials; full name in the tooltip)
    let monthsHead = "";
    for (let m = 1; m <= 12; m++) {
        const isSal = salMonths.has(m);
        monthsHead += `<span class="${isSal ? "sal" : ""}" title="${MONTHS_LONG[m - 1]}${isSal ? ": salinity month" : ""}">${MONTHS[m - 1].charAt(0)}</span>`;
    }

    // Crop segments
    const calendar = st.calendar || [];
    const blocks = [];
    calendar.forEach(mc => {
        const key = mc.bare ? "__bare__" : (mc.phase_label || "");
        const last = blocks[blocks.length - 1];
        if (last && last.key === key) {
            last.months.push(mc);
        } else {
            blocks.push({ key, bare: !!mc.bare, label: mc.phase_label, months: [mc] });
        }
    });

    const segments = blocks.map(b => {
        const span = b.months.length;
        const hasHeat = b.months.some(mc => isNum(mc.heat_ratio) && mc.heat_ratio > 0);
        const style = `grid-column: span ${span};`;

        if (b.bare) {
            return `<div class="gantt-seg bare" style="${style}" title="Bare field, no cover crop">${span >= 3 ? "Bare soil" : ""}</div>`;
        }
        const ck = cropByLabel[b.label] || "other";
        usedCrops.add(ck);
        const heatDot = hasHeat ? `<span class="gantt-heat-dot" title="Days above the crop's heat threshold"></span>` : "";
        return `<div class="gantt-seg crop-${ck}" style="${style}" title="${esc(b.label)}">${heatDot}${span >= 3 ? (CROP_NAMES[ck] || b.label) : ""}</div>`;
    }).join("");

    return `
    <div class="gantt-timeline">
        <div class="gantt-months-head">${monthsHead}</div>
        <div class="gantt-bar">${segments}</div>
    </div>`;
}

function renderStrategyCards(data, strategies) {
    const grid = document.getElementById("rotationCardsGrid");
    const base = strategies.find(s => s.is_existing);
    const salMonths = new Set((data.salinity_months || []).map(Number));
    const stressYears = Array.isArray(data.stress_years) ? data.stress_years : [];
    const usedCrops = new Set();
    const erosion = (data.cross_checks && data.cross_checks.erosion) || null;
    let hasYearStrip = false;

    grid.innerHTML = strategies.map(st => {
        const isBase = st.is_existing;
        const bareN = (st.bare_months || []).length;
        const def = st.annual_deficit_mm;

        // Single status badge
        let badgeHtml = "";
        if (isBase) {
            badgeHtml = `<span class="badge-status current">Current</span>`;
        } else if (st.partial) {
            badgeHtml = `<span class="badge-status neutral">Shrimp phase not modeled</span>`;
        } else if (base && isNum(def) && isNum(base.annual_deficit_mm) && base.annual_deficit_mm > 0) {
            const pct = Math.round((base.annual_deficit_mm - def) / base.annual_deficit_mm * 100);
            if (pct > 0) {
                badgeHtml = `<span class="badge-status saved">Saves ${pct}% water</span>`;
            } else if (pct < 0) {
                badgeHtml = `<span class="badge-status neutral">Uses ${-pct}% more water</span>`;
            }
        }

        // Scenario delta when the sliders are not at zero
        let deltaTxt = "";
        const baseDef = baselineDeficits[st.id];
        if (isNum(def) && isNum(baseDef) && Math.abs(def - baseDef) > 1.0) {
            const diffM3 = Math.round((def - baseDef) * 10);
            if (diffM3 > 0) {
                deltaTxt = `<span class="metric-sub-delta up">(+${fmt(diffM3)} m³)</span>`;
            } else if (diffM3 < 0) {
                deltaTxt = `<span class="metric-sub-delta down">(${fmt(diffM3)} m³)</span>`;
            }
        }

        // Science note from config
        const scienceNoteHtml = st.note
            ? `<div class="science-note${st.partial ? " shrimp" : ""}">${st.note}</div>`
            : "";

        // Short benefit & risk bullets
        const bullets = [];
        (st.benefits || []).slice(0, 2).forEach(b => bullets.push(`<li class="good-item">${b}</li>`));
        (st.risks || []).slice(0, 2).forEach(r => bullets.push(`<li class="risk-item">${r}</li>`));

        // Evidence and formula inside <details>
        const evidence = (st.evidence || []).map(ev =>
            `<li>${ev.text} <span class="muted">(${ev.source}${ev.verified === false ? " - not yet verified" : ""})</span></li>`).join("");

        const calc = (st.phases || []).map(ph => {
            const win = ph.window && ph.window.start ? ` (${ph.window.start} to ${ph.window.end})` : "";
            if (!ph.modeled) {
                return `<li><strong>${ph.label}</strong>${win}: water not modeled for this phase.</li>`;
            }
            const extra = isNum(ph.assumed_extra_mm) && ph.assumed_extra_mm > 0
                ? ` + land preparation and percolation ${fmt(ph.assumed_extra_mm)} mm [assumed soil type]` : "";
            const presat = ph.presaturated ? " (the 200 mm soil saturation is not re-applied because the field is already wet from the previous month)" : "";
            const low = isNum(ph.deficit_low_mm) && isNum(ph.deficit_mm) && ph.deficit_mm - ph.deficit_low_mm >= 1
                ? `; if soil percolates 2 mm/day: ${fmt(ph.deficit_low_mm)} mm` : "";
            return `<li><strong>${ph.label}</strong>${win}: ETc ${fmt(ph.etc_mm)} mm${extra}${presat}; effective rain ${fmt(ph.peff_mm)} mm. Sum of monthly deficits: <strong>supply ${fmt(ph.deficit_mm)} mm</strong>${low}.</li>`;
        }).join("");

        const infoGaps = (st.info_gaps || []).map(g => `<li>${g}</li>`).join("");
        const yr = yearStrip(st, stressYears);
        if (yr) hasYearStrip = true;
        const ero = erosionForCard(st, erosion);

        return `
        <article class="rot-card ${isBase ? "is-baseline" : ""}" data-strategy-id="${esc(st.id)}">
            <div>
                <div class="rot-card-top">
                    <h3 class="rot-card-title">${stratName(st)}</h3>
                    ${badgeHtml}
                </div>
                <p class="rot-why">${st.why || ""}</p>
                ${plainLine(st, base)}

                <div class="rot-metrics-row">
                    <div>
                        <div class="metric-val">${m3(def)} <small>m³/ha</small>${deltaTxt}</div>
                        <div class="metric-lbl">${waterLabel(st)}, mean</div>
                        <div class="muted metric-mm">${fmt(def)} mm${st.partial ? " · * shrimp phase not modeled" : ""}${st.water_full_year === false ? " · other months not modeled" : ""}</div>
                    </div>
                    <div>
                        <div class="metric-val">${bareN} <small>months</small></div>
                        <div class="metric-lbl">Bare-soil months/year</div>
                    </div>
                    ${yr ? `<div class="yr-block">${yr}</div>` : ""}
                </div>

                ${renderGanttTimeline(st, salMonths, usedCrops)}
                ${scienceNoteHtml}
                ${ero.line}

                <ul class="bullet-list">${bullets.join("")}</ul>
            </div>

            <div class="rot-card-footer">
                <details>
                    <summary>Sources &amp; calculation</summary>
                    <div class="more-content">
                        ${evidence ? `<div><strong>Cited sources:</strong><ul>${evidence}</ul></div>` : ""}
                        ${calc ? `<div><strong>Water balance:</strong><ul>${calc}</ul></div>` : ""}
                        ${infoGaps ? `<div><strong>To verify:</strong><ul>${infoGaps}</ul></div>` : ""}
                        ${ero.detail}
                        ${st.partial ? `<div style="margin-top:6px; color:#0369a1;">* The shrimp phase is not included in the fresh-water total.</div>` : ""}
                    </div>
                </details>
                <button type="button" class="card-report-btn" data-strategy="${esc(st.id)}" data-name="${esc(stratName(st))}">View report for this strategy →</button>
            </div>
        </article>`;
    }).join("");

    // Compact legend
    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch" style="background:var(--c-${k});"></span>${CROP_NAMES[k]}</span>`);
    items.push(`<span class="legend-item"><span class="swatch" style="background:var(--c-bare);"></span>Bare soil</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span style="color:var(--sal); font-weight:700;">—</span>Salinity month</span>`);
    if (hasYearStrip && stressYears.length) items.push(`<span class="legend-item"><span class="swatch" style="background:var(--sal);"></span>Stress year</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");
}

// ==========================================================================
// SATELLITE CROSS-CHECKS (observed_sowing, cross_checks from /api/rotations)
// ==========================================================================
function fmtDate(iso) {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso || "");
}
function signed(v, d) { return isNum(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Number(v)).toFixed(d)}` : "n/a"; }

function renderCrossChecks(data) {
    renderSowing(data);
    applyImergSeries(data);
    renderRainCheck(data);
    renderSmap(data);
    updateCrossChips(data);
}

function crossChip(id, label, on, okText, reason) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = on ? "chip chip-real" : "chip chip-missing";
    el.textContent = `${label}: ${on ? okText : "not used here"}`;
    el.title = on ? "" : (reason || "");
}

function updateCrossChips(data) {
    const xc = data.cross_checks || {};
    const rain = xc.rainfall || {}, sm = xc.soil_moisture || {}, ero = xc.erosion || {}, os = data.observed_sowing || {};
    crossChip("chip-imerg", "GPM IMERG", !!rain.available, `${fmt(rain.n_months)} months`, rain.reason);
    crossChip("chip-sm", "SMAP L4", !!sm.available, `${fmt(sm.n_years_compared)} dry seasons`, sm.reason);
    crossChip("chip-srtm", "SRTM", !!ero.available && isNum(ero.slope_deg_p50), "30 m slope", ero.reason);
    crossChip("chip-mod09", "MODIS MOD09A1", !!os.available, `${fmt(os.n_composites_used)} images`, os.reason);
}

function renderSowing(data) {
    const el = document.getElementById("sowingCheck");
    const os = data.observed_sowing;
    if (!os || !os.available) { el.hidden = true; el.innerHTML = ""; return; }
    const phases = (os.phases || []).map(ph => {
        const start = dayMonth(ph.configured_start);
        const n = Number(ph.n_detected) || 0;
        if (!n || !isNum(ph.median_offset_days)) return `<li><b>${ph.label}</b>: no sowing detected (model date ${start}).</li>`;
        const d = Math.round(ph.median_offset_days);
        const rel = d === 0 ? `on ${start}` : `about <b>${fmt(Math.abs(d))} days ${d > 0 ? "after" : "before"}</b> ${start}`;
        return `<li>Satellite sees <b>${ph.label}</b> sown ${rel}, the date the model uses (median of ${n} detected season${n === 1 ? "" : "s"}).</li>`;
    });
    const spy = Object.entries(os.seasons_per_year || {}).sort((a, b) => a[0].localeCompare(b[0]));
    const expected = (os.phases || []).length;
    const low = spy.filter(([, n]) => Number(n) < expected);
    const none = spy.filter(([, n]) => Number(n) === 0).map(([y]) => y);
    const years = spy.map(([y, n]) => `<span class="sow-yr${Number(n) < expected ? " low" : ""}">${y}: <b>${n}</b></span>`).join("");
    const gap = low.length
        ? `<p class="xc-note">In ${low.length} of ${spy.length} years the satellite found fewer than ${expected} rice seasons${none.length ? `, and none at all in ${none.join(" and ")}` : ""}. Wet-season clouds hide many 8-day images, so a missing detection does not mean no rice was planted.</p>`
        : "";
    const gt = (os.ground_truth_checks || []).map(g => {
        const diff = Number(g.difference_days);
        const rel = !isNum(g.difference_days) ? "" : diff === 0 ? " (same day)" : ` (${fmt(Math.abs(diff))} days ${diff < 0 ? "earlier" : "later"})`;
        return `<li title="${esc(g.text)}">Ground check: reported ${g.approximate ? "~" : ""}${fmtDate(g.date)} · satellite: ${g.detected_date ? fmtDate(g.detected_date) : "not detected"}${rel}. <span class="muted">${g.source}${g.verified === false ? "; not yet verified" : ""}</span></li>`;
    }).join("");
    const events = (os.events || []).map(e => e.phase_label
        ? `<tr><td>${fmtDate(e.date)}</td><td>${e.phase_label}</td><td class="num">${signed(e.offset_days, 0)} days</td></tr>`
        : `<tr><td>${fmtDate(e.date)}</td><td class="muted">Unmatched (more than ${fmt(os.max_offset_days)} days from any model date)</td><td class="num">n/a</td></tr>`).join("");
    const nUn = Number(os.n_unmatched) || 0;
    const unmatched = nUn
        ? `<p class="xc-note">${nUn} detection${nUn === 1 ? " is" : "s are"} more than ${fmt(os.max_offset_days)} days from both model sowing dates (possible extra crop or image artefact) and ${nUn === 1 ? "is" : "are"} left out of the medians.</p>`
        : "";
    el.innerHTML = `
        <h2 class="card-heading">Sowing dates seen from space (MODIS)</h2>
        <ul class="xc-list">${phases.join("")}${gt}</ul>
        <div class="sow-years"><span>Rice seasons detected per year:</span>${years}</div>
        ${gap}
        ${unmatched}
        ${os.expected_error ? `<p class="xc-note">Expected error: ${os.expected_error}</p>` : ""}
        <details class="xc-details">
            <summary>All detections, method and sources</summary>
            <table class="table-clean xc-table"><thead><tr><th>Detected sowing</th><th>Season</th><th class="num">vs model date</th></tr></thead><tbody>${events}</tbody></table>
            <p><strong>Method:</strong> ${os.method || ""} <span class="muted">(${os.method_source || ""})</span></p>
            ${os.assumptions ? `<p><strong>Assumptions:</strong> ${os.assumptions}</p>` : ""}
            <p><strong>Data:</strong> ${os.source || ""}${isNum(os.n_composites_used) ? `; ${fmt(os.n_composites_used)} cloud-screened 8-day images used` : ""}.</p>
            ${(os.ground_truth_checks || []).map(g => `<p><strong>Ground report:</strong> ${g.text} <span class="muted">(${g.source})</span></p>`).join("")}
        </details>`;
    el.hidden = false;
}

function applyImergSeries(data) {
    if (!climateChart) return;
    const ds = climateChart.data.datasets;
    const i = ds.findIndex(d => d.id === "imerg");
    if (i >= 0) ds.splice(i, 1);
    const rain = data.cross_checks && data.cross_checks.rainfall;
    if (rain && rain.available && (rain.monthly || []).length === 12) {
        const byMonth = {};
        rain.monthly.forEach(m => { byMonth[m.month] = m.imerg_mm; });
        ds.push({ id: "imerg", type: "bar", label: "Rain, GPM IMERG (mm/month)", data: MONTHS.map((_, k) => byMonth[k + 1]),
            backgroundColor: "rgba(125, 211, 252, 0.9)", borderRadius: 2, order: 3 });
    }
    climateChart.update("none");
}

function renderRainCheck(data) {
    const el = document.getElementById("rainCheck");
    const rain = data.cross_checks && data.cross_checks.rainfall;
    if (!rain || !rain.available) { el.hidden = true; return; }
    const pct = isNum(rain.annual_ratio_imerg_to_power) ? (rain.annual_ratio_imerg_to_power - 1) * 100 : null;
    const per = rain.period ? ` (${rain.period[0]} to ${rain.period[1]})` : "";
    el.innerHTML = `Annual rain: NASA POWER <b>${fmt(rain.annual_power_mm)} mm</b> · GPM IMERG <b>${fmt(rain.annual_imerg_mm)} mm</b>${isNum(pct) ? ` (IMERG ${fmt(Math.abs(pct), 1)}% ${pct >= 0 ? "higher" : "lower"})` : ""}. Month-by-month correlation r = <b>${isNum(rain.monthly_correlation) ? Number(rain.monthly_correlation).toFixed(2) : "n/a"}</b> over ${fmt(rain.n_months)} months${per}.`;
    el.title = `${rain.source_power} | ${rain.source_imerg}`;
    el.hidden = false;
}

function renderSmap(data) {
    const el = document.getElementById("smapCard");
    const sm = data.cross_checks && data.cross_checks.soil_moisture;
    if (!sm || !sm.available || !(sm.by_year || []).length) { el.hidden = true; el.innerHTML = ""; return; }
    const yrs = sm.by_year;
    const maxA = Math.max(...yrs.map(y => Math.abs(Number(y.anomaly) || 0)), 1e-9);
    const smDry = yrs.filter(y => isNum(y.anomaly)).reduce((a, b) => (b.anomaly < a.anomaly ? b : a));
    const mDry = yrs.filter(y => isNum(y.modeled_deficit_mm)).reduce((a, b) => (b.modeled_deficit_mm > a.modeled_deficit_mm ? b : a));
    const strat = (lastRotations || []).find(s => s.id === sm.strategy_id);
    const months = monthSpans((sm.months || []).map(Number));
    const r = sm.correlation_anomaly_vs_deficit;
    const agree = sm.agrees_driest_year
        ? `Both pick ${smDry.year} as the driest dry season.`
        : `The single driest year differs: SMAP says ${smDry.year}, the model says ${mDry.year}.`;
    const rows = yrs.map(y => {
        const a = Number(y.anomaly);
        const w = isNum(y.anomaly) ? (Math.abs(a) / maxA * 50).toFixed(1) : 0;
        const bar = `<span class="anom"><i class="${a < 0 ? "dry" : "wet"}" style="width:${w}%;${a < 0 ? "right:50%" : "left:50%"}"></i></span>`;
        return `<tr${y.year === smDry.year || y.year === mDry.year ? ' class="hl"' : ""}><td>${y.year}</td><td class="num">${signed(y.anomaly, 3)}</td><td>${bar}</td><td class="num">${m3(y.modeled_deficit_mm)}</td></tr>`;
    }).join("");
    el.innerHTML = `
        <h3 class="card-heading" style="font-size:14.5px;">Dry-season soil moisture from space (NASA SMAP L4, ${months}) vs the model</h3>
        <p class="muted">${isNum(r) ? `In years when SMAP sees drier root-zone soil than usual, the model asks for more irrigation water${strat ? ` for ${stratName(strat)}` : ""}: correlation r = <b>${signed(r, 2)}</b> over ${fmt(sm.n_years_compared)} years. ` : ""}${agree}</p>
        <table class="table-clean xc-table"><thead><tr><th>Year</th><th class="num">Soil moisture anomaly (m³/m³)</th><th>drier · wetter</th><th class="num">Model: water to supply (m³/ha)</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="xc-note">Source: ${sm.source}.</p>`;
    el.hidden = false;
}

function erosionForCard(st, ero) {
    if (!ero || !ero.available || st.id !== ero.compared_strategy) return { line: "", detail: "" };
    const caveats = (ero.caveats || []).map(c => `<li>${c}</li>`).join("");
    const lbl = ero.c_labels || {};
    const site = [];
    if (isNum(ero.slope_deg_p50)) site.push(`Slope (SRTM): median ${Number(ero.slope_deg_p50).toFixed(1)}°${isNum(ero.slope_deg_p90) ? `, 10% of the land steeper than ${Number(ero.slope_deg_p90).toFixed(1)}°` : ""}`);
    if (isNum(ero.wet_season_rain_share)) site.push(`${Math.round(ero.wet_season_rain_share * 100)}% of rain falls ${monthSpans((ero.wet_season_months || []).map(Number))} (IMERG)`);
    const line = `<p class="xc-line" title="${esc((ero.caveats || []).join(" "))}">Soil loss about <b>${fmt(ero.reduction_pct, 0)}%</b> lower than bare inter-rows (C-factor, plot study in Indonesia${ero.verified === false ? "; not yet verified" : ""})</p>
                ${site.length ? `<p class="xc-line muted">${site.join(" · ")}</p>` : ""}`;
    const detail = `<div><strong>Erosion comparison (RUSLE C-factor):</strong><ul>
        <li>C = ${ero.c_baseline} for ${lbl[ero.baseline_strategy] || ero.baseline_strategy}; C = ${ero.c_compared} for ${lbl[ero.compared_strategy] || ero.compared_strategy}; soil-loss ratio ${ero.soil_loss_ratio} with the same rain, soil and slope.</li>
        ${caveats}
        <li>${ero.c_source}${ero.verified === false ? " - not yet verified" : ""}</li>
        ${ero.slope_source ? `<li>${ero.slope_source}</li>` : ""}${ero.rain_source ? `<li>${ero.rain_source}</li>` : ""}</ul></div>`;
    return { line, detail };
}

function renderNdviStrip(data, strategies) {
    const el = document.getElementById("ndviStrip");
    const ndvi = Array.isArray(data.ndvi_monthly) ? data.ndvi_monthly : [];
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[m - 1]) ? Number(ndvi[m - 1]) : null;
        if (v === null) {
            html += `<div class="ndvi-cell na"><span>${MONTHS[m - 1]}</span><b>–</b></div>`;
            continue;
        }
        const n = Math.max(0, Math.min(1, v));
        html += `<div class="ndvi-cell${n >= 0.5 ? " dark" : ""}" style="background: rgba(21, 128, 61, ${(0.08 + 0.85 * n).toFixed(2)})" title="${MONTHS_LONG[m - 1]}: NDVI ${v.toFixed(2)}">
            <span>${MONTHS[m - 1]}</span>
            <b>${v.toFixed(2)}</b>
        </div>`;
    }
    el.innerHTML = html;
    const p = REGIONS_DATA[currentRegion].ndvi_point;
    const yrs = data.ndvi_years ? `${data.ndvi_years[0]}–${data.ndvi_years[1]}` : "several years";
    document.getElementById("ndviNote").textContent =
        `MODIS satellite NDVI, median of a 3×3 km window around (${p.lat}, ${p.lon}), averaged over ${yrs}. Darker cells mean more green vegetation; light cells are bare, newly sown or flooded fields. The row above is the model calendar of current practice, placed directly above for comparison.`;
    const base = (strategies || []).find(s => s.is_existing);
    document.getElementById("ndviModelRow").innerHTML = base
        ? `<div class="ndvi-row-lbl">Model calendar of current practice</div>${renderGanttTimeline(base, new Set((data.salinity_months || []).map(Number)), new Set())}<div class="ndvi-row-lbl">Measured satellite greenness (NDVI)</div>`
        : "";
}

function renderAssumptionsBox(data) {
    const items = (data.assumptions || []).map(a => `<li>${a}</li>`);
    if (data.salinity_months_source) items.push(`<li><strong>Salinity months source:</strong> ${data.salinity_months_source}</li>`);
    (Array.isArray(data.stress_years) ? data.stress_years : []).forEach(s => items.push(
        `<li><strong>Stress year ${esc(s.label)}:</strong> ${s.event} (${s.source}${s.verified === false ? "; not yet verified" : ""})</li>`));
    if (data.stress_years_source) items.push(`<li><strong>Stress years source:</strong> ${data.stress_years_source}</li>`);
    if (data.ndvi_years_source) items.push(`<li><strong>Years used for NDVI:</strong> ${data.ndvi_years_source}</li>`);
    if (data.display_rule) items.push(`<li><strong>Calendar display rule:</strong> ${data.display_rule}</li>`);
    document.getElementById("rotationAssumptionsBox").innerHTML =
        `<h3 class="card-heading" style="font-size:14.5px; margin-bottom:6px;">Water-balance model assumptions &amp; data limits</h3><ul class="muted" style="margin:0; padding-left:18px; font-size:13px; line-height:1.5;">${items.join("")}</ul>`;
}

// ==========================================================================
// DRY-SEASON CROP TABLE
// ==========================================================================
async function evaluateCrops() {
    const tbody = document.getElementById("cropTableBody");
    try {
        const res = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: scenarioBody()
        });
        if (!res.ok) {
            show("cropTableWrapper", false); show("evaluateEmpty", true);
            return;
        }
        const crops = (await res.json()).crops || [];
        show("cropTableWrapper", true); show("evaluateEmpty", false);

        // Salinity is "not modeled" when the region has a salinity season (structured
        // salinity_months from /api/rotations) but the crop has no computed salinity_exceed.
        const regionHasSalinity = !!(lastRotationData && lastRotationData.region_id === currentRegion
            && (lastRotationData.salinity_months || []).length);
        const salMissing = c => regionHasSalinity && (!c.components || c.components.salinity_exceed === null || c.components.salinity_exceed === undefined);

        const rows = crops.filter(c => isNum(c.deficit_mm));
        show("waterOnlyScoreNote", rows.some(salMissing));

        tbody.innerHTML = rows.map((c, i) => {
            const note = c.missing_components && c.missing_components.length
                ? `<div class="muted" style="font-size:11.5px;">(${c.missing_components.join("; ")})</div>` : "";
            const win = c.season_window && c.season_window.start ? `${c.season_window.start} → ${c.season_window.end}` : "–";
            const v = c.water_vs_baseline_pct;
            const saved = !isNum(v) ? "–"
                : i === 0 ? "Baseline"
                : v > 0 ? `<span style="color:var(--good); font-weight:700;">-${fmt(v, 1)}%</span>`
                : v < 0 ? `<span style="color:var(--bad); font-weight:700;">+${fmt(-v, 1)}%</span>` : "0%";
            let risk = `<span class="risk-tag risk-${c.risk_level}">${RISK_TEXT[c.risk_level] || c.risk_level}</span>`;
            if (c.score !== null && !isNum(c.exceed_ratio_r)) {
                risk = `<span class="muted">No reference threshold</span>`;
            }
            if (salMissing(c)) {
                risk = `<span class="muted">Salinity not modeled</span>`;
            }
            return `<tr>
                <td><strong>${c.crop_name}</strong>${note}</td>
                <td class="nowrap muted">${win}</td>
                <td class="nowrap" style="text-align:right;">${isNum(c.deficit_mm) ? `<strong>${m3(c.deficit_mm)}</strong> <small class="muted">(${fmt(c.deficit_mm, 1)} mm)</small>` : "–"}</td>
                <td style="text-align:right;">${saved}</td>
                <td>${risk}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        show("cropTableWrapper", false); show("evaluateEmpty", true);
    }
}

// ==========================================================================
// ADVISORY REPORT
// ==========================================================================
function resetReport() {
    reportReady = false;
    document.getElementById("chatOutput").textContent = "Press the button to build a report.";
}

function updateReportContext() {
    const el = document.getElementById("reportContext");
    if (!el) return;
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const w = (t === 0 && r === 0) ? "2015–2025 average" : scenarioText(t, r);
    el.textContent = `Viewing: ${REGIONS_DATA[currentRegion].name} · Weather: ${w}${selectedStrategyName ? ` · Strategy: ${selectedStrategyName}` : ""}`;
}

async function loadReport() {
    reportReady = false;
    updateReportContext();
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Computing...</em>";
    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...JSON.parse(scenarioBody()), strategy_id: selectedStrategy })
        });
        if (!res.ok) { outputEl.innerHTML = `<span class="txt-bad">Could not build the report (code ${res.status}).</span>`; return; }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
        reportReady = true;
    } catch (e) {
        outputEl.innerHTML = `<span class="txt-bad">Cannot reach the server: ${esc(e.message)}</span>`;
    }
}

function renderSimpleMarkdown(md) {
    if (!md) return "";
    let html = "";
    let inTable = false;
    md.split("\n").forEach(line => {
        const t = line.trim();
        if (t.startsWith("|")) {
            if (!inTable) { inTable = true; html += "<div style=\"overflow-x:auto;\"><table class=\"table-clean\"><tbody>"; }
            if (t.includes("---")) return;
            html += "<tr>" + t.split("|").slice(1, -1).map(c => `<td>${formatInline(c.trim())}</td>`).join("") + "</tr>";
            return;
        } else if (inTable) { inTable = false; html += "</tbody></table></div>"; }

        if (t.startsWith("### ")) html += `<h3>${formatInline(t.substring(4))}</h3>`;
        else if (t.startsWith("#### ")) html += `<h4>${formatInline(t.substring(5))}</h4>`;
        else if (t.startsWith("> ")) html += `<blockquote style="margin:6px 0; color:var(--muted);">${formatInline(t.substring(2))}</blockquote>`;
        else if (t.startsWith("- ")) html += `<ul><li>${formatInline(t.substring(2))}</li></ul>`;
        else if (t.startsWith("---")) html += `<hr style="border:0; border-top:1px solid var(--border); margin:10px 0;">`;
        else if (t !== "") html += `<p>${formatInline(t)}</p>`;
    });
    if (inTable) html += "</tbody></table></div>";
    return html;
}

function formatInline(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
}
