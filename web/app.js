// AERO-AGRI Vanilla Client Controller — NASA Space Apps Challenge ("Field Shift")
// Hoàn toàn Offline-First; Thư viện đồ thị duy nhất là vendor/chartjs/chart.umd.js

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let baselineDeficits = {}; // Lưu trữ deficit cơ sở (0°C, 0%) để tính delta micro-feedback

// Thông tin vùng trọng điểm và tọa độ điểm ảnh vệ tinh MODIS NDVI
const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: "Vùng ven biển Ba Tri (Đồng bằng sông Cửu Long) · Trọng điểm lúa & xâm nhập mặn (vụ khô 11-01)",
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: "Vùng Cư M'gar (Tây Nguyên) · Trọng điểm cà phê vối & hạn hán mùa khô (04-30)",
        ndvi_point: { lat: 12.8314, lon: 108.1282 }
    }
};

const CROP_NAMES = {
    rice: "Lúa",
    shrimp: "Tôm sú (nước lợ)",
    soybean: "Đậu tương",
    maize: "Ngô",
    coffee: "Cà phê vối",
    coffee_cover_crop: "Cà phê + thảm cỏ che phủ",
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
// BỘ ICON INLINE SVG NỘI TUYẾN (KHÔNG PHỤ THUỘC MẠNG)
// ==========================================================================
function getSvgIcon(name, size = 16) {
    const icons = {
        water: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
        fallow: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        shield: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
        drop_sal: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M12 12v4"/><path d="M10 14h4"/></svg>`,
        heat: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
        check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        alert: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };
    return icons[name] || "";
}

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

// ---------- Tiện ích định dạng & kiểm tra ----------
function isNum(v) { return v !== null && v !== undefined && !Number.isNaN(Number(v)); }
function fmt(v, d = 0) { return isNum(v) ? Number(v).toLocaleString("vi-VN", { maximumFractionDigits: d }) : "chưa có"; }
function m3(mm) { return isNum(mm) ? fmt(mm * 10, 0) : "chưa có"; } // 1 mm / ha = 10 m³
function cropKey(crop) {
    if (crop === null || crop === undefined) return "shrimp";
    return KNOWN_CROPS.includes(crop) ? crop : "other";
}
function show(id, on) { const el = document.getElementById(id); if (el) el.hidden = !on; }
function cleanName(name) { return String(name || "").replace(/^Hiện trạng:\s*/, ""); }
function monthList(ms) { return ms.map(m => `tháng ${m}`).join(", "); }

// ==========================================================================
// ĐIỀU KHIỂN SỰ KIỆN & THANH TRƯỢT KỊCH BẢN
// ==========================================================================
function initControls() {
    // Chuyển vùng Bến Tre / Đắk Lắk
    document.querySelectorAll(".region-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRegion = btn.dataset.region;
            document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
            baselineDeficits = {}; // Reset baseline khi đổi vùng
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

    // Các nút preset kịch bản nhanh 1-chạm
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            sTemp.value = chip.dataset.temp;
            sRain.value = chip.dataset.rain;
            updateSliderLabels();
            syncPresetChipState();
            debouncedEvaluate();
        });
    });

    // Hỏi đáp
    const btnAsk = document.getElementById("btnAsk");
    const chatInput = document.getElementById("chatInput");
    btnAsk.addEventListener("click", () => sendQuestion(chatInput.value.trim()));
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendQuestion(chatInput.value.trim());
    });
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
        r === 0 ? "Như hiện nay" : (r > 0 ? `Nhiều hơn ${r}%` : `Hạn ${r}%`);
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
    if (simDebounceTimer) clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(() => {
        loadRotations();
        evaluateCrops();
    }, 280);
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

        updateChip("chip-power", "Khí hậu NASA POWER", latestRegionStatus.power, "ngày");
        updateChip("chip-ndvi", "Độ xanh MODIS NDVI", latestRegionStatus.ndvi, "ảnh");
        updateChip("chip-sm", "Độ ẩm đất SMAP", latestRegionStatus.soil_moisture, "dòng");
        updateChip("chip-sal", "Độ mặn", latestRegionStatus.salinity, "dòng");

        const isSynth = Object.values(latestRegionStatus).some(s => s && s.is_synthetic);
        document.getElementById("dataBadgeArea").innerHTML = isSynth
            ? `<div class="banner-warn" role="alert">${getSvgIcon("alert", 20)}<div><strong>Đang dùng dữ liệu mô phỏng.</strong> Vùng này chưa có dữ liệu quan trắc thật trong thư mục lưu trữ cục bộ.</div></div>`
            : "";
    } catch (e) {
        console.error("Lỗi cập nhật trạng thái dữ liệu:", e);
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

// ==========================================================================
// BIỂU ĐỒ KHÍ HẬU NASA POWER (MƯA vs. ETo)
// ==========================================================================
async function loadClimateChart() {
    try {
        const res = await fetch(`/api/climate?region=${encodeURIComponent(currentRegion)}`);
        const data = res.ok ? await res.json() : {};
        const series = (data.monthly_series || []).slice(-24);
        if (series.length === 0) {
            show("chartWrapper", false); show("climateEmpty", true);
            return;
        }
        show("chartWrapper", true); show("climateEmpty", false);

        const ndvi = series.map(s => s.ndvi_mean);
        const hasNdvi = ndvi.some(isNum);

        const datasets = [
            {
                type: "bar",
                label: "Mưa hữu hiệu (mm/tháng, USDA)",
                data: series.map(s => s.rain_sum_mm),
                backgroundColor: "rgba(3, 105, 161, 0.65)",
                borderRadius: 4,
                yAxisID: "y",
                order: 2
            },
            {
                type: "line",
                label: "Bốc thoát hơi nước ETo (mm/tháng, FAO-56)",
                data: series.map(s => s.eto_sum_mm),
                borderColor: "#b45309",
                backgroundColor: "#b45309",
                borderWidth: 2.5,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: "y",
                order: 1
            }
        ];

        if (hasNdvi) {
            datasets.push({
                type: "line",
                label: "Độ xanh diệp lục MODIS NDVI (0–1)",
                data: ndvi,
                borderColor: "#15803d",
                backgroundColor: "#15803d",
                borderWidth: 2,
                borderDash: [5, 4],
                pointRadius: 0,
                tension: 0.3,
                yAxisID: "y1",
                order: 0
            });
        }

        const scales = {
            x: {
                ticks: { color: "#4e5d52", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                grid: { display: false }
            },
            y: {
                ticks: { color: "#4e5d52" },
                grid: { color: "#e8ede4" },
                title: { display: true, text: "Lượng nước (mm / tháng)", color: "#4e5d52", font: { weight: "bold" } }
            }
        };

        if (hasNdvi) {
            scales.y1 = {
                position: "right",
                min: 0,
                max: 1,
                ticks: { color: "#15803d" },
                grid: { drawOnChartArea: false },
                title: { display: true, text: "Chỉ số NDVI", color: "#15803d", font: { weight: "bold" } }
            };
        }

        if (climateChart) climateChart.destroy();
        climateChart = new Chart(document.getElementById("climateChart").getContext("2d"), {
            data: { labels: series.map(s => s.month), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: "#17201a", usePointStyle: true, boxWidth: 8, font: { size: 13, weight: "bold" } }
                    }
                },
                scales
            }
        });
    } catch (e) {
        show("chartWrapper", false); show("climateEmpty", true);
    }
}

