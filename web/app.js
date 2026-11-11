// AERO-AGRI Client Controller — NASA Space Apps Challenge (Field Shift)
// Thiết kế Swiss Editorial & Modern SaaS Copilot · 100% Offline-First

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let baselineDeficits = {}; // Lưu trữ deficit cơ sở (0°C, 0%) để tính delta
let selectedStrategy = null;
let selectedStrategyName = "";

// Thông tin vùng trọng điểm và tọa độ điểm ảnh vệ tinh MODIS NDVI
const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: "Ba Tri, ĐBSCL · Đông Xuân gieo 11-01, mặn tháng 2–4",
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: "Cư M'gar, Tây Nguyên · Mùa khô 01-01 đến 04-30",
        ndvi_point: { lat: 12.8314, lon: 108.1282 }
    }
};

const CROP_NAMES = {
    rice: "Lúa",
    shrimp: "Tôm sú",
    soybean: "Đậu tương",
    maize: "Ngô",
    coffee: "Cà phê",
    coffee_cover_crop: "Cà phê + thảm cỏ",
    other: "Cây khác"
};
const KNOWN_CROPS = Object.keys(CROP_NAMES);

const RISK_TEXT = {
    LOW: "Thấp",
    MODERATE: "Trung bình",
    SEVERE: "Cao",
    CRITICAL: "Rất cao",
    INSUFFICIENT_DATA: "Chưa đủ dữ liệu"
};

// ==========================================================================
// KHỞI TẠO ỨNG DỤNG
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

// Tiện ích định dạng
function isNum(v) { return v !== null && v !== undefined && !Number.isNaN(Number(v)); }
function fmt(v, d = 0) { return isNum(v) ? Number(v).toLocaleString("vi-VN", { maximumFractionDigits: d }) : "chưa có"; }
function m3(mm) { return isNum(mm) ? fmt(mm * 10, 0) : "chưa có"; } // 1 mm/ha = 10 m³
function cropKey(crop) {
    if (crop === null || crop === undefined) return "shrimp";
    return KNOWN_CROPS.includes(crop) ? crop : "other";
}
function show(id, on) { const el = document.getElementById(id); if (el) el.hidden = !on; }
function cleanName(name) {
    const s = String(name || "").replace(/^Hiện trạng:\s*/, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function monthSpans(ms) {
    const out = [];
    ms.forEach(m => {
        const last = out[out.length - 1];
        if (last && m === last[1] + 1) last[1] = m; else out.push([m, m]);
    });
    return "tháng " + out.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");
}
function monthList(ms) { return ms.map(m => `tháng ${m}`).join(", "); }

function monthRange(ms) {
    const ok = ms.length > 1 && ms.every((m, i) => i === 0 || m === ms[i - 1] + 1);
    return ok ? `tháng ${ms[0]}–${ms[ms.length - 1]}` : monthList(ms);
}
function waterLabel(st) {
    return st.water_full_year === false && st.water_months && st.water_months.length
        ? `Nước ngọt phải tưới thêm trong ${monthRange(st.water_months)}`
        : "Nước ngọt phải tưới thêm mỗi năm";
}

// ==========================================================================
// ĐIỀU KHIỂN SỰ KIỆN & THANH TRƯỢT
// ==========================================================================
function initControls() {
    // Chuyển vùng Bến Tre / Đắk Lắk
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

    sTemp.addEventListener("input", () => {
        updateSliderLabels();
        syncPresetChipState();
        debouncedEvaluate();
    });

    sRain.addEventListener("input", () => {
        updateSliderLabels();
        syncPresetChipState();
        debouncedEvaluate();
    });

    document.getElementById("btnReset").addEventListener("click", () => {
        sTemp.value = "0";
        sRain.value = "0";
        updateSliderLabels();
        syncPresetChipState();
        debouncedEvaluate();
    });

    // Preset kịch bản nhanh 1-chạm
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            sTemp.value = chip.dataset.temp;
            sRain.value = chip.dataset.rain;
            updateSliderLabels();
            syncPresetChipState();
            debouncedEvaluate();
        });
    });

    // Báo cáo tư vấn
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
        t === 0 ? "Như hiện nay" : (t > 0 ? `+${fmt(t, 1)} °C` : `${fmt(t, 1)} °C`);
    document.getElementById("valRain").textContent =
        r === 0 ? "Như hiện nay" : (r > 0 ? `+${r}%` : `${r}%`);
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
// TRẠNG THÁI DỮ LIỆU VỆ TINH
// ==========================================================================
async function updateStatusBar() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const status = await res.json();
        latestRegionStatus = status[currentRegion] || {};

        updateChip("chip-power", "NASA POWER", latestRegionStatus.power, "ngày");
        updateChip("chip-ndvi", "MODIS NDVI", latestRegionStatus.ndvi, "ảnh");
        updateChip("chip-sm", "SMAP (chưa dùng)", latestRegionStatus.soil_moisture, "dòng");
        updateChip("chip-sal", "Độ mặn (trạm mặt đất)", latestRegionStatus.salinity, "dòng");

        const isSynth = Object.values(latestRegionStatus).some(s => s && s.is_synthetic);
        document.getElementById("dataBadgeArea").innerHTML = isSynth
            ? `<div style="background:#fffbeb; color:#b45309; border:1px solid #fef3c7; padding:8px 14px; border-radius:6px; font-size:13px; margin-bottom:14px;"><strong>Lưu ý:</strong> Vùng này đang dùng dữ liệu mô phỏng do chưa có file đo thật cục bộ.</div>`
            : "";
    } catch (e) {
        console.error("Lỗi trạng thái dữ liệu:", e);
    }
}

