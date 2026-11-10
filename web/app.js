// AERO-AGRI Vanilla Client Controller
// Chạy offline hoàn toàn; thư viện duy nhất là Chart.js trong vendor/

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;

const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: "Ruộng lúa gần chợ Mỹ Nhơn, huyện Ba Tri cũ (nay thuộc tỉnh Vĩnh Long)",
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: "Vườn cà phê gần Quảng Phú, huyện Cư M'gar cũ, Đắk Lắk",
        ndvi_point: { lat: 12.8314, lon: 108.1282 }
    }
};

const CROP_NAMES = {
    rice: "Lúa", shrimp: "Tôm", soybean: "Đậu tương", maize: "Ngô",
    coffee: "Cà phê", coffee_cover_crop: "Cà phê + cây phủ đất", other: "Cây khác"
};
const KNOWN_CROPS = Object.keys(CROP_NAMES);

const RISK_TEXT = {
    LOW: "Thấp", MODERATE: "Trung bình", SEVERE: "Cao", CRITICAL: "Rất cao",
    INSUFFICIENT_DATA: "Chưa đủ dữ liệu"
};

document.addEventListener("DOMContentLoaded", () => {
    const q = new URLSearchParams(location.search).get("region"); // link thẳng tới vùng: ?region=Dak_Lak_Tay_Nguyen
    if (REGIONS_DATA[q]) currentRegion = q;
    document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.region === currentRegion)));
    initControls();
    loadRegionData();
});

// ---------- Tiện ích ----------
function isNum(v) { return v !== null && v !== undefined && !Number.isNaN(Number(v)); }
function fmt(v, d = 0) { return isNum(v) ? Number(v).toLocaleString("vi-VN", { maximumFractionDigits: d }) : "chưa có"; }
function m3(mm) { return isNum(mm) ? fmt(mm * 10, 0) : "chưa có"; } // 1 mm trên 1 ha = 10 m³
function cropKey(crop) {
    if (crop === null || crop === undefined) return "shrimp";
    return KNOWN_CROPS.includes(crop) ? crop : "other";
}
function show(id, on) { const el = document.getElementById(id); if (el) el.hidden = !on; }
function cleanName(name) { return String(name || "").replace(/^Hiện trạng:\s*/, ""); }
function monthList(ms) { return ms.map(m => `tháng ${m}`).join(", "); }

// ---------- Điều khiển ----------
function initControls() {
    document.querySelectorAll(".region-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRegion = btn.dataset.region;
            document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
            loadRegionData();
        });
    });

    const sTemp = document.getElementById("sliderTemp");
    const sRain = document.getElementById("sliderRain");
    sTemp.addEventListener("input", () => { updateSliderLabels(); debouncedEvaluate(); });
    sRain.addEventListener("input", () => { updateSliderLabels(); debouncedEvaluate(); });
    document.getElementById("btnReset").addEventListener("click", () => {
        sTemp.value = "0"; sRain.value = "0";
        updateSliderLabels(); debouncedEvaluate();
    });

    const btnAsk = document.getElementById("btnAsk");
    const chatInput = document.getElementById("chatInput");
    btnAsk.addEventListener("click", () => sendQuestion(chatInput.value.trim()));
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendQuestion(chatInput.value.trim()); });
    document.querySelectorAll(".prompt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            chatInput.value = btn.dataset.q;
            sendQuestion(btn.dataset.q);
        });
    });
}

function updateSliderLabels() {
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.getElementById("valTemp").textContent =
        t === 0 ? "Như hiện nay" : (t > 0 ? `Nóng hơn ${fmt(t, 1)} °C` : `Mát hơn ${fmt(-t, 1)} °C`);
    document.getElementById("valRain").textContent =
        r === 0 ? "Như hiện nay" : (r > 0 ? `Nhiều hơn ${r}%` : `Ít hơn ${-r}%`);
}

function scenarioBody() {
    return JSON.stringify({
        region: currentRegion,
        delta_temp_c: parseFloat(document.getElementById("sliderTemp").value),
        delta_rain_pct: parseFloat(document.getElementById("sliderRain").value)
    });
}

