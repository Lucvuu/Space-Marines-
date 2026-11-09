// AERO-AGRI Vanilla Client Controller
// Hoàn toàn offline, không CDN, không Math.random, bám sát mục 7

let map = null;
let tileLayerAdded = false;
let markers = {};
let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let latestRotationsData = null;

const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        lat: 10.2433,
        lon: 106.3758,
        ndvi_point: {
            lat: 10.0992,
            lon: 106.6040,
            note: "Ruộng lúa gần chợ Mỹ Nhơn (huyện Ba Tri cũ, Bến Tre; nay thuộc tỉnh Vĩnh Long). Chọn trên ảnh vệ tinh."
        }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        lat: 12.6667,
        lon: 108.0500,
        ndvi_point: {
            lat: 12.8314,
            lon: 108.1282,
            note: "Vườn cà phê gần Quảng Phú (huyện Cư M'gar cũ, Đắk Lắk). Chọn trên ảnh vệ tinh."
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initControls();
    loadApp();
});

function initControls() {
    const regSelect = document.getElementById("regionSelect");
    regSelect.addEventListener("change", (e) => {
        currentRegion = e.target.value;
        loadRegionData();
    });

    const sTemp = document.getElementById("sliderTemp");
    const sRain = document.getElementById("sliderRain");
    const valTemp = document.getElementById("valTemp");
    const valRain = document.getElementById("valRain");

    sTemp.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        valTemp.textContent = `${val >= 0 ? "+" : ""}${val} °C`;
        debouncedEvaluate();
    });

    sRain.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        valRain.textContent = `${val >= 0 ? "+" : ""}${val}%`;
        debouncedEvaluate();
    });

    const prioSelect = document.getElementById("prioritySelect");
    if (prioSelect) {
        prioSelect.addEventListener("change", () => {
            if (latestRotationsData) {
                renderRotationCards(latestRotationsData);
            }
        });
    }

    // Chat
    const btnAsk = document.getElementById("btnAsk");
    const chatInput = document.getElementById("chatInput");
    btnAsk.addEventListener("click", () => sendQuestion(chatInput.value.trim()));
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendQuestion(chatInput.value.trim());
    });

    document.querySelectorAll(".prompt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const q = btn.getAttribute("data-q");
            chatInput.value = q;
            sendQuestion(q);
        });
    });
}

function initMap() {
    try {
        map = L.map("map", {
            center: [11.5, 107.0],
            zoom: 6,
            zoomControl: true
        });

        // User mod #4: Dùng L.circleMarker, không dùng icon mặc định
        Object.entries(REGIONS_DATA).forEach(([regId, info]) => {
            const marker = L.circleMarker([info.lat, info.lon], {
                radius: 12,
                fillColor: "#38bdf8",
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(map);

            marker.bindPopup(`<strong>${info.name}</strong><br>Click để chọn vùng`);
            marker.on("click", () => {
                document.getElementById("regionSelect").value = regId;
                currentRegion = regId;
                loadRegionData();
            });

            markers[regId] = marker;
        });
    } catch (e) {
        console.warn("Leaflet offline init note:", e);
    }
}

async function loadApp() {
    await updateStatusBar();
    await loadRegionData();
}

async function updateStatusBar() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const status = await res.json();
        latestRegionStatus = status[currentRegion] || {};

        // Thêm tile layer nếu có kết nối mạng tới OSM
        if (status._osm_online && !tileLayerAdded && map) {
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 18,
                attribution: "&copy; OpenStreetMap"
            }).addTo(map);
            tileLayerAdded = true;
        }

        updateChip("chip-power", "POWER", latestRegionStatus.power);
        updateChip("chip-ndvi", "NDVI", latestRegionStatus.ndvi);
        updateChip("chip-sm", "SMAP", latestRegionStatus.soil_moisture);
        updateChip("chip-sal", "Độ mặn", latestRegionStatus.salinity);

        // Hiển thị badge dữ liệu mẫu nếu có bất kỳ nguồn nào là synthetic
        const isSynth = Object.values(latestRegionStatus).some(s => s && s.is_synthetic);
        const badgeArea = document.getElementById("dataBadgeArea");
        if (isSynth) {
            badgeArea.innerHTML = '<span class="chip chip-synthetic">⚠️ DỮ LIỆU MẪU (SYNTHETIC)</span>';
        } else {
            badgeArea.innerHTML = '';
        }
    } catch (e) {
        console.error("Lỗi cập nhật status bar:", e);
    }
}