function updateChip(elementId, label, info, unit) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!info || !info.available) {
        el.className = "chip chip-missing";
        el.textContent = `${label}: chưa có`;
    } else if (info.is_synthetic) {
        el.className = "chip chip-synthetic";
        el.textContent = `${label}: dữ liệu mẫu`;
    } else {
        el.className = "chip chip-real";
        el.textContent = `${label}: thật (${fmt(info.rows)} ${unit})`;
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
        document.getElementById("heroTitle").textContent = "Chưa có dữ liệu khí tượng cho vùng này";
        document.getElementById("heroBody").innerHTML = "";
        return;
    }

    await loadClimateChart();
    await loadRotations();
    await evaluateCrops();
}

// ==========================================================================
// BIỂU ĐỒ KHÍ HẬU NASA POWER
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
                labels: clim.map(c => `T${c.month}`),
                datasets: [
                    { type: "bar", label: "Mưa trung bình (mm/tháng)", data: clim.map(c => c.rain_mm), backgroundColor: "rgba(3, 105, 161, 0.75)", borderRadius: 2, order: 2 },
                    { type: "line", label: "Bốc thoát hơi ETo (mm/tháng)", data: clim.map(c => c.eto_mm), borderColor: "#b45309", backgroundColor: "#b45309", borderWidth: 2, pointRadius: 2.5, tension: 0.3, order: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { position: "top", align: "end", labels: { color: "#334155", usePointStyle: true, boxWidth: 6, font: { size: 11 } } } },
                scales: {
                    x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
                    y: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "#f1f5f9" }, title: { display: true, text: "mm/tháng", color: "#64748b", font: { size: 11 } } }
                }
            }
        });
    } catch (e) {
        show("chartWrapper", false); show("climateEmpty", true);
    }
}