function debouncedEvaluate() {
    if (simDebounceTimer) clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(() => { loadRotations(); evaluateCrops(); }, 300);
}

// ---------- Trạng thái dữ liệu ----------
async function updateStatusBar() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const status = await res.json();
        latestRegionStatus = status[currentRegion] || {};

        updateChip("chip-power", "Khí hậu NASA POWER", latestRegionStatus.power, "ngày");
        updateChip("chip-ndvi", "Độ xanh MODIS NDVI", latestRegionStatus.ndvi, "ảnh");
        updateChip("chip-sm", "Độ ẩm đất SMAP", latestRegionStatus.soil_moisture, "dòng");
        updateChip("chip-sal", "Độ mặn", latestRegionStatus.salinity, "dòng");

        const isSynth = Object.values(latestRegionStatus).some(s => s && s.is_synthetic);
        document.getElementById("dataBadgeArea").innerHTML = isSynth
            ? `<div class="banner-warn" role="alert"><strong>Đang dùng dữ liệu mẫu.</strong> Số liệu dưới đây chỉ để thử giao diện, không phải số đo thật.</div>`
            : "";
    } catch (e) {
        console.error("Lỗi cập nhật trạng thái:", e);
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
        el.textContent = `${label}: dữ liệu thật (${fmt(info.rows)} ${unit})`;
    }
}