// ==========================================================================
// CÁC PHƯƠNG ÁN LUÂN CANH CẢ NĂM (ROTATIONS)
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
        renderStrategyCards(data, strategies);
        renderNdviStrip(data);
        renderAssumptionsBox(data);
    } catch (e) {
        show("rotationsContent", false); show("rotationsEmpty", true);
    }
}

// So sánh phương án với hiện trạng
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

function pill(c) {
    const icon = c.cls === "good" ? getSvgIcon("check", 13) : (c.cls === "bad" ? getSvgIcon("alert", 13) : "");
    return `<span class="pill pill-${c.cls}">${icon} ${c.text}</span>`;
}

function renderHero(data, strategies) {
    const base = strategies.find(s => s.is_existing);
    const alts = strategies.filter(s => !s.is_existing);
    const titleEl = document.getElementById("heroTitle");
    const bodyEl = document.getElementById("heroBody");
    if (!base) {
        titleEl.textContent = "Chưa xác định được cách canh tác hiện tại";
        bodyEl.innerHTML = "";
        return;
    }

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
                <div class="hero-stat-label">${getSvgIcon("water", 14)} Lượng nước ngọt phải tưới thêm mỗi năm</div>
            </div>
            <div class="hero-stat">
                <div class="hero-stat-value">${bareN} <small>tháng</small></div>
                <div class="hero-stat-label">${getSvgIcon("fallow", 14)} Ruộng không có cây che phủ mỗi năm${bareN ? ` (${monthList(base.bare_months)})` : ""}</div>
            </div>
        </div>
        ${sal.length ? `<div class="hero-note">${getSvgIcon("drop_sal", 15)} Mùa nước mặn xâm nhập tại vùng: ${monthList(sal)}.</div>` : ""}
        ${alts.length ? `<h2 class="hero-sub">Nếu chuyển đổi phương án (so với hiện trạng):</h2><ul class="hero-alts">${rows}</ul>` : ""}`;
}

// Gộp các tháng cùng pha
function calendarBlocks(calendar) {
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
    return blocks;
}

function renderCalendar(st, salMonths, usedCrops, flags) {
    const cropByLabel = {};
    (st.phases || []).forEach(ph => { cropByLabel[ph.label] = cropKey(ph.crop); });

    let head = "";
    for (let m = 1; m <= 12; m++) {
        const isSal = salMonths.has(m);
        head += `<div class="cal-m${isSal ? " sal" : ""}" ${isSal ? 'title="Tháng có xâm nhập mặn"' : ""}>Th${m}</div>`;
    }

    const blocks = calendarBlocks(st.calendar || []).map(b => {
        const span = b.months.length;
        const first = b.months[0].month, last = b.months[span - 1].month;
        const range = span > 1 ? `Tháng ${first} đến ${last}` : `Tháng ${first}`;
        const dots = b.months.map(mc => {
            const hot = isNum(mc.heat_ratio) && mc.heat_ratio > 0;
            if (hot) flags.heat = true;
            return `<span class="cal-slot">${hot ? `<span class="heat-dot" title="Tháng ${mc.month}: ${Math.round(mc.heat_ratio * 100)}% số ngày nắng nóng vượt ngưỡng sinh lý"></span>` : ""}</span>`;
        }).join("");

        const style = `grid-column: span ${span}; grid-template-columns: repeat(${span}, 1fr);`;
        if (b.bare) {
            return `<div class="cal-block bare" style="${style}" title="${range}: Ruộng trống không có cây che phủ">${dots}<span class="cal-label">${span >= 2 ? "Đất trống" : ""}</span></div>`;
        }

        const ck = cropByLabel[b.label] || "other";
        usedCrops.add(ck);
        return `<div class="cal-block crop-${ck}" style="${style}" title="${range}: ${b.label}">${dots}<span class="cal-label">${CROP_NAMES[ck] || b.label}</span></div>`;
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

        // Tính delta so với baseline của chính phương án này khi slider != 0
        let deltaBadgeHtml = "";
        const baseDefForSt = baselineDeficits[st.id];
        if (isNum(def) && isNum(baseDefForSt) && Math.abs(def - baseDefForSt) > 1.0) {
            const diffMm = def - baseDefForSt;
            const diffM3 = Math.round(diffMm * 10);
            if (diffM3 > 0) {
                deltaBadgeHtml = `<span class="scenario-delta-badge up" title="Tăng do thời tiết hạn nóng">+${fmt(diffM3)} m³/ha do kịch bản</span>`;
            } else if (diffM3 < 0) {
                deltaBadgeHtml = `<span class="scenario-delta-badge down" title="Giảm nhờ mưa nhiều">${fmt(diffM3)} m³/ha do kịch bản</span>`;
            }
        }

        const evidence = (st.evidence || []).map(ev =>
            `<li>${ev.text}<div class="cite">Nguồn: ${ev.source}${ev.verified === false ? ` <span class="tag-warn">chưa kiểm chứng</span>` : ""}</div></li>`).join("");

        const calc = (st.phases || []).map(ph => {
            const win = ph.window && ph.window.start ? ` (${ph.window.start} đến ${ph.window.end})` : "";
            if (!ph.modeled) {
                return `<li class="water-calc-item"><strong>${ph.label}</strong>${win}: chưa tính nước cho giai đoạn này.</li>`;
            }
            const extra = isNum(ph.assumed_extra_mm) && ph.assumed_extra_mm > 0
                ? ` + nước làm đất, giữ lớp nước và thấm ${fmt(ph.assumed_extra_mm)} mm <span class="tag-warn">loại đất giả định</span>` : "";
            return `<li class="water-calc-item"><strong>${ph.label}</strong>${win}: cây dùng ${fmt(ph.etc_mm)} mm${extra} − mưa giữ lại được ${fmt(ph.peff_mm)} mm = <strong>phải tưới ${fmt(ph.deficit_mm)} mm</strong></li>`;
        }).join("");

        // Callout "Khoa học trung thực": WASI Đắk Lắk (D1) hoặc Tôm sú nước lợ Bến Tre (S1)
        let scienceHonestyBox = "";
        if (st.id === "D1" || (currentRegion === "Dak_Lak_Tay_Nguyen" && !st.is_existing)) {
            scienceHonestyBox = `
            <div class="science-honesty-callout wasi">
                <div class="science-honesty-icon">${getSvgIcon("shield", 18)}</div>
                <div class="science-honesty-body">
                    <h4>Khoa học trung thực: Thực nghiệm WASI (Đắk Lắk) đối chiếu mô hình lý thuyết FAO-56</h4>
                    <p>Mô hình lý thuyết FAO-56 cộng hệ số cây trồng khiến lượng nước tính toán tăng (+67,2 mm). <strong>Tuy nhiên</strong>, thực nghiệm đồng ruộng của <strong>Viện KHKT Nông Lâm nghiệp Tây Nguyên (WASI - Quyết định 26/QĐ-VNLT-KHKH)</strong> chứng minh: thảm cỏ che phủ giúp <strong>giữ ẩm đất tăng 2,5% – 4,2%, giảm >65% xói mòn và tiết kiệm 20% – 25% lượng nước tưới thực tế</strong> nhờ ngăn bốc hơi mặt đất trần.</p>
                </div>
            </div>`;
        } else if (st.partial || st.id === "S1") {
            scienceHonestyBox = `
            <div class="science-honesty-callout shrimp">
                <div class="science-honesty-icon">${getSvgIcon("drop_sal", 18)}</div>
                <div class="science-honesty-body">
                    <h4>Thuận thiên theo mặn: Pha tôm sú sử dụng nước lợ tự nhiên</h4>
                    <p>Giai đoạn tôm sú (tháng 3 đến tháng 7) lấy nguồn nước mặn/lợ tự nhiên vào ruộng nuôi thủy sản, <strong>hoàn toàn không tiêu tốn nước ngọt tưới cây</strong>. Do đó chỉ số trên <strong>chỉ tính giai đoạn lúa mùa mưa</strong> (chưa tính giai đoạn nuôi tôm).</p>
                </div>
            </div>`;
        }

        return `
        <article class="card strategy${st.is_existing ? " is-existing" : ""}" data-strategy-id="${st.id}">
            <header class="strategy-head">
                <div class="strategy-title-group">
                    <span class="strategy-num-badge">
                        ${i === 0 && st.is_existing ? "Hiện nay (Đối chứng)" : `Phương án ${i} (Đề xuất)`}
                    </span>
                    <h3 class="strategy-title">${cleanName(st.name_vi)}</h3>
                </div>
                ${cmp ? `<div class="pills">${cmp.map(pill).join("")}</div>` : ""}
            </header>

            <p class="strategy-why">${st.why}</p>

            ${renderCalendar(st, salMonths, usedCrops, flags)}

            <div class="metrics">
                <div class="metric">
                    <div class="metric-label">Lượng nước ngọt phải tưới thêm mỗi năm</div>
                    <div class="metric-value-wrap">
                        <div class="metric-value">${m3(def)} <small>m³/ha</small>${st.partial ? "<sup>*</sup>" : ""}</div>
                        ${deltaBadgeHtml}
                    </div>
                    <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${pct}%"></div></div>
                    <div class="metric-sub">${fmt(def)} mm${st.partial ? " · * chưa tính giai đoạn nuôi tôm" : ""}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Thời gian ruộng không có cây che phủ</div>
                    <div class="metric-value-wrap">
                        <div class="metric-value">${bareN} <small>tháng / năm</small></div>
                    </div>
                    <div class="metric-sub">${bareN ? monthList(st.bare_months) : "Có cây che phủ mặt đất quanh năm"}</div>
                </div>
            </div>

            ${scienceHonestyBox}

            <div class="two-col">
                ${st.benefits && st.benefits.length ? `<div class="box box-good"><h4>${getSvgIcon("check", 15)} Lợi ích nổi bật</h4><ul>${li(st.benefits)}</ul></div>` : ""}
                ${st.risks && st.risks.length ? `<div class="box box-risk"><h4>${getSvgIcon("alert", 15)} Rủi ro cần kiểm tra ngoài đồng</h4><ul>${li(st.risks)}</ul></div>` : ""}
            </div>

            <details class="more">
                <summary>Xem nguồn trích dẫn, công thức tính và thông tin còn thiếu</summary>
                ${evidence ? `<h4>Bằng chứng & Nguồn xác thực</h4><ul>${evidence}</ul>` : ""}
                ${calc ? `<h4>Công thức cân bằng nước từng pha (trung bình các năm)</h4><ul class="water-calc-list">${calc}</ul>` : ""}
                ${st.info_gaps && st.info_gaps.length ? `<h4>Thông tin cần kiểm chứng thêm</h4><ul>${li(st.info_gaps)}</ul>` : ""}
            </details>
        </article>`;
    }).join("");

    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch crop-${k}"></span>${CROP_NAMES[k]}</span>`);
    items.push(`<span class="legend-item"><span class="swatch bare"></span>Ruộng trống</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span class="swatch sal"></span>Tháng xâm nhập mặn</span>`);
    if (flags.heat) items.push(`<span class="legend-item"><span class="heat-dot"></span>Có ngày nắng nóng vượt ngưỡng</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");
}

function renderNdviStrip(data) {
    const el = document.getElementById("ndviStrip");
    const ndvi = data.ndvi_monthly || {};
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[String(m)]) ? Number(ndvi[String(m)]) : (isNum(ndvi[m]) ? Number(ndvi[m]) : null);
        if (v === null) {
            html += `<div class="ndvi-cell na"><span>Th${m}</span><b>–</b></div>`;
            continue;
        }
        const n = Math.max(0, Math.min(1, v));
        const pctBar = Math.round(n * 100);
        html += `<div class="ndvi-cell${n >= 0.5 ? " dark" : ""}" style="background: rgba(21, 128, 61, ${(0.08 + 0.85 * n).toFixed(2)})" title="Tháng ${m}: NDVI ${v.toFixed(2)} (MODIS)">
            <span>Th${m}</span>
            <b>${v.toFixed(2).replace(".", ",")}</b>
            <div class="ndvi-mini-bar"><div class="ndvi-mini-bar-fill" style="width: ${pctBar}%"></div></div>
        </div>`;
    }
    el.innerHTML = html;
    const p = REGIONS_DATA[currentRegion].ndvi_point;
    document.getElementById("ndviNote").textContent =
        `Chỉ số NDVI từ vệ tinh MODIS MOD13Q1 tại điểm (${p.lat}, ${p.lon}), chuỗi quan sát 2015–2025. Ô càng đậm là tán cây phủ càng dày; ô nhạt là ruộng trống hoặc ngập nước.`;
}

function renderAssumptionsBox(data) {
    const items = (data.assumptions || []).map(a => `<li>${a}</li>`);
    if (data.salinity_months_source) items.push(`<li><strong>Nguồn tháng mặn:</strong> ${data.salinity_months_source}</li>`);
    if (data.display_rule) items.push(`<li><strong>Cách tô lịch 12 tháng:</strong> ${data.display_rule}</li>`);
    document.getElementById("rotationAssumptionsBox").innerHTML =
        `<h3 class="card-heading">Giả định của mô hình tính toán</h3><ul class="plain-list">${items.join("")}</ul>`;
}

// ==========================================================================
// BẢNG ĐÁNH GIÁ CÂY TRỒNG MÙA KHÔ
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

        show("waterOnlyScoreNote", crops.length > 0 && crops.every(c =>
            c.components && c.components.heat_ratio === null && c.components.salinity_exceed === null));

        tbody.innerHTML = crops.map((c, i) => {
            const note = c.missing_components && c.missing_components.length
                ? `<div class="td-note">Lưu ý: ${c.missing_components.join("; ")}</div>` : "";
            const win = c.season_window && c.season_window.start ? `${c.season_window.start} đến ${c.season_window.end}` : "chưa có";
            const v = c.water_vs_baseline_pct;
            const saved = !isNum(v) ? "chưa có"
                : i === 0 ? "Mốc so sánh"
                : v > 0 ? `<span class="txt-good">tiết kiệm ${fmt(v, 1)}%</span>`
                : v < 0 ? `<span class="txt-bad">tốn hơn ${fmt(-v, 1)}%</span>` : "như nhau";
            let risk = `<span class="risk risk-${c.risk_level}">${RISK_TEXT[c.risk_level] || c.risk_level}</span>`;
            if (c.score !== null && !isNum(c.exceed_ratio_r)) {
                risk = `<span class="muted">Chưa đánh giá (chưa có ngưỡng có nguồn)</span>`;
            }
            return `<tr>
                <td><strong>${c.crop_name}</strong>${note}</td>
                <td class="nowrap">${win}</td>
                <td class="nowrap">${isNum(c.deficit_mm) ? `${m3(c.deficit_mm)} m³/ha <span class="muted">(${fmt(c.deficit_mm, 1)} mm)</span>` : "chưa có"}</td>
                <td>${saved}</td>
                <td>${isNum(c.score) ? `<strong>${fmt(c.score, 1)}</strong>` : `<span class="muted nowrap">chưa chấm</span>`}</td>
                <td>${risk}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        show("cropTableWrapper", false); show("evaluateEmpty", true);
    }
}

// ==========================================================================
// HỎI ĐÁP CHUYÊN GIA (DETERMINISTIC ADVOCACY)
// ==========================================================================
async function sendQuestion(question) {
    if (!question) return;
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Đang tổng hợp câu trả lời từ dữ liệu vệ tinh...</em>";
    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ region: currentRegion, question })
        });
        if (!res.ok) {
            outputEl.innerHTML = `<span class="txt-bad">Không lấy được câu trả lời từ hệ thống (mã ${res.status}).</span>`;
            return;
        }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
    } catch (e) {
        outputEl.innerHTML = `<span class="txt-bad">Không kết nối được máy chủ tính toán: ${e.message}</span>`;
    }
}

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