function updateChip(elementId, label, info) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!info || !info.available) {
        el.className = "chip chip-missing";
        el.textContent = `${label}: Chưa có`;
    } else if (info.is_synthetic) {
        el.className = "chip chip-synthetic";
        el.textContent = `${label}: Dữ liệu mẫu (${info.rows} dòng)`;
    } else {
        el.className = "chip chip-real";
        el.textContent = `${label}: Dữ liệu thật (${info.rows} dòng)`;
    }
}

async function loadRegionData() {
    await updateStatusBar();

    // Di chuyển map tới vùng được chọn
    if (map && REGIONS_DATA[currentRegion]) {
        const target = REGIONS_DATA[currentRegion];
        map.setView([target.lat, target.lon], 8);
    }

    // Nếu chưa có dữ liệu POWER, hiện trạng thái rỗng ngay, không gọi API gây 404 console
    if (!latestRegionStatus.power || !latestRegionStatus.power.available) {
        const chartWrapper = document.getElementById("chartWrapper");
        const chartEmpty = document.getElementById("climateEmpty");
        if (chartWrapper && chartEmpty) {
            chartWrapper.style.display = "none";
            chartEmpty.style.display = "block";
        }

        const rotContent = document.getElementById("rotationsContent");
        const rotEmpty = document.getElementById("rotationsEmpty");
        if (rotContent && rotEmpty) {
            rotContent.style.display = "none";
            rotEmpty.style.display = "block";
        }

        const tableWrapper = document.getElementById("cropTableWrapper");
        const tableEmpty = document.getElementById("evaluateEmpty");
        if (tableWrapper && tableEmpty) {
            tableWrapper.style.display = "none";
            tableEmpty.style.display = "block";
        }
        return;
    }

    await loadClimateChart();
    await loadRotations();
    await evaluateCrops();
}

async function loadClimateChart() {
    const wrapper = document.getElementById("chartWrapper");
    const emptyEl = document.getElementById("climateEmpty");

    try {
        const res = await fetch(`/api/climate?region=${encodeURIComponent(currentRegion)}`);
        if (!res.ok) {
            wrapper.style.display = "none";
            emptyEl.style.display = "block";
            return;
        }

        const data = await res.json();
        const series = data.monthly_series || [];

        if (series.length === 0) {
            wrapper.style.display = "none";
            emptyEl.style.display = "block";
            return;
        }

        wrapper.style.display = "block";
        emptyEl.style.display = "none";

        // Lấy 24 tháng gần nhất để vẽ biểu đồ gọn gàng
        const displaySeries = series.slice(-24);
        const labels = displaySeries.map(s => s.month);
        const rain = displaySeries.map(s => s.rain_sum_mm);
        const eto = displaySeries.map(s => s.eto_sum_mm);
        const ndvi = displaySeries.map(s => s.ndvi_mean);
        const hasNdvi = ndvi.some(v => v !== null && v !== undefined);

        const ctx = document.getElementById("climateChart").getContext("2d");
        if (climateChart) {
            climateChart.destroy();
        }

        const datasets = [
            {
                type: "bar",
                label: "Lượng mưa (mm)",
                data: rain,
                backgroundColor: "rgba(56, 189, 248, 0.6)",
                borderColor: "#38bdf8",
                borderWidth: 1,
                yAxisID: "y"
            },
            {
                type: "line",
                label: "Bốc thoát hơi nước ETo (mm)",
                data: eto,
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                fill: false,
                tension: 0.3,
                yAxisID: "y"
            }
        ];

        const ndviPoint = data.ndvi_point || (REGIONS_DATA[currentRegion] && REGIONS_DATA[currentRegion].ndvi_point);
        const ndviTooltipNote = ndviPoint
            ? `Nguồn NDVI (${ndviPoint.lat}, ${ndviPoint.lon}): ${ndviPoint.note}`
            : "Nguồn: MODIS MOD13Q1 (250m)";

        const chipNdviEl = document.getElementById("chip-ndvi");
        if (chipNdviEl) {
            chipNdviEl.title = ndviTooltipNote;
        }

        if (hasNdvi) {
            datasets.push({
                type: "line",
                label: "Chỉ số thực vật NDVI (0–1)",
                data: ndvi,
                borderColor: "#10b981",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                fill: false,
                tension: 0.3,
                yAxisID: "y1"
            });
        }

        const scales = {
            x: { ticks: { color: "#94a3b8", maxRotation: 45 }, grid: { color: "#1f2937" } },
            y: {
                type: "linear",
                position: "left",
                ticks: { color: "#94a3b8" },
                grid: { color: "#1f2937" },
                title: { display: true, text: "mm / tháng", color: "#94a3b8" }
            }
        };

        if (hasNdvi) {
            scales.y1 = {
                type: "linear",
                position: "right",
                min: 0.0,
                max: 1.0,
                ticks: { color: "#10b981" },
                grid: { drawOnChartArea: false },
                title: { display: true, text: "NDVI (0–1)", color: "#10b981" }
            };
        }

        climateChart = new Chart(ctx, {
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.dataset && context.dataset.yAxisID === "y1") {
                                    return ndviTooltipNote;
                                }
                                return "";
                            }
                        }
                    }
                },
                scales: scales
            }
        });
    } catch (e) {
        wrapper.style.display = "none";
        emptyEl.style.display = "block";
    }
}