async function loadRegionData() {
    const reg = REGIONS_DATA[currentRegion];
    document.getElementById("heroPlace").textContent = `${reg.name} · ${reg.place}`;
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

// ---------- Biểu đồ khí hậu ----------
async function loadClimateChart() {
    try {
        const res = await fetch(`/api/climate?region=${encodeURIComponent(currentRegion)}`);
        const data = res.ok ? await res.json() : {};
        const series = (data.monthly_series || []).slice(-24);
        if (series.length === 0) { show("chartWrapper", false); show("climateEmpty", true); return; }
        show("chartWrapper", true); show("climateEmpty", false);

        const ndvi = series.map(s => s.ndvi_mean);
        const hasNdvi = ndvi.some(isNum);
        const datasets = [
            { type: "bar", label: "Mưa (mm/tháng)", data: series.map(s => s.rain_sum_mm),
              backgroundColor: "rgba(3, 105, 161, 0.55)", borderRadius: 3, yAxisID: "y", order: 2 },
            { type: "line", label: "Nước bốc hơi ETo (mm/tháng)", data: series.map(s => s.eto_sum_mm),
              borderColor: "#b45309", backgroundColor: "#b45309", borderWidth: 3, pointRadius: 0, tension: 0.3, yAxisID: "y", order: 1 }
        ];
        if (hasNdvi) {
            datasets.push({ type: "line", label: "Độ xanh NDVI (0–1)", data: ndvi,
                borderColor: "#15803d", backgroundColor: "#15803d", borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.3, yAxisID: "y1", order: 0 });
        }
        const scales = {
            x: { ticks: { color: "#4b5563", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
            y: { ticks: { color: "#4b5563" }, grid: { color: "#e5e7eb" }, title: { display: true, text: "mm / tháng", color: "#4b5563" } }
        };
        if (hasNdvi) {
            scales.y1 = { position: "right", min: 0, max: 1, ticks: { color: "#15803d" }, grid: { drawOnChartArea: false },
                          title: { display: true, text: "NDVI", color: "#15803d" } };
        }

        if (climateChart) climateChart.destroy();
        climateChart = new Chart(document.getElementById("climateChart").getContext("2d"), {
            data: { labels: series.map(s => s.month), datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { position: "bottom", labels: { color: "#111827", usePointStyle: true, boxWidth: 10, font: { size: 13 } } } },
                scales
            }
        });
    } catch (e) {
        show("chartWrapper", false); show("climateEmpty", true);
    }
}

// ---------- Các phương án luân canh ----------
async function loadRotations() {
    try {
        const res = await fetch("/api/rotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: scenarioBody() });
        if (!res.ok) { show("rotationsContent", false); show("rotationsEmpty", true); return; }
        const data = await res.json();
        show("rotationsContent", true); show("rotationsEmpty", false);
        const strategies = (data.strategies || []).slice().sort((a, b) => (b.is_existing ? 1 : 0) - (a.is_existing ? 1 : 0));
        renderHero(data, strategies);
        renderStrategyCards(data, strategies);
        renderNdviStrip(data);
        renderAssumptionsBox(data);
    } catch (e) {
        show("rotationsContent", false); show("rotationsEmpty", true);
    }
}

// So sánh một phương án với hiện trạng, trả về câu chữ dễ hiểu
function compareText(st, base) {
    if (!base || st === base) return null;
    let water;
    if (st.partial) {
        water = { cls: "neutral", text: "Nước: chưa so được đầy đủ (chưa tính giai đoạn nuôi tôm)" };
    } else if (isNum(st.annual_deficit_mm) && isNum(base.annual_deficit_mm) && base.annual_deficit_mm > 0) {
        const pct = Math.round((st.annual_deficit_mm - base.annual_deficit_mm) / base.annual_deficit_mm * 100);
        water = pct < 0 ? { cls: "good", text: `Nước tưới: ít hơn ${-pct}%` }
              : pct > 0 ? { cls: "bad", text: `Nước tưới: nhiều hơn ${pct}%` }
              : { cls: "neutral", text: "Nước tưới: như hiện nay" };
    }
    const d = (st.bare_months || []).length - (base.bare_months || []).length;
    const bare = d < 0 ? { cls: "good", text: `Ruộng trống: ít hơn ${-d} tháng` }
               : d > 0 ? { cls: "bad", text: `Ruộng trống: nhiều hơn ${d} tháng` }
               : { cls: "neutral", text: "Ruộng trống: như hiện nay" };
    return [water, bare].filter(Boolean);
}

function pill(c) { return `<span class="pill pill-${c.cls}">${c.text}</span>`; }

function renderHero(data, strategies) {
    const base = strategies.find(s => s.is_existing);
    const alts = strategies.filter(s => !s.is_existing);
    const titleEl = document.getElementById("heroTitle");
    const bodyEl = document.getElementById("heroBody");
    if (!base) { titleEl.textContent = "Chưa xác định được cách canh tác hiện tại"; bodyEl.innerHTML = ""; return; }

    const bareN = (base.bare_months || []).length;
    const nm = cleanName(base.name_vi);
    titleEl.textContent = `Hiện nay: ${nm.charAt(0).toUpperCase()}${nm.slice(1)}`;

    const rows = alts.map(st => `
        <li>
            <span class="hero-alt-name">${st.name_vi}</span>
            <span class="pills">${(compareText(st, base) || []).map(pill).join("")}</span>
        </li>`).join("");

    const sal = (data.salinity_months || []).map(Number);
    bodyEl.innerHTML = `
        <div class="hero-stats">
            <div class="hero-stat">
                <div class="hero-stat-value">${m3(base.annual_deficit_mm)} <small>m³/ha</small></div>
                <div class="hero-stat-label">nước ngọt phải tưới thêm mỗi năm</div>
            </div>
            <div class="hero-stat">
                <div class="hero-stat-value">${bareN} <small>tháng</small></div>
                <div class="hero-stat-label">ruộng không có cây mỗi năm${bareN ? ` (${monthList(base.bare_months)})` : ""}</div>
            </div>
        </div>
        ${sal.length ? `<p class="hero-note">Mùa nước mặn xâm nhập: ${monthList(sal)}.</p>` : ""}
        ${alts.length ? `<h2 class="hero-sub">Nếu đổi cách làm, so với hiện nay</h2><ul class="hero-alts">${rows}</ul>` : ""}`;
}

// Gộp các tháng liền nhau cùng pha thành một thanh
function calendarBlocks(calendar) {
    const blocks = [];
    calendar.forEach(mc => {
        const key = mc.bare ? "__bare__" : (mc.phase_label || "");
        const last = blocks[blocks.length - 1];
        if (last && last.key === key) last.months.push(mc);
        else blocks.push({ key, bare: !!mc.bare, label: mc.phase_label, months: [mc] });
    });
    return blocks;
}

function renderCalendar(st, salMonths, usedCrops, flags) {
    const cropByLabel = {};
    (st.phases || []).forEach(ph => { cropByLabel[ph.label] = cropKey(ph.crop); });

    let head = "";
    for (let m = 1; m <= 12; m++) {
        head += `<div class="cal-m${salMonths.has(m) ? " sal" : ""}" ${salMonths.has(m) ? 'title="Tháng nước mặn"' : ""}>Th${m}</div>`;
    }

    const blocks = calendarBlocks(st.calendar || []).map(b => {
        const span = b.months.length;
        const first = b.months[0].month, last = b.months[span - 1].month;
        const range = span > 1 ? `tháng ${first} đến ${last}` : `tháng ${first}`;
        const dots = b.months.map(mc => {
            const hot = isNum(mc.heat_ratio) && mc.heat_ratio > 0;
            if (hot) flags.heat = true;
            return `<span class="cal-slot">${hot ? `<span class="heat-dot" title="Tháng ${mc.month}: ${Math.round(mc.heat_ratio * 100)}% số ngày nóng quá ngưỡng của cây"></span>` : ""}</span>`;
        }).join("");
        const style = `grid-column: span ${span}; grid-template-columns: repeat(${span}, 1fr);`;
        if (b.bare) {
            return `<div class="cal-block bare" style="${style}" title="${range}: ruộng trống">${dots}<span class="cal-label">${span >= 2 ? "Trống" : ""}</span></div>`;
        }
        const ck = cropByLabel[b.label] || "other";
        usedCrops.add(ck);
        return `<div class="cal-block crop-${ck}" style="${style}" title="${range}: ${b.label}">${dots}<span class="cal-label">${CROP_NAMES[ck]}</span></div>`;
    }).join("");

    return `<div class="cal-scroll"><div class="cal"><div class="cal-row">${head}</div><div class="cal-row">${blocks}</div></div></div>`;
}

function renderStrategyCards(data, strategies) {
    const grid = document.getElementById("rotationCardsGrid");
    const base = strategies.find(s => s.is_existing);
    const salMonths = new Set((data.salinity_months || []).map(Number));
    const maxDef = Math.max(1, ...strategies.map(s => isNum(s.annual_deficit_mm) ? s.annual_deficit_mm : 0));
    const usedCrops = new Set();
    const flags = { heat: false };

    grid.innerHTML = strategies.map((st, i) => {
        const bareN = (st.bare_months || []).length;
        const def = st.annual_deficit_mm;
        const pct = isNum(def) ? Math.round(def / maxDef * 100) : 0;
        const cmp = compareText(st, base);
        const li = arr => (arr || []).map(x => `<li>${x}</li>`).join("");

        const evidence = (st.evidence || []).map(ev =>
            `<li>${ev.text}<div class="cite">Nguồn: ${ev.source}${ev.verified === false ? ` <span class="tag-warn">chưa kiểm chứng</span>` : ""}</div></li>`).join("");

        const calc = (st.phases || []).map(ph => {
            const win = ph.window && ph.window.start ? ` (${ph.window.start} đến ${ph.window.end})` : "";
            if (!ph.modeled) return `<li><strong>${ph.label}</strong>${win}: chưa tính nước cho giai đoạn này.</li>`;
            const extra = isNum(ph.assumed_extra_mm) && ph.assumed_extra_mm > 0
                ? ` + nước làm đất, giữ lớp nước và thấm ${fmt(ph.assumed_extra_mm)} mm <span class="tag-warn">loại đất giả định</span>` : "";
            return `<li><strong>${ph.label}</strong>${win}: cây dùng ${fmt(ph.etc_mm)} mm${extra} − mưa giữ lại được ${fmt(ph.peff_mm)} mm = <strong>phải tưới ${fmt(ph.deficit_mm)} mm</strong></li>`;
        }).join("");

        return `
        <article class="card strategy${st.is_existing ? " is-existing" : ""}" data-strategy-id="${st.id}">
            <header class="strategy-head">
                <span class="strategy-num">${i === 0 && st.is_existing ? "Hiện nay" : `Phương án ${i}`}</span>
                <h3 class="strategy-title">${cleanName(st.name_vi)}</h3>
                ${cmp ? `<div class="pills">${cmp.map(pill).join("")}</div>` : ""}
            </header>

            <p class="strategy-why">${st.why}</p>

            ${renderCalendar(st, salMonths, usedCrops, flags)}

            <div class="metrics">
                <div class="metric">
                    <div class="metric-label">Nước ngọt phải tưới thêm mỗi năm</div>
                    <div class="metric-value">${m3(def)} <small>m³/ha</small>${st.partial ? "<sup>*</sup>" : ""}</div>
                    <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${pct}%"></div></div>
                    <div class="metric-sub">${fmt(def)} mm${st.partial ? " · * chưa tính giai đoạn nuôi tôm" : ""}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Ruộng không có cây</div>
                    <div class="metric-value">${bareN} <small>tháng / năm</small></div>
                    <div class="metric-sub">${bareN ? monthList(st.bare_months) : "Có cây quanh năm"}</div>
                </div>
            </div>

            <div class="two-col">
                ${st.benefits && st.benefits.length ? `<div class="box box-good"><h4>Lợi ích</h4><ul>${li(st.benefits)}</ul></div>` : ""}
                ${st.risks && st.risks.length ? `<div class="box box-risk"><h4>Rủi ro cần kiểm tra cùng nông dân, chuyên gia</h4><ul>${li(st.risks)}</ul></div>` : ""}
            </div>

            <details class="more">
                <summary>Xem nguồn, cách tính và điều còn thiếu</summary>
                ${evidence ? `<h4>Bằng chứng</h4><ul>${evidence}</ul>` : ""}
                ${calc ? `<h4>Cách tính nước (trung bình các năm)</h4><ul>${calc}</ul>` : ""}
                ${st.info_gaps && st.info_gaps.length ? `<h4>Thông tin còn thiếu</h4><ul>${li(st.info_gaps)}</ul>` : ""}
            </details>
        </article>`;
    }).join("");

    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch crop-${k}"></span>${CROP_NAMES[k]}</span>`);
    items.push(`<span class="legend-item"><span class="swatch bare"></span>Ruộng trống</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span class="swatch sal"></span>Tháng nước mặn</span>`);
    if (flags.heat) items.push(`<span class="legend-item"><span class="heat-dot"></span>Có ngày nóng quá ngưỡng của cây</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");
}

function renderNdviStrip(data) {
    const el = document.getElementById("ndviStrip");
    const ndvi = data.ndvi_monthly || {};
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[String(m)]) ? Number(ndvi[String(m)]) : (isNum(ndvi[m]) ? Number(ndvi[m]) : null);
        if (v === null) { html += `<div class="ndvi-cell na"><span>Th${m}</span><b>–</b></div>`; continue; }
        const n = Math.max(0, Math.min(1, v));
        html += `<div class="ndvi-cell${n >= 0.5 ? " dark" : ""}" style="background: rgba(21, 128, 61, ${(0.08 + 0.85 * n).toFixed(2)})" title="Tháng ${m}: NDVI ${v.toFixed(2)}"><span>Th${m}</span><b>${v.toFixed(2).replace(".", ",")}</b></div>`;
    }
    el.innerHTML = html;
    const p = REGIONS_DATA[currentRegion].ndvi_point;
    document.getElementById("ndviNote").textContent =
        `Chỉ số NDVI từ vệ tinh MODIS tại điểm (${p.lat}, ${p.lon}), trung bình nhiều năm. Ô càng đậm là càng nhiều cây xanh; ô nhạt là ruộng trống hoặc ngập nước.`;
}

function renderAssumptionsBox(data) {
    const items = (data.assumptions || []).map(a => `<li>${a}</li>`);
    if (data.salinity_months_source) items.push(`<li><strong>Nguồn tháng mặn:</strong> ${data.salinity_months_source}</li>`);
    if (data.display_rule) items.push(`<li><strong>Cách tô lịch 12 tháng:</strong> ${data.display_rule}</li>`);
    document.getElementById("rotationAssumptionsBox").innerHTML =
        `<h3 class="card-heading">Giả định của mô hình</h3><ul class="plain-list">${items.join("")}</ul>`;
}

// ---------- Bảng đánh giá từng cây ----------
async function evaluateCrops() {
    const tbody = document.getElementById("cropTableBody");
    try {
        const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: scenarioBody() });
        if (!res.ok) { show("cropTableWrapper", false); show("evaluateEmpty", true); return; }
        const crops = (await res.json()).crops || [];
        show("cropTableWrapper", true); show("evaluateEmpty", false);

        show("waterOnlyScoreNote", crops.length > 0 && crops.every(c =>
            c.components && c.components.heat_ratio === null && c.components.salinity_exceed === null));

        tbody.innerHTML = crops.map((c, i) => {
            const note = c.missing_components && c.missing_components.length
                ? `<div class="td-note">Lưu ý: ${c.missing_components.join("; ")}</div>` : "";
            const win = c.season_window && c.season_window.start ? `${c.season_window.start} đến ${c.season_window.end}` : "chưa có";
            const v = c.water_vs_baseline_pct;
            const saved = !isNum(v) ? "chưa có"
                : i === 0 ? "Mốc so sánh"
                : v > 0 ? `<span class="txt-good">ít hơn ${fmt(v, 1)}%</span>`
                : v < 0 ? `<span class="txt-bad">nhiều hơn ${fmt(-v, 1)}%</span>` : "như nhau";
            let risk = `<span class="risk risk-${c.risk_level}">${RISK_TEXT[c.risk_level] || c.risk_level}</span>`;
            if (c.score !== null && !isNum(c.exceed_ratio_r)) risk = `<span class="muted">Chưa đánh giá (chưa có ngưỡng có nguồn)</span>`;
            return `<tr>
                <td><strong>${c.crop_name}</strong>${note}</td>
                <td class="nowrap">${win}</td>
                <td class="nowrap">${isNum(c.deficit_mm) ? `${m3(c.deficit_mm)} m³/ha <span class="muted">(${fmt(c.deficit_mm, 1)} mm)</span>` : "chưa có"}</td>
                <td>${saved}</td>
                <td>${isNum(c.score) ? fmt(c.score, 1) : `<span class="muted nowrap">chưa chấm</span>`}</td>
                <td>${risk}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        show("cropTableWrapper", false); show("evaluateEmpty", true);
    }
}

// ---------- Hỏi đáp ----------
async function sendQuestion(question) {
    if (!question) return;
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Đang tính...</em>";
    try {
        const res = await fetch("/api/advise", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ region: currentRegion, question })
        });
        if (!res.ok) { outputEl.innerHTML = `<span class="txt-bad">Không lấy được câu trả lời (mã ${res.status}).</span>`; return; }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
    } catch (e) {
        outputEl.innerHTML = `<span class="txt-bad">Không kết nối được máy chủ: ${e.message}</span>`;
    }
}