// ==========================================================================
// CÁC PHƯƠNG ÁN LUÂN CANH CĂN HÀNG NGANG (SWISS SPEC-SHEET)
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

        // Lưu baseline khi thời tiết mặc định
        const t = parseFloat(document.getElementById("sliderTemp").value);
        const r = parseInt(document.getElementById("sliderRain").value, 10);
        if (Math.abs(t) < 0.01 && r === 0) {
            strategies.forEach(s => {
                if (isNum(s.annual_deficit_mm)) {
                    baselineDeficits[s.id] = s.annual_deficit_mm;
                }
            });
        }

        renderHero(data, strategies);
        renderCompareBars(strategies);
        renderStrategyCards(data, strategies);
        renderNdviStrip(data);
        renderAssumptionsBox(data);
    } catch (e) {
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
        if (st.is_existing) notes.push("Hiện tại");
        if (st.partial) notes.push("chưa tính vụ tôm");
        if (st.water_full_year === false && st.water_months && st.water_months.length) notes.push(`chỉ tính ${monthRange(st.water_months)}`);
        const name = cleanName(st.name_vi);
        return `<div class="cmp-row">
            <div class="cmp-name">${name}${notes.length ? `<span class="cmp-note">${notes.join(" · ")}</span>` : ""}</div>
            <div class="cmp-bar" role="img" aria-label="${name}: ${m3(hi)} m³/ha">
                <span class="cmp-hi" style="width:${pct(hi)}%"></span><span class="cmp-lo" style="width:${pct(lo)}%"></span>
            </div>
            <div class="cmp-val"><b>${m3(hi)}</b> m³/ha${ranged ? `<small>${m3(lo)} nếu đất thấm ít</small>` : ""}</div>
            <div class="cmp-bare">${(st.bare_months || []).length} tháng đất trống</div>
        </div>`;
    }).join("");
    const legend = hasRange
        ? `<div class="cmp-legend"><span><i style="background:var(--water)"></i>Nước ngọt phải tưới thêm nếu đất thấm 2 mm/ngày</span><span><i style="background:var(--water-light)"></i>Phần thêm nếu đất thấm 4 mm/ngày (mức đang dùng)</span><span>Loại đất tại ruộng chưa kiểm chứng.</span></div>`
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
        const w = `${t > 0 ? "+" : ""}${fmt(t, 1)} °C, mưa ${r > 0 ? "+" : ""}${r}%`;
        parts.push(d >= 0
            ? `Với thời tiết ${w}, cách làm hiện tại cần thêm <b>${fmt(d)} m³/ha</b> nước ngọt so với khí hậu 2015–2025.`
            : `Với thời tiết ${w}, cách làm hiện tại cần ít hơn <b>${fmt(-d)} m³/ha</b> nước ngọt so với khí hậu 2015–2025.`);
    }
    const alts = strategies.filter(s => !s.is_existing && !s.partial && isNum(s.annual_deficit_mm))
        .sort((a, b) => a.annual_deficit_mm - b.annual_deficit_mm);
    const best = alts[0];
    if (best && best.annual_deficit_mm < base.annual_deficit_mm) {
        const saved = Math.round((base.annual_deficit_mm - best.annual_deficit_mm) * 10);
        parts.push(`Phương án ít nước ngọt nhất theo mô hình: <b>${cleanName(best.name_vi)}</b>, ít hơn hiện tại <b>${fmt(saved)} m³/ha</b>. Mô hình chưa tính chi phí, công lao động và đầu ra.`);
    } else if (alts.length) {
        parts.push("Theo mô hình, không phương án nào dùng ít nước ngọt hơn cách làm hiện tại. Xem từng thẻ để so các lợi ích khác, như che phủ đất.");
    }
    return parts.length ? `<p class="hero-insight">${parts.join(" ")}</p>` : "";
}

function renderHero(data, strategies) {
    const base = strategies.find(s => s.is_existing);
    const titleEl = document.getElementById("heroTitle");
    const bodyEl = document.getElementById("heroBody");
    if (!base) {
        titleEl.textContent = "Chưa có thông tin hiện trạng";
        bodyEl.innerHTML = "";
        return;
    }

    const bareN = (base.bare_months || []).length;
    const nm = cleanName(base.name_vi);
    titleEl.textContent = `Hiện trạng: ${nm.charAt(0).toUpperCase()}${nm.slice(1)}`;

    const sal = (data.salinity_months || []).map(Number);
    const riskSeasonTxt = sal.length
        ? `Tháng ${sal.join(", ")} (Nước mặn xâm nhập)`
        : "Tháng 1 đến 4 (Hạn hán mùa khô)";

    bodyEl.innerHTML = `
        <div class="hero-stats-row">
            <div>
                <div class="hero-stat-num">${m3(base.annual_deficit_mm)} <small>m³/ha</small></div>
                <div class="hero-stat-lbl">${waterLabel(base).toLowerCase()}</div>
            </div>
            <div>
                <div class="hero-stat-num">${bareN} <small>tháng</small></div>
                <div class="hero-stat-lbl">Tháng đất trống ${bareN ? `(${monthSpans(base.bare_months)})` : ""}</div>
            </div>
            <div>
                <div class="hero-risk ${sal.length ? "sal" : "dry"}">${riskSeasonTxt}</div>
                <div class="hero-stat-lbl">Cửa sổ thời tiết rủi ro cao</div>
            </div>
        </div>` + heroInsight(strategies);
}