function debouncedEvaluate() {
    if (simDebounceTimer) clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(() => {
        loadRotations();
        evaluateCrops();
    }, 300);
}

async function loadRotations() {
    const rotContent = document.getElementById("rotationsContent");
    const rotEmpty = document.getElementById("rotationsEmpty");
    if (!rotContent || !rotEmpty) return;

    const deltaTemp = parseFloat(document.getElementById("sliderTemp").value);
    const deltaRain = parseFloat(document.getElementById("sliderRain").value);

    try {
        const res = await fetch("/api/rotations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                region: currentRegion,
                delta_temp_c: deltaTemp,
                delta_rain_pct: deltaRain
            })
        });

        if (!res.ok) {
            rotContent.style.display = "none";
            rotEmpty.style.display = "block";
            return;
        }

        const data = await res.json();
        latestRotationsData = data;
        rotContent.style.display = "block";
        rotEmpty.style.display = "none";

        renderNdviStrip(data.ndvi_monthly || {});
        renderRotationCards(data);
        renderAssumptionsBox(data);
    } catch (e) {
        rotContent.style.display = "none";
        rotEmpty.style.display = "block";
    }
}

function renderNdviStrip(ndviMonthly) {
    const stripArea = document.getElementById("ndviStripArea");
    if (!stripArea) return;

    let cellsHtml = "";
    for (let m = 1; m <= 12; m++) {
        const val = ndviMonthly[String(m)] !== undefined ? ndviMonthly[String(m)] : ndviMonthly[m];
        let bg = "#1e293b";
        let valText = "N/A";
        if (val !== null && val !== undefined) {
            const norm = Math.max(0, Math.min(1, val));
            const alpha = (0.15 + 0.75 * norm).toFixed(2);
            bg = `rgba(16, 185, 129, ${alpha})`;
            valText = Number(val).toFixed(2);
        }
        cellsHtml += `
            <div class="month-cell" style="background: ${bg};" title="Tháng ${m}: NDVI = ${valText}">
                <div style="font-weight: 600;">T${m}</div>
                <div style="font-size: 0.68rem;">${valText}</div>
            </div>
        `;
    }

    stripArea.innerHTML = `
        <div class="ndvi-strip-header">
            <strong>NDVI quan sát (12 tháng)</strong>
            <span>Ảnh vệ tinh MODIS: NDVI thấp = ít cây xanh / đất trống</span>
        </div>
        <div class="month-strip">${cellsHtml}</div>
    `;
}

