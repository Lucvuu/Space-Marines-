// AERO-AGRI Client Controller — NASA Space Apps Challenge (Field Shift)
// Thiết kế Swiss Editorial & Modern SaaS Copilot · 100% Offline-First

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let baselineDeficits = {}; // Lưu trữ deficit cơ sở (0°C, 0%) để tính delta

// Thông tin vùng trọng điểm và tọa độ điểm ảnh vệ tinh MODIS NDVI
const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: "Ba Tri (Đồng bằng sông Cửu Long) · Trọng điểm hạn mặn vụ khô 11-01",
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: "Cư M'gar (Tây Nguyên) · Trọng điểm hạn hán mùa khô 04-30",
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
function cleanName(name) { return String(name || "").replace(/^Hiện trạng:\s*/, ""); }
function monthList(ms) { return ms.map(m => `tháng ${m}`).join(", "); }

// ==========================================================================
// ĐIỀU KHIỂN SỰ KIỆN & THANH TRƯỢT
// ==========================================================================
function initControls() {
    // Chuyển vùng Bến Tre / Đắk Lắk
    document.querySelectorAll(".region-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRegion = btn.dataset.region;
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

    // Hỏi đáp Trợ lý AI
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

    // Nút Floating AI Pill
    const floatingBtn = document.getElementById("floatingAiBtn");
    if (floatingBtn) {
        floatingBtn.addEventListener("click", () => {
            document.getElementById("aiSection").scrollIntoView({ behavior: "smooth" });
            chatInput.focus();
        });
    }
}

function updateSliderLabels() {
    const t = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.getElementById("valTemp").textContent =
        t === 0 ? "Như hiện nay" : (t > 0 ? `+${fmt(t, 1)} °C` : `${fmt(t, 1)} °C`);
    document.getElementById("valRain").textContent =
        r === 0 ? "Như hiện nay" : (r > 0 ? `+${r}%` : `${r}%`);

    // Cập nhật trạng thái ngữ cảnh trên khung AI
    const contextEl = document.getElementById("aiContextBadge");
    if (contextEl) {
        const regName = REGIONS_DATA[currentRegion].name;
        const weatherTxt = (t === 0 && r === 0) ? "Đo đạc 10 năm" : `Kịch bản: ΔT=${t > 0 ? "+" : ""}${fmt(t,1)}°C, ΔMưa=${r > 0 ? "+" : ""}${r}%`;
        contextEl.textContent = `${regName} • ${weatherTxt}`;
    }
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
        updateChip("chip-sm", "SMAP", latestRegionStatus.soil_moisture, "dòng");
        updateChip("chip-sal", "Độ mặn", latestRegionStatus.salinity, "dòng");

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
                label: "Mưa hữu hiệu (mm)",
                data: series.map(s => s.rain_sum_mm),
                backgroundColor: "rgba(2, 132, 199, 0.7)",
                borderRadius: 2,
                yAxisID: "y",
                order: 2
            },
            {
                type: "line",
                label: "Bốc thoát hơi ETo (mm)",
                data: series.map(s => s.eto_sum_mm),
                borderColor: "#b45309",
                backgroundColor: "#b45309",
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.25,
                yAxisID: "y",
                order: 1
            }
        ];

        if (hasNdvi) {
            datasets.push({
                type: "line",
                label: "NDVI (0–1)",
                data: ndvi,
                borderColor: "#15803d",
                backgroundColor: "#15803d",
                borderWidth: 1.5,
                borderDash: [4, 4],
                pointRadius: 0,
                tension: 0.25,
                yAxisID: "y1",
                order: 0
            });
        }

        const scales = {
            x: {
                ticks: { color: "#64748b", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                grid: { display: false }
            },
            y: {
                ticks: { color: "#64748b", font: { size: 11 } },
                grid: { color: "#f1f5f9" }
            }
        };

        if (hasNdvi) {
            scales.y1 = {
                position: "right",
                min: 0,
                max: 1,
                ticks: { color: "#15803d", font: { size: 10 } },
                grid: { drawOnChartArea: false }
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
                        position: "top",
                        align: "end",
                        labels: { color: "#334155", usePointStyle: true, boxWidth: 6, font: { size: 11, weight: "bold" } }
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
        renderHorizontalStrategyCards(data, strategies);
        renderNdviStrip(data);
        renderAssumptionsBox(data);
    } catch (e) {
        show("rotationsContent", false); show("rotationsEmpty", true);
    }
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
                <div class="hero-stat-lbl">Nước tưới ngọt phải bù mỗi năm</div>
            </div>
            <div>
                <div class="hero-stat-num">${bareN} <small>tháng</small></div>
                <div class="hero-stat-lbl">Ruộng để đất trống ${bareN ? `(${monthList(base.bare_months)})` : ""}</div>
            </div>
            <div>
                <div class="hero-stat-num" style="font-size: 17px; font-weight: 700; color: #b45309;">${riskSeasonTxt}</div>
                <div class="hero-stat-lbl">Cửa sổ thời tiết rủi ro cao</div>
            </div>
        </div>`;
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
        return `<div class="gantt-seg crop-${ck}" style="${style}" title="${b.label}">${heatDot}${CROP_NAMES[ck] || b.label}</div>`;
    }).join("");

    return `
    <div class="gantt-timeline">
        <div class="gantt-months-head">${monthsHead}</div>
        <div class="gantt-bar">${segments}</div>
    </div>`;
}

function renderHorizontalStrategyCards(data, strategies) {
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
        let isRecommended = false;
        if (isBase) {
            badgeHtml = `<span class="badge-status current">Hiện tại</span>`;
        } else if (st.partial) {
            badgeHtml = `<span class="badge-status neutral">Thuận thiên</span>`;
        } else if (isNum(def) && isNum(base.annual_deficit_mm) && base.annual_deficit_mm > 0) {
            const pct = Math.round((base.annual_deficit_mm - def) / base.annual_deficit_mm * 100);
            if (pct > 0) {
                badgeHtml = `<span class="badge-status saved">Tiết kiệm ${pct}% nước</span>`;
                if (pct >= 45) isRecommended = true;
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
        let scienceNoteHtml = "";
        if (st.id === "D1" || (currentRegion === "Dak_Lak_Tay_Nguyen" && !isBase)) {
            scienceNoteHtml = `<div class="science-note"><strong>WASI Đắk Lắk:</strong> Mô hình FAO-56 tính lượng nước tăng (+67,2 mm). Thực nghiệm Viện WASI (QĐ 26/QĐ-VNLT-KHKH) chứng minh thảm cỏ che phủ giúp <strong>giữ ẩm đất tăng 2,5%–4,2%, giảm >65% xói mòn và tiết kiệm 20%–25% lượng nước tưới thực tế</strong>.</div>`;
        } else if (st.partial || st.id === "S1") {
            scienceNoteHtml = `<div class="science-note shrimp"><strong>Thuận thiên:</strong> Vụ tôm sú tận dụng nước lợ tự nhiên mùa khô, không dùng nước ngọt tưới cây. Chỉ số trên <strong>chưa tính giai đoạn nuôi tôm</strong>.</div>`;
        }

        // Gạch đầu dòng lợi ích & rủi ro tinh gọn
        const bullets = [];
        (st.benefits || []).slice(0, 2).forEach(b => {
            bullets.push(`<li class="good-item">${b}</li>`);
        });
        (st.risks || []).slice(0, 1).forEach(r => {
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
            return `<li><strong>${ph.label}</strong>${win}: ETc ${fmt(ph.etc_mm)} mm${extra} − Peff ${fmt(ph.peff_mm)} mm = <strong>tưới ${fmt(ph.deficit_mm)} mm</strong></li>`;
        }).join("");

        const infoGaps = (st.info_gaps || []).map(g => `<li>${g}</li>`).join("");

        return `
        <article class="rot-card ${isRecommended ? "recommended" : ""} ${isBase ? "is-baseline" : ""}" data-strategy-id="${st.id}">
            <div>
                <div class="rot-card-top">
                    <h3 class="rot-card-title">${cleanName(st.name_vi)}</h3>
                    ${badgeHtml}
                </div>
                <p class="rot-why">${st.why}</p>

                <div class="rot-metrics-row">
                    <div>
                        <div class="metric-val">${m3(def)} <small>m³/ha</small>${deltaTxt}</div>
                        <div class="metric-lbl">Nước ngọt bù/năm${st.partial ? " *" : ""}</div>
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
                <button type="button" class="ask-card-btn" data-crop="${cleanName(st.name_vi)}">Hỏi AI về phương án này →</button>
            </div>
        </article>`;
    }).join("");

    // Cập nhật chú giải tinh gọn
    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch" style="background:var(--c-${k});"></span>${CROP_NAMES[k]}</span>`);
    items.push(`<span class="legend-item"><span class="swatch" style="background:var(--c-bare);"></span>Đất trống</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span style="color:var(--sal); font-weight:700;">—</span>Tháng nước mặn</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");

    // Gắn sự kiện "Hỏi AI về phương án này"
    document.querySelectorAll(".ask-card-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const cropName = btn.dataset.crop;
            const chatInput = document.getElementById("chatInput");
            const q = `Phân tích chi tiết lượng nước tưới, thời vụ và rủi ro nếu chuyển sang phương án: ${cropName}?`;
            chatInput.value = q;
            document.getElementById("aiSection").scrollIntoView({ behavior: "smooth" });
            sendQuestion(q);
        });
    });
}

function renderNdviStrip(data) {
    const el = document.getElementById("ndviStrip");
    const ndvi = data.ndvi_monthly || {};
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[String(m)]) ? Number(ndvi[String(m)]) : (isNum(ndvi[m]) ? Number(ndvi[m]) : null);
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
    document.getElementById("ndviNote").textContent =
        `Chỉ số NDVI từ vệ tinh MODIS MOD13Q1 (${p.lat}, ${p.lon}), chuỗi quan sát 2015–2025. Càng đậm là tán cây phủ càng dày.`;
}

function renderAssumptionsBox(data) {
    const items = (data.assumptions || []).map(a => `<li>${a}</li>`);
    if (data.salinity_months_source) items.push(`<li><strong>Nguồn tháng mặn:</strong> ${data.salinity_months_source}</li>`);
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

        show("waterOnlyScoreNote", crops.length > 0 && crops.every(c =>
            c.components && c.components.heat_ratio === null && c.components.salinity_exceed === null));

        tbody.innerHTML = crops.map((c, i) => {
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
            return `<tr>
                <td><strong>${c.crop_name}</strong>${note}</td>
                <td class="nowrap muted">${win}</td>
                <td class="nowrap" style="text-align:right;">${isNum(c.deficit_mm) ? `<strong>${m3(c.deficit_mm)}</strong> <small class="muted">(${fmt(c.deficit_mm, 1)} mm)</small>` : "–"}</td>
                <td style="text-align:right;">${saved}</td>
                <td style="text-align:right;">${isNum(c.score) ? `<strong>${fmt(c.score, 1)}</strong>` : "–"}</td>
                <td>${risk}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        show("cropTableWrapper", false); show("evaluateEmpty", true);
    }
}

// ==========================================================================
// HỎI ĐÁP AGRO-AI COPILOT (DETERMINISTIC ADVOCACY)
// ==========================================================================
async function sendQuestion(question) {
    if (!question) return;
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Trợ lý AI đang đối chiếu dữ liệu vệ tinh NASA và tính toán...</em>";
    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ region: currentRegion, question })
        });
        if (!res.ok) {
            outputEl.innerHTML = `<span style="color:var(--bad);">Không thể lấy câu trả lời (Mã lỗi HTTP ${res.status}).</span>`;
            return;
        }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
    } catch (e) {
        outputEl.innerHTML = `<span style="color:var(--bad);">Lỗi kết nối máy chủ: ${e.message}</span>`;
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
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
}