// Gantt Timeline 12 Tháng
function renderGanttTimeline(st, salMonths, usedCrops) {
    const cropByLabel = {};
    (st.phases || []).forEach(ph => { cropByLabel[ph.label] = cropKey(ph.crop); });

    // Hàng tiêu đề 12 tháng
    let monthsHead = "";
    for (let m = 1; m <= 12; m++) {
        const isSal = salMonths.has(m);
        monthsHead += `<span class="${isSal ? "sal" : ""}" title="${isSal ? "Tháng nước mặn" : ""}">T${m}</span>`;
    }

    // Các phân đoạn cây trồng
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
            return `<div class="gantt-seg bare" style="${style}" title="Ruộng trống không có cây che phủ">${span >= 2 ? "Đất trống" : ""}</div>`;
        }
        const ck = cropByLabel[b.label] || "other";
        usedCrops.add(ck);
        const heatDot = hasHeat ? `<span class="gantt-heat-dot" title="Có ngày nóng vượt ngưỡng sinh lý"></span>` : "";
        return `<div class="gantt-seg crop-${ck}" style="${style}" title="${b.label}">${heatDot}${span >= 2 ? (CROP_NAMES[ck] || b.label) : ""}</div>`;
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
    const usedCrops = new Set();

    grid.innerHTML = strategies.map((st, i) => {
        const isBase = st.is_existing;
        const bareN = (st.bare_months || []).length;
        const def = st.annual_deficit_mm;

        // Tính badge trạng thái duy nhất
        let badgeHtml = "";
        if (isBase) {
            badgeHtml = `<span class="badge-status current">Hiện tại</span>`;
        } else if (st.partial) {
            badgeHtml = `<span class="badge-status neutral">Chưa tính vụ tôm</span>`;
        } else if (isNum(def) && isNum(base.annual_deficit_mm) && base.annual_deficit_mm > 0) {
            const pct = Math.round((base.annual_deficit_mm - def) / base.annual_deficit_mm * 100);
            if (pct > 0) {
                badgeHtml = `<span class="badge-status saved">Tiết kiệm ${pct}% nước</span>`;
            } else if (pct < 0) {
                badgeHtml = `<span class="badge-status neutral">Tăng ${-pct}% nước</span>`;
            }
        }

        // Tính delta nếu slider khác 0
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

        // Ghi chú thực tế khoa học
        const scienceNoteHtml = st.note
            ? `<div class="science-note${st.partial ? " shrimp" : ""}">${st.note}</div>`
            : "";

        // Gạch đầu dòng lợi ích & rủi ro tinh gọn
        const bullets = [];
        (st.benefits || []).slice(0, 2).forEach(b => {
            bullets.push(`<li class="good-item">${b}</li>`);
        });
        (st.risks || []).slice(0, 2).forEach(r => {
            bullets.push(`<li class="risk-item">${r}</li>`);
        });

        // Bằng chứng và công thức trong details
        const evidence = (st.evidence || []).map(ev =>
            `<li>${ev.text} <span class="muted">(${ev.source}${ev.verified === false ? " - chưa kiểm chứng" : ""})</span></li>`).join("");

        const calc = (st.phases || []).map(ph => {
            const win = ph.window && ph.window.start ? ` (${ph.window.start} đến ${ph.window.end})` : "";
            if (!ph.modeled) {
                return `<li><strong>${ph.label}</strong>${win}: chưa tính nước cho giai đoạn này.</li>`;
            }
            const extra = isNum(ph.assumed_extra_mm) && ph.assumed_extra_mm > 0
                ? ` + nước làm đất, thấm ${fmt(ph.assumed_extra_mm)} mm [loại đất giả định]` : "";
            const presat = ph.presaturated ? " (không tính lại 200 mm bão hòa đất vì ruộng đã ngấm nước từ tháng trước)" : "";
            const low = isNum(ph.deficit_low_mm) && isNum(ph.deficit_mm) && ph.deficit_mm - ph.deficit_low_mm >= 1
                ? `; nếu đất thấm 2 mm/ngày: ${fmt(ph.deficit_low_mm)} mm` : "";
            return `<li><strong>${ph.label}</strong>${win}: ETc ${fmt(ph.etc_mm)} mm${extra}${presat}; mưa hiệu quả ${fmt(ph.peff_mm)} mm. Cộng phần thiếu của từng tháng: <strong>tưới ${fmt(ph.deficit_mm)} mm</strong>${low}.</li>`;
        }).join("");

        const infoGaps = (st.info_gaps || []).map(g => `<li>${g}</li>`).join("");

        return `
        <article class="rot-card ${isBase ? "is-baseline" : ""}" data-strategy-id="${st.id}">
            <div>
                <div class="rot-card-top">
                    <h3 class="rot-card-title">${cleanName(st.name_vi)}</h3>
                    ${badgeHtml}
                </div>
                <p class="rot-why">${st.why}</p>

                <div class="rot-metrics-row">
                    <div>
                        <div class="metric-val">${m3(def)} <small>m³/ha</small>${deltaTxt}</div>
                        <div class="metric-lbl">${waterLabel(st)}</div>
                        <div class="muted" style="font-size:11px; margin-top:2px;">${fmt(def)} mm${st.partial ? " · * chưa tính giai đoạn nuôi tôm" : ""}${st.water_full_year === false ? " · các tháng khác chưa tính" : ""}</div>
                    </div>
                    <div>
                        <div class="metric-val">${bareN} <small>tháng</small></div>
                        <div class="metric-lbl">Ruộng trống/năm</div>
                    </div>
                </div>

                ${renderGanttTimeline(st, salMonths, usedCrops)}
                ${scienceNoteHtml}

                <ul class="bullet-list">${bullets.join("")}</ul>
            </div>

            <div class="rot-card-footer">
                <details>
                    <summary>Nguồn & Tính toán</summary>
                    <div class="more-content">
                        ${evidence ? `<div><strong>Nguồn trích dẫn:</strong><ul>${evidence}</ul></div>` : ""}
                        ${calc ? `<div><strong>Công thức cân bằng nước:</strong><ul>${calc}</ul></div>` : ""}
                        ${infoGaps ? `<div><strong>Cần kiểm chứng:</strong><ul>${infoGaps}</ul></div>` : ""}
                        ${st.partial ? `<div style="margin-top:6px; color:#0369a1;">* Chưa tính giai đoạn nuôi tôm trong tổng nước ngọt.</div>` : ""}
                    </div>
                </details>
                <button type="button" class="card-report-btn" data-strategy="${st.id}" data-name="${cleanName(st.name_vi)}">Xem báo cáo cho phương án này →</button>
            </div>
        </article>`;
    }).join("");

    // Cập nhật chú giải tinh gọn
    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch" style="background:var(--c-${k});"></span>${CROP_NAMES[k]}</span>`);
    items.push(`<span class="legend-item"><span class="swatch" style="background:var(--c-bare);"></span>Đất trống</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span style="color:var(--sal); font-weight:700;">—</span>Tháng nước mặn</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");
}

function renderNdviStrip(data) {
    const el = document.getElementById("ndviStrip");
    const ndvi = Array.isArray(data.ndvi_monthly) ? data.ndvi_monthly : [];
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[m - 1]) ? Number(ndvi[m - 1]) : null;
        if (v === null) {
            html += `<div class="ndvi-cell na"><span>T${m}</span><b>–</b></div>`;
            continue;
        }
        const n = Math.max(0, Math.min(1, v));
        html += `<div class="ndvi-cell${n >= 0.5 ? " dark" : ""}" style="background: rgba(21, 128, 61, ${(0.08 + 0.85 * n).toFixed(2)})" title="Tháng ${m}: NDVI ${v.toFixed(2)}">
            <span>T${m}</span>
            <b>${v.toFixed(2).replace(".", ",")}</b>
        </div>`;
    }
    el.innerHTML = html;
    const p = REGIONS_DATA[currentRegion].ndvi_point;
    const yrs = data.ndvi_years ? `${data.ndvi_years[0]}–${data.ndvi_years[1]}` : "nhiều năm";
    document.getElementById("ndviNote").textContent =
        `Chỉ số NDVI từ vệ tinh MODIS, trung vị ô 3×3 km quanh điểm (${p.lat}, ${p.lon}), trung bình ${yrs}. Ô càng đậm là càng nhiều cây xanh; ô nhạt là ruộng trống hoặc ngập nước.`;
}

function renderAssumptionsBox(data) {
    const items = (data.assumptions || []).map(a => `<li>${a}</li>`);
    if (data.salinity_months_source) items.push(`<li><strong>Nguồn tháng mặn:</strong> ${data.salinity_months_source}</li>`);
    if (data.ndvi_years_source) items.push(`<li><strong>Năm dùng cho NDVI:</strong> ${data.ndvi_years_source}</li>`);
    if (data.display_rule) items.push(`<li><strong>Cách hiển thị lịch:</strong> ${data.display_rule}</li>`);
    document.getElementById("rotationAssumptionsBox").innerHTML =
        `<h3 class="card-heading" style="font-size:14.5px; margin-bottom:6px;">Giả định mô hình thủy văn & ranh giới dữ liệu</h3><ul class="muted" style="margin:0; padding-left:18px; font-size:13px; line-height:1.5;">${items.join("")}</ul>`;
}

// ==========================================================================
// BẢNG ĐÁNH GIÁ CÂY TRỒNG VỤ KHÔ
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

        const rows = crops.filter(c => isNum(c.deficit_mm));
        show("waterOnlyScoreNote", rows.some(c => (c.missing_components || []).some(n => n.startsWith("chưa tính mặn"))));

        tbody.innerHTML = rows.map((c, i) => {
            const note = c.missing_components && c.missing_components.length
                ? `<div class="muted" style="font-size:11.5px;">(${c.missing_components.join("; ")})</div>` : "";
            const win = c.season_window && c.season_window.start ? `${c.season_window.start} → ${c.season_window.end}` : "–";
            const v = c.water_vs_baseline_pct;
            const saved = !isNum(v) ? "–"
                : i === 0 ? "Mốc chuẩn"
                : v > 0 ? `<span style="color:var(--good); font-weight:700;">-${fmt(v, 1)}%</span>`
                : v < 0 ? `<span style="color:var(--bad); font-weight:700;">+${fmt(-v, 1)}%</span>` : "0%";
            let risk = `<span class="risk-tag risk-${c.risk_level}">${RISK_TEXT[c.risk_level] || c.risk_level}</span>`;
            if (c.score !== null && !isNum(c.exceed_ratio_r)) {
                risk = `<span class="muted">Chưa có ngưỡng chuẩn</span>`;
            }
            const salMissing = (c.missing_components || []).some(n => n.startsWith("chưa tính mặn"));
            if (c.components && c.components.salinity_exceed === null && salMissing) {
                risk = `<span class="muted">Chưa tính mặn</span>`;
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
// BÁO CÁO TƯ VẤN
// ==========================================================================
function resetReport() {
    document.getElementById("chatOutput").textContent = "Bấm nút để tạo báo cáo.";
}

function updateReportContext() {
    const el = document.getElementById("reportContext");
    if (!el) return;
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const w = (t === 0 && r === 0) ? "như trung bình 2015–2025" : `${t > 0 ? "+" : ""}${fmt(t, 1)} °C, mưa ${r > 0 ? "+" : ""}${r}%`;
    el.textContent = `Đang xem: ${REGIONS_DATA[currentRegion].name} · Thời tiết: ${w}${selectedStrategyName ? ` · Phương án: ${selectedStrategyName}` : ""}`;
}

async function loadReport() {
    updateReportContext();
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Đang tính...</em>";
    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...JSON.parse(scenarioBody()), strategy_id: selectedStrategy })
        });
        if (!res.ok) { outputEl.innerHTML = `<span class="txt-bad">Không tạo được báo cáo (mã ${res.status}).</span>`; return; }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
    } catch (e) {
        outputEl.innerHTML = `<span class="txt-bad">Không kết nối được máy chủ: ${e.message}</span>`;
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
        else if (t.startsWith("> ")) html += `<blockquote style="border-left:3px solid var(--primary); padding-left:10px; margin:6px 0; color:var(--muted);">${formatInline(t.substring(2))}</blockquote>`;
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