function renderRotationCards(data) {
    const grid = document.getElementById("rotationCardsGrid");
    if (!grid) return;

    const prioSelect = document.getElementById("prioritySelect");
    const priority = prioSelect ? prioSelect.value : "default";

    const strategies = (data.strategies || []).slice();
    if (priority === "water") {
        strategies.sort((a, b) => {
            const va = a.annual_deficit_mm;
            const vb = b.annual_deficit_mm;
            if (va === null || va === undefined) return 1;
            if (vb === null || vb === undefined) return -1;
            return va - vb;
        });
    } else if (priority === "bare") {
        strategies.sort((a, b) => {
            const ba = (a.bare_months || []).length;
            const bb = (b.bare_months || []).length;
            return ba - bb;
        });
    }

    const phaseColors = ["#0369a1", "#047857", "#6d28d9", "#b45309"];

    grid.innerHTML = strategies.map(st => {
        const existingBadge = st.is_existing ? `<span class="badge-existing">Hiện trạng</span>` : "";

        // Map phase labels to colors
        const labelColorMap = {};
        (st.phases || []).forEach((ph, idx) => {
            labelColorMap[ph.label] = phaseColors[idx % phaseColors.length];
        });

        const calHtml = (st.calendar_12m || []).map(mc => {
            const isBare = mc.bare;
            const salClass = mc.salinity_month ? "salinity-border" : "";
            const bareClass = isBare ? "bare-cell" : "";
            const bgStyle = (!isBare && mc.phase_label)
                ? `style="background: ${labelColorMap[mc.phase_label] || '#0369a1'};"`
                : "";
            const heatDot = (mc.heat_ratio !== null && mc.heat_ratio !== undefined && mc.heat_ratio > 0)
                ? `<span class="heat-dot" title="Tỷ lệ ngày vượt ngưỡng nhiệt: ${(mc.heat_ratio * 100).toFixed(0)}%"></span>`
                : "";
            const shortLabel = isBare ? "Trống" : (mc.phase_label || "");

            return `
                <div class="month-cell ${bareClass} ${salClass}" ${bgStyle} title="Tháng ${mc.month}: ${isBare ? 'Đất trống' : mc.phase_label}${mc.salinity_month ? ' | Tháng mặn' : ''}">
                    ${heatDot}
                    <div style="font-weight: 600;">T${mc.month}</div>
                    <div style="font-size: 0.62rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${shortLabel}</div>
                </div>
            `;
        }).join("");

        const defVal = (st.annual_deficit_mm !== null && st.annual_deficit_mm !== undefined)
            ? `${st.annual_deficit_mm} mm`
            : "N/A";
        const partialNote = st.partial ? " (chưa tính vụ tôm)" : "";
        const bareCount = (st.bare_months || []).length;

        const phaseMetricsHtml = (st.phases || []).map(ph => {
            if (!ph.modeled) {
                return `<li><strong>${ph.label}:</strong> Chưa mô hình hóa (${ph.window ? ph.window.start + ' → ' + ph.window.end : ''})</li>`;
            }
            const winStr = ph.window && ph.window.start ? `${ph.window.start} → ${ph.window.end}` : "";
            return `<li><strong>${ph.label}</strong> (${winStr}): thiếu hụt <strong>${ph.deficit_mm} mm</strong></li>`;
        }).join("");

        const evidenceHtml = (st.evidence || []).map(ev => {
            const unvBadge = ev.verified === false ? `<span class="badge-unverified">chưa kiểm chứng</span>` : "";
            return `<li>${ev.text} <span style="color:#94a3b8;">— Nguồn: ${ev.source}</span>${unvBadge}</li>`;
        }).join("");

        const benefitsHtml = (st.benefits || []).map(b => `<li>${b}</li>`).join("");
        const gapsHtml = (st.info_gaps || []).map(g => `<li>${g}</li>`).join("");
        const risksHtml = (st.risks || []).map(r => `<li>${r}</li>`).join("");

        return `
            <div class="rotation-card" data-strategy-id="${st.id}">
                <div class="rotation-card-header">
                    <div class="rotation-card-title">${st.id}: ${st.name_vi}</div>
                    ${existingBadge}
                </div>

                <div class="month-strip">${calHtml}</div>

                <div class="rotation-metrics">
                    <div><strong>Thiếu hụt nước ngọt cả năm:</strong> ${defVal}${partialNote}</div>
                    <div><strong>Số tháng đất trống:</strong> ${bareCount}</div>
                    <ul style="padding-left: 18px; margin-top: 4px;">${phaseMetricsHtml}</ul>
                </div>

                <div class="rotation-block">
                    <div class="rotation-block-title">Vì sao đề xuất</div>
                    <div>${st.why}</div>
                </div>

                <div class="rotation-block">
                    <div class="rotation-block-title">Bằng chứng</div>
                    <ul>${evidenceHtml}</ul>
                </div>

                <div class="rotation-block">
                    <div class="rotation-block-title">Lợi ích</div>
                    <ul>${benefitsHtml}</ul>
                </div>

                <div class="rotation-block">
                    <div class="rotation-block-title">Thiếu hụt thông tin</div>
                    <ul>${gapsHtml}</ul>
                </div>

                <div class="rotation-block">
                    <div class="rotation-block-title">Rủi ro cần nông dân và chuyên gia địa phương kiểm tra</div>
                    <ul>${risksHtml}</ul>
                </div>
            </div>
        `;
    }).join("");
}

