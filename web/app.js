// AERO-AGRI Vanilla Client Controller
// Hoàn toàn offline, không CDN, không Math.random, bám sát mục 7

let map = null;
let tileLayerAdded = false;
let markers = {};
let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;

const REGIONS_DATA = {
    "Ben_Tre_DBSCL": { name: "Bến Tre", lat: 10.2433, lon: 106.3758 },
    "Dak_Lak_Tay_Nguyen": { name: "Đắk Lắk", lat: 12.6667, lon: 108.0500 }
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

        const tableWrapper = document.getElementById("cropTableWrapper");
        const tableEmpty = document.getElementById("evaluateEmpty");
        if (tableWrapper && tableEmpty) {
            tableWrapper.style.display = "none";
            tableEmpty.style.display = "block";
        }
        return;
    }

    await loadClimateChart();
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

        const ctx = document.getElementById("climateChart").getContext("2d");
        if (climateChart) {
            climateChart.destroy();
        }

        climateChart = new Chart(ctx, {
            data: {
                labels: labels,
                datasets: [
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
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } }
                },
                scales: {
                    x: { ticks: { color: "#94a3b8", maxRotation: 45 }, grid: { color: "#1f2937" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { color: "#1f2937" } }
                }
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
        evaluateCrops();
    }, 300);
}

async function evaluateCrops() {
    const tableWrapper = document.getElementById("cropTableWrapper");
    const emptyEl = document.getElementById("evaluateEmpty");
    const tbody = document.getElementById("cropTableBody");

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

        crops.forEach(c => {
            const tr = document.createElement("tr");

            const scText = c.score !== null ? `${c.score}` : "<span style='color:#9ca3af; font-size:0.8rem;'>Chưa đủ dữ liệu để chấm</span>";
            const rkClass = `risk-${c.risk_level}`;
            const comp = c.components;
            const wVal = comp.irrigation_share !== undefined && comp.irrigation_share !== null ? comp.irrigation_share : comp.water_stress;
            const wStress = wVal !== null && wVal !== undefined ? wVal.toFixed(2) : "<span style='color:#9ca3af;'>N/A</span>";
            const hStress = comp.heat_ratio !== null ? comp.heat_ratio.toFixed(2) : "0.00";
            const sStress = comp.salinity_exceed !== null ? comp.salinity_exceed.toFixed(2) : "<span style='color:#9ca3af;'>N/A</span>";
            const defText = c.deficit_mm !== null ? `${c.deficit_mm}` : "N/A";
            const vsBase = (c.water_vs_baseline_pct === null || c.water_vs_baseline_pct === undefined)
                ? "<span style='color:#9ca3af;'>N/A</span>"
                : (c.water_vs_baseline_pct !== 0.0 ? `${c.water_vs_baseline_pct > 0 ? "+" : ""}${c.water_vs_baseline_pct}%` : "Baseline");

            let noteText = "";
            if (c.missing_components && c.missing_components.length > 0) {
                noteText = `<div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">* ${c.missing_components.join(", ")}</div>`;
            }

            tr.innerHTML = `
                <td><strong>${c.crop_name}</strong>${noteText}</td>
                <td><strong style="color:#38bdf8; font-size:1rem;">${scText}</strong></td>
                <td><span class="badge-risk ${rkClass}">${c.risk_level}</span></td>
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