// Trình đọc markdown đơn giản tự viết (không dùng thư viện ngoài)
function renderSimpleMarkdown(md) {
    if (!md) return "";
    let html = "";
    let inTable = false;
    md.split("\n").forEach(line => {
        const t = line.trim();
        if (t.startsWith("|")) {
            if (!inTable) { inTable = true; html += "<div class=\"table-scroll\"><table><tbody>"; }
            if (t.includes("---")) return;
            html += "<tr>" + t.split("|").slice(1, -1).map(c => `<td>${formatInline(c.trim())}</td>`).join("") + "</tr>";
            return;
        } else if (inTable) { inTable = false; html += "</tbody></table></div>"; }

        if (t.startsWith("### ")) html += `<h3>${formatInline(t.substring(4))}</h3>`;
        else if (t.startsWith("#### ")) html += `<h4>${formatInline(t.substring(5))}</h4>`;
        else if (t.startsWith("> ")) html += `<blockquote>${formatInline(t.substring(2))}</blockquote>`;
        else if (t.startsWith("- ")) html += `<ul><li>${formatInline(t.substring(2))}</li></ul>`;
        else if (t.startsWith("---")) html += `<hr>`;
        else if (t !== "") html += `<p>${formatInline(t)}</p>`;
    });
    if (inTable) html += "</tbody></table></div>";
    return html;
}

function formatInline(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
}