function renderAssumptionsBox(data) {
    const box = document.getElementById("rotationAssumptionsBox");
    if (!box) return;
    const assumptions = data.assumptions || [];
    const displayRule = data.display_rule || "";
    const salSource = data.salinity_months_source
        ? `<li><strong>Nguồn tháng mặn:</strong> ${data.salinity_months_source}</li>`
        : "";

    box.innerHTML = `
        <div style="font-weight: 600; color: #38bdf8; margin-bottom: 4px;">Giả định</div>
        <ul style="padding-left: 18px; margin: 0;">
            ${assumptions.map(a => `<li>${a}</li>`).join("")}
            ${salSource}
            ${displayRule ? `<li><strong>Quy tắc hiển thị lịch 12 tháng:</strong> ${displayRule}</li>` : ""}
        </ul>
    `;
}

async function evaluateCrops() {
    const tableWrapper = document.getElementById("cropTableWrapper");
    const emptyEl = document.getElementById("evaluateEmpty");
    const tbody = document.getElementById("cropTableBody");
    const waterNoteEl = document.getElementById("waterOnlyScoreNote");

    const deltaTemp = parseFloat(document.getElementById("sliderTemp").value);
    const deltaRain = parseFloat(document.getElementById("sliderRain").value);

    try {
        const res = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                region: currentRegion,
                delta_temp_c: deltaTemp,
                delta_rain_pct: deltaRain
            })
        });

        if (!res.ok) {
            tableWrapper.style.display = "none";
            emptyEl.style.display = "block";
            return;
        }

        const data = await res.json();
        const crops = data.crops || [];

        tableWrapper.style.display = "block";
        emptyEl.style.display = "none";
        tbody.innerHTML = "";

        // Cập nhật màu của circleMarker trên bản đồ theo cây đầu tiên (cây hiện trạng)
        if (crops.length > 0 && markers[currentRegion]) {
            const baseCrop = crops[0];
            const rkColor = getRiskColor(baseCrop.risk_level);
            markers[currentRegion].setStyle({ fillColor: rkColor, color: "#ffffff" });
        }

        const isWaterOnlyRegion = crops.length > 0 && crops.every(c =>
            c.components && c.components.heat_ratio === null && c.components.salinity_exceed === null
        );
        if (waterNoteEl) {
            waterNoteEl.style.display = isWaterOnlyRegion ? "block" : "none";
        }

        crops.forEach(c => {
            const tr = document.createElement("tr");

            const scText = c.score !== null ? `${c.score}` : "<span style='color:#9ca3af; font-size:0.8rem;'>Chưa đủ dữ liệu để chấm</span>";
            const rkClass = `risk-${c.risk_level}`;
            const comp = c.components;
            const wVal = comp.irrigation_share !== undefined && comp.irrigation_share !== null ? comp.irrigation_share : comp.water_stress;
            const wStress = wVal !== null && wVal !== undefined ? wVal.toFixed(2) : "<span style='color:#9ca3af;'>N/A</span>";
            const hStress = comp.heat_ratio !== null && comp.heat_ratio !== undefined ? comp.heat_ratio.toFixed(2) : "<span style='color:#9ca3af;'>N/A</span>";
            const sStress = comp.salinity_exceed !== null ? comp.salinity_exceed.toFixed(2) : "<span style='color:#9ca3af;'>N/A</span>";
            const defText = c.deficit_mm !== null ? `${c.deficit_mm}` : "N/A";
            const vsBase = (c.water_vs_baseline_pct === null || c.water_vs_baseline_pct === undefined)
                ? "<span style='color:#9ca3af;'>N/A</span>"
                : (c.water_vs_baseline_pct !== 0.0 ? `${c.water_vs_baseline_pct > 0 ? "+" : ""}${c.water_vs_baseline_pct}%` : "Baseline");

            let riskCellHtml = `<span class="badge-risk ${rkClass}" title="tỷ lệ ngày mùa vụ vượt ngưỡng nhiệt/mặn">${c.risk_level}</span>`;
            if (c.score !== null && (c.exceed_ratio_r === null || c.exceed_ratio_r === undefined)) {
                riskCellHtml = `<span style="color:#94a3b8; font-size:0.8rem;">Chưa đánh giá (không có ngưỡng có nguồn)</span>`;
            }

            let noteText = "";
            if (c.missing_components && c.missing_components.length > 0) {
                noteText = `<div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">* ${c.missing_components.join(", ")}</div>`;
            }

            const winText = (c.season_window && c.season_window.start && c.season_window.end)
                ? `<code>${c.season_window.start} → ${c.season_window.end}</code>`
                : "<span style='color:#9ca3af;'>N/A</span>";

            tr.innerHTML = `
                <td><strong>${c.crop_name}</strong>${noteText}</td>
                <td>${winText}</td>
                <td><strong style="color:#38bdf8; font-size:1rem;">${scText}</strong></td>
                <td>${riskCellHtml}</td>
                <td>${defText}</td>
                <td>${wStress}</td>
                <td>${hStress}</td>
                <td>${sStress}</td>
                <td><strong style="color:${c.water_vs_baseline_pct > 0 ? '#6ee7b7' : '#94a3b8'};">${vsBase}</strong></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        tableWrapper.style.display = "none";
        emptyEl.style.display = "block";
    }
}

function getRiskColor(riskLevel) {
    switch (riskLevel) {
        case "LOW": return "#059669";
        case "MODERATE": return "#d97706";
        case "SEVERE": return "#ea580c";
        case "CRITICAL": return "#dc2626";
        default: return "#64748b";
    }
}

async function sendQuestion(question) {
    if (!question) return;
    const outputEl = document.getElementById("chatOutput");
    outputEl.innerHTML = "<em>Đang tính toán số liệu và sinh khuyến nghị...</em>";

    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                region: currentRegion,
                question: question
            })
        });

        if (!res.ok) {
            outputEl.innerHTML = `<span style="color:#f87171;">Lỗi khi tải tư vấn (mã ${res.status}). Vui lòng kiểm tra dữ liệu nguồn.</span>`;
            return;
        }

        const data = await res.json();
        outputEl.innerHTML = renderSimpleMarkdown(data.markdown);
    } catch (e) {
        outputEl.innerHTML = `<span style="color:#f87171;">Lỗi kết nối máy chủ: ${e.message}</span>`;
    }
}

// Trình parse markdown thuần tự viết (không dùng thư viện ngoài)
function renderSimpleMarkdown(md) {
    if (!md) return "";

    let lines = md.split("\n");
    let html = "";
    let inTable = false;

    lines.forEach(line => {
        let trimmed = line.trim();

        // Table
        if (trimmed.startsWith("|")) {
            if (!inTable) {
                inTable = true;
                html += "<table><tbody>";
            }
            if (trimmed.includes("---")) {
                return; // separator
            }
            let cells = trimmed.split("|").slice(1, -1);
            html += "<tr>" + cells.map(c => `<td>${formatInline(c.trim())}</td>`).join("") + "</tr>";
            return;
        } else if (inTable) {
            inTable = false;
            html += "</tbody></table>";
        }

        if (trimmed.startsWith("### ")) {
            html += `<h3>${formatInline(trimmed.substring(4))}</h3>`;
        } else if (trimmed.startsWith("#### ")) {
            html += `<h4>${formatInline(trimmed.substring(5))}</h4>`;
        } else if (trimmed.startsWith("> ")) {
            html += `<blockquote>${formatInline(trimmed.substring(2))}</blockquote>`;
        } else if (trimmed.startsWith("- ")) {
            html += `<ul><li>${formatInline(trimmed.substring(2))}</li></ul>`;
        } else if (trimmed.startsWith("---")) {
            html += `<hr style="border:0; border-top:1px solid #1f2937; margin:10px 0;">`;
        } else if (trimmed === "") {
            html += "<br>";
        } else {
            html += `<p>${formatInline(trimmed)}</p>`;
        }
    });

    if (inTable) html += "</tbody></table>";
    return html;
}

function formatInline(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code style='background:#1f2937; padding:2px 4px; border-radius:3px;'>$1</code>");
}
