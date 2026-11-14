// AERO-AGRI web client — NASA Space Apps Challenge (Field Shift)
// Farmer view first, expert detail one tap away. EN/VI. 100% offline-first (no CDN).

let climateChart = null;
let currentRegion = "Ben_Tre_DBSCL";
let latestRegionStatus = {};
let simDebounceTimer = null;
let baselineDeficits = {}; // baseline deficits (0 °C, 0%) used for scenario deltas
let selectedStrategy = null;
let selectedStrategyName = "";
let lastRotations = null;
let lastRotationData = null;
let lastCrops = null;
let lastClimate = null;
let reportReady = false;
let lang = "en";
const prevNums = {};
const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// Pilot regions and the MODIS NDVI pixel location
const REGIONS_DATA = {
    "Ben_Tre_DBSCL": {
        name: "Bến Tre",
        place: { en: "Ba Tri, Mekong Delta · Winter–Spring rice sown 11-01, salinity Feb–Apr", vi: "Ba Tri, ĐBSCL · Đông Xuân gieo 11-01, mặn tháng 2–4" },
        ndvi_point: { lat: 10.0992, lon: 106.6040 }
    },
    "Dak_Lak_Tay_Nguyen": {
        name: "Đắk Lắk",
        place: { en: "Cư M'gar, Central Highlands · Dry season 01-01 to 04-30", vi: "Cư M'gar, Tây Nguyên · Mùa khô 01-01 đến 04-30" },
        ndvi_point: { lat: 12.8314, lon: 108.1282 }
    }
};

const KNOWN_CROPS = ["rice", "shrimp", "soybean", "maize", "coffee", "coffee_cover_crop", "other"];
const MONTHS = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    vi: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]
};
const MONTHS_LONG = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    vi: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"]
};

// ==========================================================================
// I18N: UI chrome. Static English text lives in index.html (data-i18n) and is
// captured at start-up; Vietnamese replaces it. Dynamic strings use t(key).
// Config text comes from the API: English fields plus `vi` blocks.
// ==========================================================================
const I18N = {
    en: {
        na: "n/a", as_today: "As today", months: "months", days: "days",
        crop_rice: "Rice", crop_shrimp: "Tiger shrimp", crop_soybean: "Soybean", crop_maize: "Maize", crop_coffee: "Robusta coffee",
        crop_coffee_cover_crop: "Coffee + cover crop", crop_other: "Other crop", bare: "Bare soil",
        risk_LOW: "Low", risk_MODERATE: "Moderate", risk_SEVERE: "High", risk_CRITICAL: "Very high", risk_INSUFFICIENT_DATA: "Insufficient data",
        loading_place: "Loading location...", updating: "Updating…",
        no_weather: "No weather data for this region yet", no_base: "No current-practice information",
        synth: "<strong>Note:</strong> this region is using simulated demo data because no measured local file is available yet.",
        ans_better: "In {region}, <b>{best}</b> needs <b>{pct}% less fresh water</b> than {base} — {years}.",
        ans_none: "In {region}, {base} already needs the least fresh water. <b>{alt}</b> needs <b>{pct}% more</b>{months} — {years}{ero}.",
        ans_ero: ", but loses about <b>{pct}% less soil</b> to erosion (C-factor; not yet verified)",
        ans_months: " in {m}", years_all: "in every year since {y}", years_some: "in {n} of {m} years",
        ans_note: "Model figures for fresh water you must pump or buy. Cost, labor and market price are not included.",
        scen_more: "With weather at {w}, today's practice needs <b>{d} m³/ha more</b> fresh water than in 2015–2025.",
        scen_less: "With weather at {w}, today's practice needs <b>{d} m³/ha less</b> fresh water than in 2015–2025.",
        scen_w: "{t} °C, rain {r}%",
        tile_water: "Water to pump today", tile_water_scen: "Water to pump in this weather", tile_water_sub: "{v} m³ per 1,000 m² · {when}", when_year: "per year", when_in: "in {m}",
        tile_best: "Best saving", tile_with: "with {name}", tile_more: "More water with the other option",
        tile_sal: "Salt water months", tile_sal_sub: "{n} months a year · source in Step 4 (expert data)",
        tile_slope: "Median slope (SRTM)", tile_slope_sub: "10% of the land steeper than {p90}° · {share}% of rain falls in {m}",
        tile_bare: "Months with bare soil", tile_bare_sub: "today's practice",
        badge_current: "Current practice", badge_shrimp: "Shrimp phase not modeled", badge_saves: "Saves {p}% water", badge_more: "Uses {p}% more water",
        water_year: "water to pump per year", water_in: "water to pump in {m}", per1000: "≈ {v} m³ per 1,000 m²",
        bare_lbl: "months with bare soil", rel_same: "same as today", rel_less: "{p}% less than today", rel_more: "{p}% more than today", rel_base: "today's practice",
        yr_line: "Typical year <b>{a}</b> · Dry year (1 in 5) <b>{b}</b> m³/ha", driest: "Driest crop year in the record: {y}, {v} m³/ha",
        yr_axis: "one bar per crop year", yr_aria: "Fresh water to supply in each crop year, {a} to {b}", no_data: "no data",
        nyv: "not yet verified", shrimp_nm: "shrimp phase not modeled", other_nm: "other months not modeled",
        details: "Details", hide: "Hide details", see_data: "See data", hide_data: "Hide data",
        h_per1000: "Per 1,000 m²: fresh water to supply", supply: "supply <b>{v} m³</b>", water_nm: "water not modeled",
        whole_year: "Whole year", these_months: "Total for these months",
        less_cur: ", {v} m³ less than current practice", more_cur: ", {v} m³ more than current practice", same_cur: ", same as current practice",
        plain_tip: "1 mm of water on the field = 1 m³ per 1,000 m²",
        h_benefits: "Benefits", h_risks: "Risks", h_gaps: "To verify", h_sources: "Sources", h_calc: "Water balance", h_years: "Water to pump in each crop year",
        calc_nm: "water not modeled for this phase.", to: "to",
        calc_line: "ETc {etc} mm{extra}{presat}; effective rain {pe} mm. Sum of monthly deficits: <strong>supply {d} mm</strong>{low}.",
        calc_extra: " + land preparation and percolation {v} mm [assumed soil type]",
        calc_presat: " (the 200 mm soil saturation is not re-applied because the field is already wet from the previous month)",
        calc_low: "; if soil percolates 2 mm/day: {v} mm", low_range: "{v} m³/ha if soil percolates less (2 mm/day)",
        shrimp_total: "* The shrimp phase is not included in the fresh-water total.",
        ero_line: "Soil loss about <b>{p}%</b> lower than bare inter-rows (C-factor, plot study in Indonesia{v})",
        ero_site: "Slope (SRTM): median {a}°, 10% of the land steeper than {b}° · {s}% of rain falls {m} (IMERG)",
        ero_h: "Erosion comparison (RUSLE C-factor)", ero_c: "C = {cb} for {lb}; C = {cc} for {lc}; soil-loss ratio {r} with the same rain, soil and slope.",
        view_report: "View report for this strategy →",
        legend_sal: "Salt water month", legend_stress: "Stress year", sal_tip: ": salt water month",
        bare_tip: "Bare field, no cover crop", heat_tip: "Days above the crop's heat threshold",
        ev_sow_k: "MODIS MOD09A1", ev_sow_t: "Sowing dates seen from space",
        sow_take: "{phase} is sown about <b>{d} days {dir}</b> the model's {date} ({n} seasons seen).",
        sow_take_same: "{phase} is sown on the model's {date} ({n} seasons seen).", after: "after", before: "before",
        sow_line: "Satellite sees <b>{phase}</b> sown {rel}, the date the model uses (median of {n} detected season(s)).",
        sow_rel: "about <b>{d} days {dir}</b> {date}", sow_on: "on {date}", sow_none: "<b>{phase}</b>: no sowing detected (model date {date}).",
        sow_gt: "Ground check: reported {r} · satellite: {s}{rel}.", d_earlier: " ({n} days earlier)", d_later: " ({n} days later)", d_same: " (same day)", not_detected: "not detected",
        sow_years: "Rice seasons detected per year:",
        sow_clouds: "Clouds: fewer than {e} seasons seen in {n} of {m} years. A missing detection does not mean no rice was planted.",
        sow_gap: "In {n} of {m} years the satellite found fewer than {e} rice seasons{none}. Wet-season clouds hide many 8-day images, so a missing detection does not mean no rice was planted.",
        sow_gap_none: ", and none at all in {y}", and: " and ",
        sow_unm: "{n} detection(s) more than {d} days from both model sowing dates (possible extra crop or image artefact) are left out of the medians.",
        sow_unm_row: "Unmatched (more than {d} days from any model date)",
        exp_err: "Expected error:", th_detected: "Detected sowing", th_season: "Season", th_vsmodel: "vs model date",
        method: "Method:", assumptions: "Assumptions:", data: "Data:", images_used: "; {n} cloud-screened 8-day images used", ground: "Ground report:",
        ev_rain_k: "GPM IMERG vs NASA POWER", ev_rain_t: "Rain check",
        rain_take: "Two NASA rain records agree: <b>{a}</b> vs <b>{b} mm</b> a year ({p}% apart), r = <b>{r}</b> month by month.",
        rain_line: "Annual rain: NASA POWER {a} mm · GPM IMERG {b} mm (IMERG {p}% {hl}). Month-by-month correlation r = {r} over {n} months ({per}).",
        higher: "higher", lower: "lower", th_month: "Month", th_power: "NASA POWER (mm)", th_imerg: "GPM IMERG (mm)", source: "Source:",
        ev_smap_k: "NASA SMAP L4", ev_smap_t: "Soil moisture in the dry season",
        smap_take: "Satellite soil moisture tracks the model: r = <b>{r}</b> over {n} dry seasons ({m}). {agree}",
        smap_agree: "Both pick {a} as the driest year.", smap_differ: "The single driest year differs: SMAP {a}, model {b}.",
        smap_line: "In years when SMAP sees drier root-zone soil than usual, the model asks for more irrigation water{for}: correlation r = {r} over {n} years.",
        smap_for: " for {name}", th_year: "Year", th_anom: "Soil moisture anomaly (m³/m³)", th_dw: "drier · wetter", th_model: "Model: water to pump (m³/ha)",
        ev_ero_k: "SRTM + GPM IMERG", ev_ero_t: "Slope and erosion",
        ero_take: "With grass cover, soil loss is about <b>{p}% lower</b> (C-factor, plot study in Indonesia{v}).",
        ero_take2: "Slope: median {a}°, 10% steeper than {b}° · {s}% of rain falls {m}.",
        chip_checking: "checking...", not_used: "not used here", not_avail: "not available", demo: "demo data", measured: "measured ({n} {u})",
        u_days: "days", u_images: "images", u_rows: "rows", u_months: "months", u_seasons: "dry seasons", slope30: "30 m slope",
        chip_sal: "Salinity (ground stations)", chip_sm_label: "SMAP L4",
        report_idle: "Press the button to build a report.", computing: "Computing...",
        report_err: "Could not build the report (code {c}).", conn_err: "Cannot reach the server: {m}",
        ctx: "Viewing: {r} · Weather: {w}{s}", ctx_avg: "2015–2025 average", ctx_strategy: " · Strategy: {n}", report_lang: "",
        ch_power: "Rain, NASA POWER (mm/month)", ch_imerg: "Rain, GPM IMERG (mm/month)", ch_eto: "Reference ET, ETo (mm/month)", ch_unit: "mm/month",
        ndvi_note: "MODIS satellite NDVI, median of a 3×3 km window around ({lat}, {lon}), averaged over {yrs}. Darker cells mean more green vegetation; light cells are bare, newly sown or flooded fields. The row above is the model calendar of current practice.",
        several_years: "several years", ndvi_model: "Model calendar of current practice", ndvi_meas: "Measured satellite greenness (NDVI)",
        as_h: "Water-balance model assumptions &amp; data limits", sal_src: "Salinity months source:", stress_src: "Stress years source:",
        stress_y: "Stress year {y}:", ndvi_src: "Years used for NDVI:", disp_rule: "Calendar display rule:",
        baseline: "Baseline", no_thresh: "No reference threshold", sal_nm: "Salinity not modeled",
        bare_n: "<b>{n}</b> months with bare soil", bare_none: "Soil covered all year", vs_base: "vs {id}",
        details_k: "Option {id}", see_data_k: "Satellite check"
    },
    vi: {
        na: "chưa có", as_today: "Như hiện nay", months: "tháng", days: "ngày",
        crop_rice: "Lúa", crop_shrimp: "Tôm sú", crop_soybean: "Đậu tương", crop_maize: "Ngô", crop_coffee: "Cà phê vối",
        crop_coffee_cover_crop: "Cà phê + cây che phủ", crop_other: "Cây khác", bare: "Đất trống",
        risk_LOW: "Thấp", risk_MODERATE: "Trung bình", risk_SEVERE: "Cao", risk_CRITICAL: "Rất cao", risk_INSUFFICIENT_DATA: "Chưa đủ dữ liệu",
        loading_place: "Đang tải vị trí...", updating: "Đang cập nhật…",
        no_weather: "Chưa có dữ liệu khí tượng cho vùng này", no_base: "Chưa có thông tin cách đang làm",
        synth: "<strong>Lưu ý:</strong> vùng này đang dùng dữ liệu mô phỏng vì chưa có file đo thật.",
        ans_better: "Ở {region}, <b>{best}</b> cần <b>ít hơn {pct}% nước ngọt</b> so với {base} — {years}.",
        ans_none: "Ở {region}, {base} đã là cách cần ít nước ngọt nhất. <b>{alt}</b> cần <b>thêm {pct}% nước</b>{months} — {years}{ero}.",
        ans_ero: ", nhưng giảm khoảng <b>{pct}% đất bị xói mòn</b> (hệ số C; chưa kiểm chứng)",
        ans_months: " trong {m}", years_all: "năm nào cũng vậy kể từ {y}", years_some: "trong {n}/{m} năm",
        ans_note: "Số liệu mô hình về lượng nước ngọt phải bơm hoặc mua. Chưa tính chi phí, công lao động và giá bán.",
        scen_more: "Với thời tiết {w}, cách đang làm cần <b>thêm {d} m³/ha</b> nước ngọt so với khí hậu 2015–2025.",
        scen_less: "Với thời tiết {w}, cách đang làm cần <b>ít hơn {d} m³/ha</b> nước ngọt so với khí hậu 2015–2025.",
        scen_w: "{t} °C, mưa {r}%",
        tile_water: "Nước phải bơm hiện nay", tile_water_scen: "Nước phải bơm với thời tiết này", tile_water_sub: "{v} m³ mỗi 1.000 m² · {when}", when_year: "mỗi năm", when_in: "trong {m}",
        tile_best: "Tiết kiệm nhiều nhất", tile_with: "với {name}", tile_more: "Phương án kia tốn thêm nước",
        tile_sal: "Tháng nước mặn", tile_sal_sub: "{n} tháng mỗi năm · nguồn ở Bước 4 (dữ liệu chuyên gia)",
        tile_slope: "Độ dốc trung vị (SRTM)", tile_slope_sub: "10% diện tích dốc hơn {p90}° · {share}% lượng mưa rơi {m}",
        tile_bare: "Số tháng đất trống", tile_bare_sub: "cách đang làm",
        badge_current: "Đang làm", badge_shrimp: "Chưa tính vụ tôm", badge_saves: "Tiết kiệm {p}% nước", badge_more: "Tốn thêm {p}% nước",
        water_year: "nước ngọt phải bơm mỗi năm", water_in: "nước ngọt phải bơm {m}", per1000: "≈ {v} m³ mỗi 1.000 m²",
        bare_lbl: "tháng đất trống", rel_same: "bằng hiện nay", rel_less: "ít hơn hiện nay {p}%", rel_more: "nhiều hơn hiện nay {p}%", rel_base: "cách đang làm",
        yr_line: "Năm bình thường <b>{a}</b> · Năm khô (1 năm trong 5) <b>{b}</b> m³/ha", driest: "Năm vụ khô nhất trong chuỗi số liệu: {y}, {v} m³/ha",
        yr_axis: "mỗi cột là một năm vụ", yr_aria: "Nước ngọt phải tưới từng năm vụ, từ {a} đến {b}", no_data: "chưa có số liệu",
        nyv: "chưa kiểm chứng", shrimp_nm: "chưa tính giai đoạn nuôi tôm", other_nm: "các tháng khác chưa tính",
        details: "Chi tiết", hide: "Thu gọn", see_data: "Xem số liệu", hide_data: "Ẩn số liệu",
        h_per1000: "Mỗi 1.000 m²: nước ngọt phải tưới", supply: "tưới <b>{v} m³</b>", water_nm: "chưa tính nước",
        whole_year: "Cả năm", these_months: "Tổng các tháng trên",
        less_cur: ", ít hơn cách đang làm {v} m³", more_cur: ", nhiều hơn cách đang làm {v} m³", same_cur: ", bằng cách đang làm",
        plain_tip: "1 mm nước trên ruộng = 1 m³ trên 1.000 m²",
        h_benefits: "Lợi ích", h_risks: "Rủi ro", h_gaps: "Cần kiểm chứng", h_sources: "Nguồn trích dẫn", h_calc: "Cân bằng nước", h_years: "Nước phải bơm từng năm vụ",
        calc_nm: "chưa tính nước cho giai đoạn này.", to: "đến",
        calc_line: "ETc {etc} mm{extra}{presat}; mưa hiệu quả {pe} mm. Cộng phần thiếu từng tháng: <strong>tưới {d} mm</strong>{low}.",
        calc_extra: " + nước làm đất, thấm {v} mm [loại đất giả định]",
        calc_presat: " (không tính lại 200 mm bão hòa đất vì ruộng đã ngấm nước từ tháng trước)",
        calc_low: "; nếu đất thấm 2 mm/ngày: {v} mm", low_range: "{v} m³/ha nếu đất thấm ít (2 mm/ngày)",
        shrimp_total: "* Chưa tính giai đoạn nuôi tôm trong tổng nước ngọt.",
        ero_line: "Đất bị xói mòn ít hơn khoảng <b>{p}%</b> so với để trống giữa hàng (hệ số C, thí nghiệm ô ở Indonesia{v})",
        ero_site: "Độ dốc (SRTM): trung vị {a}°, 10% diện tích dốc hơn {b}° · {s}% lượng mưa rơi {m} (IMERG)",
        ero_h: "So sánh xói mòn (hệ số C của RUSLE)", ero_c: "C = {cb} cho {lb}; C = {cc} cho {lc}; tỷ lệ đất mất {r} khi cùng mưa, đất và độ dốc.",
        view_report: "Xem báo cáo cho phương án này →",
        legend_sal: "Tháng nước mặn", legend_stress: "Năm hạn mặn", sal_tip: ": tháng nước mặn",
        bare_tip: "Ruộng trống, không có cây che phủ", heat_tip: "Có ngày nóng vượt ngưỡng của cây",
        ev_sow_k: "MODIS MOD09A1", ev_sow_t: "Ngày gieo nhìn từ vệ tinh",
        sow_take: "{phase} được gieo khoảng <b>{d} ngày {dir}</b> ngày {date} của mô hình ({n} vụ quan sát được).",
        sow_take_same: "{phase} được gieo đúng ngày {date} của mô hình ({n} vụ quan sát được).", after: "sau", before: "trước",
        sow_line: "Vệ tinh thấy <b>{phase}</b> được gieo {rel}, ngày mô hình đang dùng (trung vị của {n} vụ phát hiện được).",
        sow_rel: "khoảng <b>{d} ngày {dir}</b> {date}", sow_on: "đúng {date}", sow_none: "<b>{phase}</b>: không phát hiện ngày gieo (ngày mô hình {date}).",
        sow_gt: "Đối chiếu thực địa: báo đưa tin {r} · vệ tinh: {s}{rel}.", d_earlier: " (sớm hơn {n} ngày)", d_later: " (muộn hơn {n} ngày)", d_same: " (cùng ngày)", not_detected: "không phát hiện",
        sow_years: "Số vụ lúa phát hiện mỗi năm:",
        sow_clouds: "Do mây: {n}/{m} năm thấy ít hơn {e} vụ. Không phát hiện không có nghĩa là không gieo lúa.",
        sow_gap: "Trong {n}/{m} năm vệ tinh thấy ít hơn {e} vụ lúa{none}. Mây mùa mưa che nhiều ảnh 8 ngày, nên không phát hiện không có nghĩa là không gieo lúa.",
        sow_gap_none: ", và không thấy vụ nào trong năm {y}", and: " và ",
        sow_unm: "{n} lần phát hiện cách cả hai ngày gieo của mô hình hơn {d} ngày (có thể là vụ phụ hoặc nhiễu ảnh) nên không tính vào trung vị.",
        sow_unm_row: "Không khớp (cách mọi ngày gieo của mô hình hơn {d} ngày)",
        exp_err: "Sai số dự kiến:", th_detected: "Ngày gieo phát hiện", th_season: "Vụ", th_vsmodel: "So với ngày mô hình",
        method: "Phương pháp:", assumptions: "Giả định:", data: "Dữ liệu:", images_used: "; dùng {n} ảnh 8 ngày đã lọc mây", ground: "Tin thực địa:",
        ev_rain_k: "GPM IMERG so với NASA POWER", ev_rain_t: "Đối chiếu lượng mưa",
        rain_take: "Hai nguồn mưa của NASA khớp nhau: <b>{a}</b> và <b>{b} mm</b> mỗi năm (lệch {p}%), tương quan theo tháng r = <b>{r}</b>.",
        rain_line: "Mưa cả năm: NASA POWER {a} mm · GPM IMERG {b} mm (IMERG {hl} {p}%). Tương quan theo tháng r = {r} trên {n} tháng ({per}).",
        higher: "cao hơn", lower: "thấp hơn", th_month: "Tháng", th_power: "NASA POWER (mm)", th_imerg: "GPM IMERG (mm)", source: "Nguồn:",
        ev_smap_k: "NASA SMAP L4", ev_smap_t: "Độ ẩm đất mùa khô",
        smap_take: "Độ ẩm đất từ vệ tinh khớp với mô hình: r = <b>{r}</b> trên {n} mùa khô ({m}). {agree}",
        smap_agree: "Cả hai cùng chọn {a} là năm khô nhất.", smap_differ: "Năm khô nhất khác nhau: SMAP là {a}, mô hình là {b}.",
        smap_line: "Năm nào SMAP thấy đất tầng rễ khô hơn bình thường thì mô hình cũng cần tưới nhiều hơn{for}: tương quan r = {r} trên {n} năm.",
        smap_for: " cho {name}", th_year: "Năm", th_anom: "Độ ẩm đất lệch trung bình (m³/m³)", th_dw: "khô hơn · ẩm hơn", th_model: "Mô hình: nước phải bơm (m³/ha)",
        ev_ero_k: "SRTM + GPM IMERG", ev_ero_t: "Độ dốc và xói mòn",
        ero_take: "Có thảm cỏ che phủ, đất bị xói mòn ít hơn khoảng <b>{p}%</b> (hệ số C, thí nghiệm ô ở Indonesia{v}).",
        ero_take2: "Độ dốc: trung vị {a}°, 10% diện tích dốc hơn {b}° · {s}% lượng mưa rơi {m}.",
        chip_checking: "đang kiểm tra...", not_used: "không dùng ở đây", not_avail: "chưa có", demo: "dữ liệu mẫu", measured: "đo thật ({n} {u})",
        u_days: "ngày", u_images: "ảnh", u_rows: "dòng", u_months: "tháng", u_seasons: "mùa khô", slope30: "độ dốc 30 m",
        chip_sal: "Độ mặn (trạm mặt đất)", chip_sm_label: "SMAP L4",
        report_idle: "Bấm nút để tạo báo cáo.", computing: "Đang tính...",
        report_err: "Không tạo được báo cáo (mã {c}).", conn_err: "Không kết nối được máy chủ: {m}",
        ctx: "Đang xem: {r} · Thời tiết: {w}{s}", ctx_avg: "trung bình 2015–2025", ctx_strategy: " · Phương án: {n}", report_lang: "Báo cáo hiện có bằng tiếng Anh.",
        ch_power: "Mưa, NASA POWER (mm/tháng)", ch_imerg: "Mưa, GPM IMERG (mm/tháng)", ch_eto: "Bốc thoát hơi ETo (mm/tháng)", ch_unit: "mm/tháng",
        ndvi_note: "Chỉ số NDVI từ vệ tinh MODIS, trung vị ô 3×3 km quanh điểm ({lat}, {lon}), trung bình {yrs}. Ô càng đậm là càng nhiều cây xanh; ô nhạt là ruộng trống, mới gieo hoặc ngập nước. Dòng trên là lịch mô hình của cách đang làm.",
        several_years: "nhiều năm", ndvi_model: "Lịch mô hình của cách đang làm", ndvi_meas: "Độ xanh vệ tinh đo được (NDVI)",
        as_h: "Giả định mô hình cân bằng nước &amp; giới hạn dữ liệu", sal_src: "Nguồn tháng mặn:", stress_src: "Nguồn năm hạn mặn:",
        stress_y: "Năm hạn mặn {y}:", ndvi_src: "Năm dùng cho NDVI:", disp_rule: "Cách hiển thị lịch:",
        baseline: "Mốc so sánh", no_thresh: "Chưa có ngưỡng chuẩn", sal_nm: "Mặn: chưa tính",
        bare_n: "<b>{n}</b> tháng đất trống", bare_none: "Đất được che phủ cả năm", vs_base: "so với {id}",
        details_k: "Phương án {id}", see_data_k: "Đối chiếu vệ tinh",
        nav1s: "Ruộng", nav2s: "So sánh", nav3s: "Vệ tinh", nav4s: "Báo cáo", next: "Tiếp theo",
        nav_foot: "NASA POWER · MODIS · GPM IMERG · SMAP · SRTM, 2015–2025", footer_method: "Cách tính &amp; nguồn", close: "Đóng",
        step1_hint: "Câu trả lời ngắn trước. Chi tiết chỉ cách một lần chạm.",
        whatif_long: "Nếu năm đó nóng hơn và khô hơn thì sao? Đây là kịch bản giả định, không phải dự báo.",
        // static page text (English originals are in index.html)
        tab_bentre: "Bến Tre (ĐBSCL)", tab_daklak: "Đắk Lắk (Tây Nguyên)", aria_region: "Chọn vùng canh tác",
        nav1: "Ruộng của bạn hôm nay", nav2: "So sánh phương án", nav3: "Vệ tinh cho thấy gì", nav4: "Kế hoạch &amp; báo cáo",
        h1: "Cách luân canh nào ít tốn nước ngọt, giữ đất được che phủ và tránh được nước mặn?",
        intro_sub: "Dựa trên dữ liệu vệ tinh và khí tượng của NASA (2015–2025) cùng các nguồn khoa học Việt Nam đã kiểm chứng. Chọn vùng ở thanh trên cùng.",
        step1: "Bước 1", step1_t: "Ruộng của bạn hôm nay", weather_h: "Thử thời tiết",
        preset_today: "Hôm nay", preset_hot: "Khô nóng", preset_vhot: "Rất khô nóng",
        preset_hot_t: "Nhiệt độ +1,5 °C, mưa −20%. Kịch bản giả định, không phải dự báo.",
        preset_vhot_t: "Nhiệt độ +2,5 °C, mưa −35%. Kịch bản giả định, không phải dự báo.",
        adjust: "Chỉnh nhiệt độ và lượng mưa", temp: "Nhiệt độ", rain: "Lượng mưa", whatif: "Kịch bản giả định, không phải dự báo", reset: "Về khí hậu đo được",
        step2: "Bước 2", step2_t: "So sánh phương án",
        step2_hint: "Số lớn là lượng nước ngọt phải bơm. Càng ít nước thì càng ít phải bơm. Tháng màu đỏ là tháng nước mặn.",
        rot_empty: "Chưa có dữ liệu khí tượng cho vùng này. Thả file vào <code>data/raw/power/&lt;vùng&gt;.csv</code> rồi tải lại trang.",
        step3: "Bước 3", step3_t: "Vệ tinh cho thấy gì",
        step3_hint: "Mỗi ô là một bộ dữ liệu NASA và một kết luận, đã đối chiếu với mô hình.",
        step4: "Bước 4", step4_t: "Kế hoạch &amp; báo cáo",
        step4_hint: "Một trang để in hoặc gửi cho hợp tác xã. Ghép từ chính số liệu trên trang; không dùng AI tạo chữ.",
        btn_report: "Tạo báo cáo cho cả vùng", btn_print: "In", btn_csv: "CSV",
        btn_csv_t: "Mỗi dòng là một vụ, một năm vụ hoặc một phép đối chiếu vệ tinh. 1 mm = 10 m³/ha.",
        expert_s: "Dành cho chuyên gia: dữ liệu và cách tính",
        chart_h: "Mưa và bốc thoát hơi ETo trung bình theo tháng (2015–2025)",
        chart_p: "Xanh đậm: mưa NASA POWER (mô hình dùng). Xanh nhạt: mưa GPM IMERG (đối chiếu độc lập). Đường nâu: ETo. Tháng nào đường nâu cao hơn cột là tháng thiếu nước.",
        no_weather_short: "Chưa có dữ liệu khí tượng.", ndvi_h: "Độ xanh vệ tinh (MODIS NDVI, trung vị ô 3×3 km)",
        method_h: "Cách tính (để kiểm tra lại)",
        method_body: "<p class=\"muted\">Mã nguồn ở <code>core/eto.py</code>, <code>core/water_balance.py</code>, <code>core/rotation.py</code>. Tham số và nguồn của từng con số ở <code>config/crops.json</code> và <code>config/rotations.json</code>.</p><ol>"
            + "<li><b>Bốc thoát hơi chuẩn ETo:</b> FAO-56 Penman-Monteith (Allen và cs., 1998), tính theo ngày từ NASA POWER (<code>T2M_MAX</code>, <code>T2M_MIN</code>, <code>RH2M</code>, <code>WS2M</code>, <code>ALLSKY_SFC_SW_DWN</code>), gió tối thiểu 0,5 m/s (FAO-56 tr.63). Kịch bản nóng hơn cộng ΔT vào cả nhiệt độ cao nhất và thấp nhất, giữ nguyên độ ẩm.</li>"
            + "<li><b>Nhu cầu nước của cây:</b> ETc = Kc × ETo. Kc lấy từ FAO-56 Bảng 12 (tr.111–112), nội suy theo giai đoạn sinh trưởng. Cà phê dùng Kc giữa vụ cho cả mùa khô.</li>"
            + "<li><b>Mưa hiệu quả Pe:</b> từ mưa tháng <code>PRECTOTCORR</code>; kịch bản mưa nhân với (1 + Δ%). Lúa theo FAO Training Manual 3 mục 4.2: Pe = 0,8P − 25 khi P &gt; 75 mm/tháng, Pe = 0,6P − 10 khi P ≤ 75. Cây cạn và cà phê theo USDA-SCS (dạng dùng trong CROPWAT của FAO): Pe = P(125 − 0,2P)/125 khi P ≤ 250 mm, Pe = 125 + 0,1P khi P &gt; 250.</li>"
            + "<li><b>Nước thêm cho lúa</b> (FAO Training Manual 3 mục 4.4): làm đất 300 mm ở tháng đầu vụ (bão hòa đất 200 + lớp nước 100); vụ Đông Xuân gieo sau tháng 9–10 mưa nhiều thì bỏ phần bão hòa 200 mm; nước thấm 4 mm/ngày, cận dưới 2 mm/ngày.</li>"
            + "<li><b>Lượng phải tưới:</b> mỗi tháng trong vụ, thiếu = max(0; ETc + thấm + làm đất − Pe). Cộng các tháng; tháng mưa dư không bù tháng thiếu vì mô hình chưa tính nước trữ trong đất. Số chính là trung bình các năm vụ 2015–2025; thẻ còn cho năm bình thường (trung vị) và năm khô (1 năm trong 5). Đổi đơn vị: 1 mm = 10 m³/ha = 1 m³ trên 1.000 m².</li>"
            + "<li><b>Độ xanh vệ tinh:</b> MODIS MOD13Q1 (250 m, 16 ngày) qua ORNL DAAC, trung vị ô 3×3 km quanh điểm ruộng, chỉ giữ điểm ảnh có độ tin cậy 0 hoặc 1. Chỉ dùng để đối chiếu lịch mùa vụ, không đưa vào công thức nước.</li>"
            + "<li><b>Đối chiếu vệ tinh</b> (hiển thị cạnh mô hình, không đưa vào công thức nước): mưa tháng GPM IMERG so với NASA POWER; độ ẩm đất mùa khô SMAP L4 so với lượng thiếu nước của mô hình (Đắk Lắk); tín hiệu ngập nước và độ xanh MODIS MOD09A1 cho ngày gieo lúa thực tế (Bến Tre); độ dốc SRTM và hệ số C (RUSLE) đã công bố cho so sánh xói mòn khi có cây che phủ (Đắk Lắk).</li>"
            + "<li><b>Chưa tính:</b> nước trữ trong đất, diễn biến độ mặn theo ngày, nước và rủi ro của vụ tôm, năng suất, chi phí, giá bán.</li></ol>",
        crop_h: "Nhu cầu nước từng cây trồng vụ khô", th_crop: "Cây trồng", th_window: "Cửa sổ mùa vụ", th_need: "Nước tưới cần",
        th_vs: "So với cây đầu", th_risk: "Rủi ro thời tiết",
        water_only: "Bảng chỉ so nhu cầu nước. Rủi ro mặn chưa được mô hình vì chưa có số đo độ mặn tại ruộng.",
        eval_empty: "Chưa có dữ liệu để đánh giá.", footer_data: "Dữ liệu &amp; cách tính"
    }
};

const STATIC_EN = {};
function t(key, vars) {
    let s = (I18N[lang] && I18N[lang][key] !== undefined) ? I18N[lang][key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? "" : vars[k]));
    return s;
}
function captureStaticText() {
    document.querySelectorAll("[data-i18n]").forEach(el => { STATIC_EN[el.dataset.i18n] = el.innerHTML; });
    document.querySelectorAll("[data-i18n-title]").forEach(el => { STATIC_EN["title:" + el.dataset.i18nTitle] = el.title; });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => { STATIC_EN["aria:" + el.dataset.i18nAria] = el.getAttribute("aria-label"); });
}
function applyStaticText() {
    const pick = (k, en) => (lang === "vi" && I18N.vi[k] !== undefined ? I18N.vi[k] : en);
    document.querySelectorAll("[data-i18n]").forEach(el => { el.innerHTML = pick(el.dataset.i18n, STATIC_EN[el.dataset.i18n]); });
    document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = pick(el.dataset.i18nTitle, STATIC_EN["title:" + el.dataset.i18nTitle]); });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", pick(el.dataset.i18nAria, STATIC_EN["aria:" + el.dataset.i18nAria])); });
}

// ==========================================================================
// FORMAT & TEXT HELPERS
// ==========================================================================
function loc() { return lang === "vi" ? "vi-VN" : "en-US"; }
function isNum(v) { return v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)); }
function fmt(v, d = 0) { return isNum(v) ? Number(v).toLocaleString(loc(), { maximumFractionDigits: d }) : t("na"); }
function fixed(v, d) { return isNum(v) ? Number(v).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : t("na"); }
function signed(v, d) { return isNum(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${fixed(Math.abs(Number(v)), d)}` : t("na"); }
function m3(mm) { return isNum(mm) ? fmt(mm * 10, 0) : t("na"); } // 1 mm over 1 ha = 10 m³
function esc(s) {
    return String(s === null || s === undefined ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function stripTags(s) { return String(s || "").replace(/<[^>]*>/g, ""); }
function cropKey(crop) {
    if (crop === null || crop === undefined) return "shrimp";
    return KNOWN_CROPS.includes(crop) ? crop : "other";
}
function ico(name) { return `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function show(id, on) { const el = document.getElementById(id); if (el) el.hidden = !on; }
function mShort(m) { return MONTHS[lang][m - 1]; }
function mInitial(m) { return lang === "vi" ? String(m) : MONTHS.en[m - 1].charAt(0); }
function monthSpans(ms) {
    const out = [];
    ms.map(Number).forEach(m => {
        const last = out[out.length - 1];
        if (last && m === last[1] + 1) last[1] = m; else out.push([m, m]);
    });
    if (lang === "vi") return "tháng " + out.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");
    return out.map(([a, b]) => (a === b ? MONTHS.en[a - 1] : `${MONTHS.en[a - 1]}–${MONTHS.en[b - 1]}`)).join(", ");
}
function dayMonth(s) {
    const [m, d] = String(s).split("-").map(Number);
    return lang === "vi" ? `${d}/${m}` : `${MONTHS.en[m - 1] || m} ${d}`;
}
function fmtDate(iso) {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!(y && m && d)) return String(iso || "");
    return lang === "vi" ? `${d}/${m}/${y}` : `${d} ${MONTHS.en[m - 1]} ${y}`;
}
function scenarioText(tv, r) { return t("scen_w", { t: `${tv > 0 ? "+" : ""}${fmt(tv, 1)}`, r: `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}` }); }

// Config text: English fields plus `vi` blocks from the API (fallback to English)
function viOf(st) { return lang === "vi" && st && st.vi ? st.vi : null; }
function rawName(st) { return String((st && (st.name || st.name_vi)) || (st && st.id) || ""); }
// Current practice may carry a "<label>: " prefix; the card already says so, so drop it
// using the structured is_existing flag (not the prefix wording).
function stratName(st) {
    const v = viOf(st);
    let s = String((v && v.name) || rawName(st));
    const i = s.indexOf(": ");
    if (st && st.is_existing && i > 0 && i < 30) s = s.slice(i + 2);
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function sText(st, f) { const v = viOf(st); return v && v[f] !== undefined && v[f] !== null ? v[f] : st[f]; }
function evText(st, i) { const v = viOf(st); return (v && v.evidence_text && v.evidence_text[i]) || (st.evidence[i] || {}).text || ""; }
function phLabel(ph) { return (lang === "vi" && ph.label_vi) || ph.label; }
function rText(data, f) { return lang === "vi" && data.vi && data.vi[f] !== undefined && data.vi[f] !== null ? data.vi[f] : data[f]; }
function regionName() { return REGIONS_DATA[currentRegion].name; }
function labelMap() {
    const map = {};
    (lastRotations || []).forEach(st => (st.phases || []).forEach(ph => { if (ph.label) map[ph.label] = phLabel(ph); }));
    return map;
}
function waterLabel(st) {
    return st.water_full_year === false && st.water_months && st.water_months.length
        ? t("water_in", { m: monthSpans(st.water_months) }) : t("water_year");
}

// Animated numbers: rendered with their final text; count up from the previous value
function num(key, value, digits = 0, factor = 1) {
    const v = isNum(value) ? Number(value) * factor : null;
    return `<span class="num" data-k="${esc(key)}" data-v="${v === null ? "" : v}" data-d="${digits}">${v === null ? t("na") : fmt(v, digits)}</span>`;
}
function animateNums(root) {
    root.querySelectorAll(".num[data-k]").forEach(el => {
        const k = el.dataset.k, to = Number(el.dataset.v), d = Number(el.dataset.d) || 0;
        if (el.dataset.v === "" || Number.isNaN(to)) return;
        const from = isNum(prevNums[k]) ? prevNums[k] : 0;
        prevNums[k] = to;
        if (REDUCED || Math.abs(to - from) < Math.pow(10, -d)) return;
        const t0 = performance.now(), dur = 550;
        const step = now => {
            const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(from + (to - from) * e, d);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

// ==========================================================================
// APP START
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const qs = new URLSearchParams(location.search);
    if (REGIONS_DATA[qs.get("region")]) currentRegion = qs.get("region");
    let saved = null;
    try { saved = localStorage.getItem("aero-lang"); } catch (e) { saved = null; }
    const ql = qs.get("lang");
    lang = ql === "vi" || ql === "en" ? ql : (saved === "vi" ? "vi" : "en");

    captureStaticText();
    document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.region === currentRegion)));
    initControls();
    setLang(lang, false);
    initNav();
    loadRegionData();
});

function setLang(l, rerender = true) {
    lang = l === "vi" ? "vi" : "en";
    try { localStorage.setItem("aero-lang", lang); } catch (e) { /* storage blocked: keep in memory */ }
    document.documentElement.lang = lang;
    document.querySelectorAll("#langToggle button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    applyStaticText();
    document.getElementById("heroPlace").textContent = `${regionName()} · ${REGIONS_DATA[currentRegion].place[lang]}`;
    updateSliderLabels();
    renderStatusChips();
    const note = document.getElementById("reportLangNote");
    note.textContent = t("report_lang");
    note.hidden = !t("report_lang");
    if (!reportReady) resetReport();
    if (!rerender) return;
    if (lastRotationData) renderAll();
    if (lastCrops) renderCropTable(lastCrops);
    if (lastClimate) renderClimateChart();
}

// ==========================================================================
// EVENTS, SLIDERS, SCROLL UX
// ==========================================================================
function initControls() {
    document.querySelectorAll(".region-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.region === currentRegion) return;
            currentRegion = btn.dataset.region;
            selectedStrategy = null;
            selectedStrategyName = "";
            closeDrawer(false);
            document.querySelectorAll(".region-tab").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
            baselineDeficits = {};
            loadRegionData();
        });
    });
    document.querySelectorAll("#langToggle button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

    const sTemp = document.getElementById("sliderTemp");
    const sRain = document.getElementById("sliderRain");
    const onChange = () => { updateSliderLabels(); syncPresetChipState(); debouncedEvaluate(); };
    sTemp.addEventListener("input", onChange);
    sRain.addEventListener("input", onChange);
    document.getElementById("btnReset").addEventListener("click", () => { sTemp.value = "0"; sRain.value = "0"; onChange(); });
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => { sTemp.value = chip.dataset.temp; sRain.value = chip.dataset.rain; onChange(); });
    });

    document.getElementById("btnCsv").addEventListener("click", downloadCsv);
    document.getElementById("btnPrint").addEventListener("click", async () => {
        if (!reportReady) await loadReport();
        window.print();
    });
    document.getElementById("btnReport").addEventListener("click", () => { selectedStrategy = null; selectedStrategyName = ""; loadReport(); });

    document.addEventListener("click", e => {
        const more = e.target.closest(".more-btn");
        if (more) { openDrawer(more.closest(".rot-card, .ev-tile"), more); return; }
        if (e.target.closest("[data-close-drawer]")) { closeDrawer(); return; }
        const rep = e.target.closest(".card-report-btn");
        if (rep) {
            selectedStrategy = rep.dataset.strategy;
            selectedStrategyName = rep.dataset.name;
            closeDrawer(false);
            goTo("#reportSection", true);
            loadReport();
            return;
        }
        // In-page links switch screens (and open a closed <details> around the target)
        const a = e.target.closest('a[href^="#"]');
        if (a && a.getAttribute("href").length > 1) { e.preventDefault(); goTo(a.getAttribute("href"), true); }
    });
    document.addEventListener("keydown", e => {
        const d = document.getElementById("drawer");
        if (d.hidden) return;
        if (e.key === "Escape") { closeDrawer(); return; }
        if (e.key === "Tab") { // keep focus inside the open panel
            const f = [...d.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
    document.getElementById("techSection").addEventListener("toggle", () => { if (climateChart) climateChart.resize(); });
}

// ==========================================================================
// SCREENS: the side menu shows one step at a time; the URL hash keeps the place
// ==========================================================================
const STEPS = ["step1", "rotationsSection", "evidenceSection", "reportSection"];
let currentStep = null;

function showStep(id) {
    if (!STEPS.includes(id)) id = STEPS[0];
    const changed = id !== currentStep;
    currentStep = id;
    STEPS.forEach(s => { document.getElementById(s).hidden = s !== id; });
    document.querySelectorAll("#stepNav a[data-step]").forEach(a => {
        const on = a.dataset.step === id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (!changed) return;
    // Replay the staggered card entrance every time a screen opens
    const el = document.getElementById(id);
    el.classList.remove("seen");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("seen")));
    if (id === "reportSection" && climateChart) climateChart.resize();
}

// Go to a step, or to an element inside a step (opening any <details> around it)
function goTo(hash, push) {
    const target = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    const step = target ? (STEPS.includes(target.id) ? target : target.closest(".step")) : null;
    showStep(step ? step.id : STEPS[0]);
    if (push && location.hash !== hash) history.pushState(null, "", hash);
    if (target && target !== step) {
        let d = target.tagName === "DETAILS" ? target : target.closest("details");
        while (d) { d.open = true; d = d.parentElement && d.parentElement.closest("details"); }
        requestAnimationFrame(() => target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }));
    } else {
        window.scrollTo({ top: 0, behavior: "auto" });
    }
}

function initNav() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.addEventListener("popstate", () => goTo(location.hash, false));
    goTo(location.hash, false);
}

// ==========================================================================
// DETAIL PANEL: "Details" (option cards) and "See data" (evidence tiles)
// ==========================================================================
let drawerSrc = null, drawerReturn = null, drawerTimer = null;

function fillDrawer(host) {
    const isCard = !!host.dataset.strategyId;
    document.getElementById("drawerKicker").textContent = isCard
        ? t("details_k", { id: host.dataset.strategyId }) : (host.querySelector(".ev-kicker") || {}).textContent || t("see_data_k");
    document.getElementById("drawerTitle").innerHTML = (host.querySelector(".rot-name, .ev-title") || {}).innerHTML || "";
    document.getElementById("drawerBody").innerHTML = (host.querySelector(".more > div") || {}).innerHTML || "";
}

function openDrawer(host, trigger) {
    if (!host) return;
    drawerSrc = host.dataset.strategyId ? { card: host.dataset.strategyId } : { tile: host.id };
    drawerReturn = trigger || null;
    fillDrawer(host);
    const d = document.getElementById("drawer");
    clearTimeout(drawerTimer);
    d.hidden = false;
    document.body.classList.add("drawer-open");
    document.getElementById("drawerBody").scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("show")));
    document.getElementById("drawerClose").focus();
}

function closeDrawer(restoreFocus = true) {
    const d = document.getElementById("drawer");
    if (d.hidden) return;
    d.classList.remove("show");
    document.body.classList.remove("drawer-open");
    drawerSrc = null;
    drawerTimer = setTimeout(() => { d.hidden = true; }, REDUCED ? 0 : 280);
    if (restoreFocus && drawerReturn && document.contains(drawerReturn)) drawerReturn.focus();
    drawerReturn = null;
}

// Re-render (language, weather, region) keeps an open panel in sync, or closes it if its source is gone
function refreshDrawer() {
    if (!drawerSrc) return;
    const host = drawerSrc.card
        ? document.querySelector(`.rot-card[data-strategy-id="${CSS.escape(drawerSrc.card)}"]`)
        : document.getElementById(drawerSrc.tile);
    if (!host || host.hidden) { closeDrawer(false); return; }
    fillDrawer(host);
}

function updateSliderLabels() {
    const tv = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.getElementById("valTemp").textContent = tv === 0 ? t("as_today") : `${tv > 0 ? "+" : ""}${fmt(tv, 1)} °C`;
    document.getElementById("valRain").textContent = r === 0 ? t("as_today") : `${r > 0 ? "+" : ""}${r}%`;
    document.querySelectorAll(".slider-wrap input").forEach(inp => {
        const p = (Number(inp.value) - Number(inp.min)) / (Number(inp.max) - Number(inp.min));
        inp.parentElement.style.setProperty("--p", p.toFixed(3));
    });
    updateReportContext();
}

function syncPresetChipState() {
    const tv = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    document.querySelectorAll(".preset-chip").forEach(chip => {
        const on = Math.abs(tv - parseFloat(chip.dataset.temp)) < 0.05 && r === parseInt(chip.dataset.rain, 10);
        chip.classList.toggle("active", on);
        chip.setAttribute("aria-pressed", String(on));
    });
}

function scenarioBody() {
    return JSON.stringify({
        region: currentRegion,
        delta_temp_c: parseFloat(document.getElementById("sliderTemp").value),
        delta_rain_pct: parseFloat(document.getElementById("sliderRain").value)
    });
}

function setBusy(on) { document.getElementById("scenarioStatus").textContent = on ? t("updating") : ""; }

function debouncedEvaluate() {
    resetReport();
    if (simDebounceTimer) clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(async () => {
        setBusy(true);
        await Promise.all([loadRotations(), evaluateCrops()]);
        setBusy(false);
    }, 250);
}

// ==========================================================================
// DATA STATUS CHIPS
// ==========================================================================
async function updateStatusBar() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const status = await res.json();
        latestRegionStatus = status[currentRegion] || {};
        renderStatusChips();
    } catch (e) {
        console.error("Data status error:", e);
    }
}

function renderStatusChips() {
    const s = latestRegionStatus || {};
    updateChip("chip-power", "NASA POWER", s.power, t("u_days"));
    updateChip("chip-ndvi", "MODIS NDVI", s.ndvi, t("u_images"));
    updateChip("chip-sal", t("chip_sal"), s.salinity, t("u_rows"));
    const isSynth = Object.values(s).some(v => v && v.is_synthetic);
    document.getElementById("dataBadgeArea").innerHTML = isSynth ? `<div class="notice">${t("synth")}</div>` : "";
    if (lastRotationData) updateCrossChips(lastRotationData);
}

function updateChip(elementId, label, info, unit) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!info) { el.className = "chip chip-missing"; el.textContent = `${label}: ${t("chip_checking")}`; return; }
    if (!info.available) {
        el.className = "chip chip-missing";
        el.textContent = `${label}: ${t("not_avail")}`;
    } else if (info.is_synthetic) {
        el.className = "chip chip-synthetic";
        el.textContent = `${label}: ${t("demo")}`;
    } else {
        el.className = "chip chip-real";
        el.textContent = `${label}: ${t("measured", { n: fmt(info.rows), u: unit })}`;
    }
}

function crossChip(id, label, on, okText, reason) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = on ? "chip chip-real" : "chip chip-missing";
    el.textContent = `${label}: ${on ? okText : t("not_used")}`;
    el.title = on ? "" : (reason || "");
}

function updateCrossChips(data) {
    const xc = data.cross_checks || {};
    const rain = xc.rainfall || {}, sm = xc.soil_moisture || {}, ero = xc.erosion || {}, os = data.observed_sowing || {};
    crossChip("chip-imerg", "GPM IMERG", !!rain.available, `${fmt(rain.n_months)} ${t("u_months")}`, rain.reason);
    crossChip("chip-sm", t("chip_sm_label"), !!sm.available, `${fmt(sm.n_years_compared)} ${t("u_seasons")}`, sm.reason);
    crossChip("chip-srtm", "SRTM", !!ero.available && isNum(ero.slope_deg_p50), t("slope30"), ero.reason);
    crossChip("chip-mod09", "MODIS MOD09A1", !!os.available, `${fmt(os.n_composites_used)} ${t("u_images")}`, os.reason);
}

// ==========================================================================
// LOADING
// ==========================================================================
async function loadRegionData() {
    resetReport();
    lastRotationData = null;
    lastRotations = null;
    document.getElementById("heroPlace").textContent = `${regionName()} · ${REGIONS_DATA[currentRegion].place[lang]}`;
    document.getElementById("rotationCardsGrid").classList.add("loading");
    updateSliderLabels();
    await updateStatusBar();

    if (!latestRegionStatus.power || !latestRegionStatus.power.available) {
        show("chartWrapper", false); show("climateEmpty", true);
        show("rotationsContent", false); show("rotationsEmpty", true);
        show("cropTableWrapper", false); show("evaluateEmpty", true);
        document.getElementById("heroTitle").textContent = t("no_weather");
        document.getElementById("heroBody").innerHTML = "";
        return;
    }
    setBusy(true);
    await loadClimateChart();
    await loadRotations();
    await evaluateCrops();
    setBusy(false);
}

async function loadClimateChart() {
    try {
        const res = await fetch(`/api/climate?region=${encodeURIComponent(currentRegion)}`);
        const data = res.ok ? await res.json() : {};
        lastClimate = (data.climatology || []).length === 12 ? data.climatology : null;
        renderClimateChart();
    } catch (e) {
        lastClimate = null;
        renderClimateChart();
    }
}

function renderClimateChart() {
    const clim = lastClimate;
    if (!clim || typeof Chart === "undefined") {
        show("chartWrapper", false); show("climateEmpty", true);
        return;
    }
    show("chartWrapper", true); show("climateEmpty", false);
    if (climateChart) climateChart.destroy();
    climateChart = new Chart(document.getElementById("climateChart").getContext("2d"), {
        data: {
            labels: clim.map(c => mShort(c.month)),
            datasets: [
                { type: "bar", label: t("ch_power"), data: clim.map(c => c.rain_mm), backgroundColor: "rgba(3, 105, 161, 0.8)", borderRadius: 2, order: 2 },
                { type: "line", label: t("ch_eto"), data: clim.map(c => c.eto_mm), borderColor: "#b45309", backgroundColor: "#b45309", borderWidth: 2, pointRadius: 2.5, tension: 0.3, order: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            locale: loc(),
            animation: REDUCED ? false : { duration: 400 },
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "top", align: "end", labels: { color: "#334155", usePointStyle: true, boxWidth: 6, font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "#f1f5f9" }, title: { display: true, text: t("ch_unit"), color: "#64748b", font: { size: 11 } } }
            }
        }
    });
    if (lastRotationData && lastRotationData.region_id === currentRegion) applyImergSeries(lastRotationData);
}

async function loadRotations() {
    try {
        const res = await fetch("/api/rotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: scenarioBody() });
        if (!res.ok) { show("rotationsContent", false); show("rotationsEmpty", true); return; }
        const data = await res.json();
        show("rotationsContent", true); show("rotationsEmpty", false);
        const strategies = (data.strategies || []).slice().sort((a, b) => (b.is_existing ? 1 : 0) - (a.is_existing ? 1 : 0));
        const tv = parseFloat(document.getElementById("sliderTemp").value);
        const r = parseInt(document.getElementById("sliderRain").value, 10);
        if (Math.abs(tv) < 0.01 && r === 0) {
            strategies.forEach(s => { if (isNum(s.annual_deficit_mm)) baselineDeficits[s.id] = s.annual_deficit_mm; });
        }
        lastRotations = strategies;
        lastRotationData = data;
        renderAll();
    } catch (e) {
        console.error("Rotation render error:", e);
        show("rotationsContent", false); show("rotationsEmpty", true);
    }
}

function renderAll() {
    const data = lastRotationData, strategies = lastRotations;
    document.getElementById("rotationCardsGrid").classList.remove("loading");
    renderHero(data, strategies);
    renderStrategyCards(data, strategies);
    renderCrossChecks(data);
    renderNdviStrip(data, strategies);
    renderAssumptionsBox(data);
    updateReportContext();
    refreshDrawer();
}

// ==========================================================================
// STEP 1: THE ANSWER
// ==========================================================================
// Per-year comparison of two strategies: in how many matched crop years is `a` below/above `b`?
function yearsCompare(a, b, wantLower) {
    const bMap = new Map((b.annual_deficit_by_year || []).map(y => [stressKey(y), y]));
    let n = 0, m = 0, first = null;
    (a.annual_deficit_by_year || []).forEach(y => {
        const o = bMap.get(stressKey(y));
        if (!o || !isNum(y.deficit_mm) || !isNum(o.deficit_mm)) return;
        m += 1;
        if (first === null || Number(y.crop_year) < first) first = Number(y.crop_year);
        if (wantLower ? y.deficit_mm < o.deficit_mm : y.deficit_mm > o.deficit_mm) n += 1;
    });
    if (!m) return "";
    return n === m ? t("years_all", { y: first }) : t("years_some", { n, m });
}

function renderHero(data, strategies) {
    const titleEl = document.getElementById("heroTitle");
    const bodyEl = document.getElementById("heroBody");
    const base = strategies.find(s => s.is_existing);
    if (!base || !isNum(base.annual_deficit_mm)) { titleEl.textContent = t("no_base"); bodyEl.innerHTML = ""; return; }

    const alts = strategies.filter(s => !s.is_existing && !s.partial && isNum(s.annual_deficit_mm))
        .sort((a, b) => a.annual_deficit_mm - b.annual_deficit_mm);
    const best = alts[0];
    const ero = data.cross_checks && data.cross_checks.erosion;
    const baseDef = base.annual_deficit_mm;
    let answer = "", saving = null;
    if (best && best.annual_deficit_mm < baseDef) {
        saving = Math.round((baseDef - best.annual_deficit_mm) / baseDef * 100);
        answer = t("ans_better", { region: regionName(), best: stratName(best), pct: saving, base: stratName(base), years: yearsCompare(best, base, true) });
    } else if (best) {
        const more = Math.round((best.annual_deficit_mm - baseDef) / baseDef * 100);
        const eroTxt = ero && ero.available && ero.compared_strategy === best.id ? t("ans_ero", { pct: fmt(ero.reduction_pct, 0) }) : "";
        answer = t("ans_none", { region: regionName(), base: stratName(base), alt: stratName(best), pct: more,
            months: base.water_full_year === false && (base.water_months || []).length ? t("ans_months", { m: monthSpans(base.water_months) }) : "",
            years: yearsCompare(best, base, false), ero: eroTxt });
    }
    titleEl.innerHTML = answer || esc(stratName(base));

    // Tiles: water today, best saving (or extra water), salt months / slope / bare months
    const scenOn = parseFloat(document.getElementById("sliderTemp").value) !== 0 || parseInt(document.getElementById("sliderRain").value, 10) !== 0;
    const when = base.water_full_year === false && (base.water_months || []).length ? t("when_in", { m: monthSpans(base.water_months) }) : t("when_year");
    const tile = (cls, icCls, icon, lbl, numHtml, sub, extra = "") => `<div class="tile${cls ? " " + cls : ""}">
        <div class="tile-head"><span class="ic${icCls ? " " + icCls : ""}">${ico(icon)}</span><span class="tile-lbl">${lbl}</span></div>
        <div class="tile-num">${numHtml}</div><div class="tile-sub">${sub}</div>${extra}</div>`;
    const tiles = [tile("", "", "drop", t(scenOn ? "tile_water_scen" : "tile_water"),
        `${num("w-" + currentRegion, baseDef, 0, 10)} <small>m³/ha</small>`, t("tile_water_sub", { v: fmt(baseDef), when }))];
    if (saving !== null) {
        tiles.push(tile("good", "ic-good", "down", t("tile_best"), `−${num("s-" + currentRegion, saving)}%`, t("tile_with", { name: stratName(best) })));
    } else if (best) {
        const more = Math.round((best.annual_deficit_mm - baseDef) / baseDef * 100);
        tiles.push(tile("", "ic-heat", "up", t("tile_more"), `+${num("s-" + currentRegion, more)}%`, stratName(best)));
    }
    const sal = (data.salinity_months || []).map(Number);
    if (sal.length) {
        let dots = "";
        for (let m = 1; m <= 12; m++) dots += `<span class="${sal.includes(m) ? "on" : ""}" title="${MONTHS_LONG[lang][m - 1]}${sal.includes(m) ? t("sal_tip") : ""}"><i></i>${mInitial(m)}</span>`;
        tiles.push(tile("sal", "ic-sal", "waves", t("tile_sal"), monthSpans(sal), t("tile_sal_sub", { n: sal.length }),
            `<div class="sal-dots" role="img" aria-label="${esc(t("tile_sal") + ": " + monthSpans(sal))}">${dots}</div>`));
    } else if (ero && ero.available && isNum(ero.slope_deg_p50)) {
        tiles.push(tile("", "ic-earth", "mountain", t("tile_slope"), `${fixed(ero.slope_deg_p50, 1)}°`,
            t("tile_slope_sub", { p90: fixed(ero.slope_deg_p90, 1), share: Math.round(ero.wet_season_rain_share * 100), m: monthSpans(ero.wet_season_months || []) })));
    } else {
        tiles.push(tile("", "ic-earth", "layers", t("tile_bare"), `${(base.bare_months || []).length} <small>${t("months")}</small>`, t("tile_bare_sub")));
    }

    let scen = "";
    const tv = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const b0 = baselineDeficits[base.id];
    if ((tv !== 0 || r !== 0) && isNum(b0)) {
        const d = Math.round((baseDef - b0) * 10);
        scen = `<p class="hero-scen">${t(d >= 0 ? "scen_more" : "scen_less", { w: scenarioText(tv, r), d: fmt(Math.abs(d)) })}</p>`;
    }
    bodyEl.innerHTML = `<div class="tiles">${tiles.join("")}</div>${scen}<p class="hero-note">${ico("info")}<span>${t("ans_note")}</span></p>`;
    animateNums(bodyEl);
}

// ==========================================================================
// STEP 2: OPTION CARDS
// ==========================================================================
// Stress years are matched on crop_year AND label: a strategy whose years are
// calendar years ("2015") must not inherit a "2015/16" dry-season event.
function stressKey(y) { return `${Number(y.crop_year)}|${y.label}`; }

function plainLine(st, base) {
    const items = (st.phases || []).map(ph => {
        const win = ph.window && ph.window.start ? `, ${dayMonth(ph.window.start)}–${dayMonth(ph.window.end)}` : "";
        return ph.modeled && isNum(ph.deficit_mm)
            ? `<li>${phLabel(ph)}${win}: ${t("supply", { v: fmt(ph.deficit_mm) })}</li>`
            : `<li>${phLabel(ph)}${win}: ${t("water_nm")}</li>`;
    });
    let total = "";
    if (isNum(st.annual_deficit_mm)) {
        total = `${st.water_full_year === false ? t("these_months") : t("whole_year")}: <b>${fmt(st.annual_deficit_mm)} m³</b>`;
        if (!st.is_existing && base && isNum(base.annual_deficit_mm)) {
            const d = Math.round(st.annual_deficit_mm - base.annual_deficit_mm);
            total += d < 0 ? t("less_cur", { v: fmt(-d) }) : (d > 0 ? t("more_cur", { v: fmt(d) }) : t("same_cur"));
            if (st.partial) total += ` (${t("shrimp_nm")})`;
        }
        total += ".";
    }
    return `<div class="sub-block" title="${esc(t("plain_tip"))}"><h4>${t("h_per1000")}</h4><ul>${items.join("")}</ul>${total ? `<p>${total}</p>` : ""}</div>`;
}

function yearLine(st) {
    const p50 = st.annual_deficit_p50_mm, p80 = st.annual_deficit_p80_mm;
    if (!isNum(p50) && !isNum(p80)) return "";
    const dry = st.driest_crop_year;
    const tip = dry && dry.label ? ` title="${esc(t("driest", { y: dry.label, v: m3(dry.deficit_mm) }))}"` : "";
    return `<p class="yr-line"${tip}>${t("yr_line", { a: m3(p50), b: m3(p80) })}</p>`;
}

// One bar per crop year; documented stress years in salinity red with event + source
function yearStrip(st, stressYears) {
    const yrs = (st.annual_deficit_by_year || []).filter(y => y && y.label);
    if (!yrs.length) return "";
    const max = Math.max(0, ...yrs.map(y => y.deficit_mm).filter(isNum));
    const stress = new Map((stressYears || []).map(s => [stressKey(s), s]));
    const bars = yrs.map(y => {
        const s = stress.get(stressKey(y));
        const h = isNum(y.deficit_mm) && max > 0 ? Math.max(6, y.deficit_mm / max * 100) : 0;
        let tip = `${y.label}: ${isNum(y.deficit_mm) ? `${m3(y.deficit_mm)} m³/ha` : t("no_data")}`;
        if (s) tip += ` · ${(lang === "vi" && s.event_vi) || s.event} (${s.source}${s.verified === false ? "; " + t("nyv") : ""})`;
        return `<span class="yr-bar${s ? " stress" : ""}" style="height:${h.toFixed(0)}%" title="${esc(tip)}"></span>`;
    }).join("");
    return `<h4>${t("h_years")}</h4>
        <div class="yr-strip" role="img" aria-label="${esc(t("yr_aria", { a: yrs[0].label, b: yrs[yrs.length - 1].label }))}">${bars}</div>
        <div class="yr-axis"><span>${yrs[0].label}</span><span>${t("yr_axis")}</span><span>${yrs[yrs.length - 1].label}</span></div>`;
}

// 12-month calendar; labels in the calendar use the phase label of the API (English key)
function renderGanttTimeline(st, salMonths, usedCrops) {
    const cropByLabel = {}, nameByLabel = {};
    (st.phases || []).forEach(ph => { cropByLabel[ph.label] = cropKey(ph.crop); nameByLabel[ph.label] = phLabel(ph); });
    let head = "";
    for (let m = 1; m <= 12; m++) {
        const isSal = salMonths.has(m);
        head += `<span class="${isSal ? "sal" : ""}" title="${MONTHS_LONG[lang][m - 1]}${isSal ? t("sal_tip") : ""}">${mInitial(m)}</span>`;
    }
    const blocks = [];
    (st.calendar || []).forEach(mc => {
        const key = mc.bare ? "__bare__" : (mc.phase_label || "");
        const last = blocks[blocks.length - 1];
        if (last && last.key === key) last.months.push(mc);
        else blocks.push({ key, bare: !!mc.bare, label: mc.phase_label, months: [mc] });
    });
    const segs = blocks.map(b => {
        const span = b.months.length;
        const style = `grid-column: span ${span};`;
        if (b.bare) return `<div class="gantt-seg bare" style="${style}" title="${esc(t("bare_tip"))}">${span >= 2 ? t("bare") : ""}</div>`;
        const ck = cropByLabel[b.label] || "other";
        usedCrops.add(ck);
        const heat = b.months.some(mc => isNum(mc.heat_ratio) && mc.heat_ratio > 0) ? `<span class="gantt-heat-dot" title="${esc(t("heat_tip"))}"></span>` : "";
        return `<div class="gantt-seg crop-${ck}" style="${style}" title="${esc(nameByLabel[b.label] || b.label)}">${heat}${span >= 2 ? t("crop_" + ck) : ""}</div>`;
    }).join("");
    return `<div class="cal-scroll"><div class="gantt"><div class="gantt-head">${head}</div><div class="gantt-bar">${segs}</div></div></div>`;
}

function erosionForCard(st, ero) {
    if (!ero || !ero.available || st.id !== ero.compared_strategy) return "";
    const lbl = ero.c_labels || {};
    const site = isNum(ero.slope_deg_p50) ? `<p class="muted">${t("ero_site", { a: fixed(ero.slope_deg_p50, 1), b: fixed(ero.slope_deg_p90, 1),
        s: Math.round(ero.wet_season_rain_share * 100), m: monthSpans(ero.wet_season_months || []) })}</p>` : "";
    return `<div class="sub-block"><h4>${t("ero_h")}</h4>
        <p title="${esc((ero.caveats || []).join(" "))}">${t("ero_line", { p: fmt(ero.reduction_pct, 0), v: ero.verified === false ? "; " + t("nyv") : "" })}</p>${site}
        <ul class="src-list"><li>${t("ero_c", { cb: ero.c_baseline, lb: lbl[ero.baseline_strategy] || ero.baseline_strategy, cc: ero.c_compared, lc: lbl[ero.compared_strategy] || ero.compared_strategy, r: ero.soil_loss_ratio })}</li>
        ${(ero.caveats || []).map(c => `<li>${c}</li>`).join("")}
        <li>${ero.c_source}${ero.verified === false ? " - " + t("nyv") : ""}</li>${ero.slope_source ? `<li>${ero.slope_source}</li>` : ""}${ero.rain_source ? `<li>${ero.rain_source}</li>` : ""}</ul></div>`;
}

function renderStrategyCards(data, strategies) {
    const grid = document.getElementById("rotationCardsGrid");
    const base = strategies.find(s => s.is_existing);
    const salMonths = new Set((data.salinity_months || []).map(Number));
    const stressYears = Array.isArray(data.stress_years) ? data.stress_years : [];
    const erosion = (data.cross_checks && data.cross_checks.erosion) || null;
    const usedCrops = new Set();
    const maxDef = Math.max(0, ...strategies.map(s => s.annual_deficit_mm).filter(isNum));
    const pctW = v => (isNum(v) && maxDef > 0 ? (v / maxDef * 100).toFixed(1) : "0");

    // The lowest-water complete option that beats current practice gets the green border
    const bestAlt = strategies.filter(s => !s.is_existing && !s.partial && isNum(s.annual_deficit_mm) && base && isNum(base.annual_deficit_mm) && s.annual_deficit_mm < base.annual_deficit_mm)
        .sort((a, b) => a.annual_deficit_mm - b.annual_deficit_mm)[0];

    grid.innerHTML = strategies.map((st, i) => {
        const def = st.annual_deficit_mm;
        const bareN = (st.bare_months || []).length;
        let badge = "", rel = "", relCls = "", relIco = "";
        const hasBase = base && isNum(def) && isNum(base.annual_deficit_mm) && base.annual_deficit_mm > 0;
        const pct = hasBase ? Math.round((base.annual_deficit_mm - def) / base.annual_deficit_mm * 100) : null;
        if (st.is_existing) badge = `<span class="badge current">${ico("pin")}${t("badge_current")}</span>`;
        else if (st.partial) badge = `<span class="badge neutral">${ico("info")}${t("badge_shrimp")}</span>`;
        else if (pct > 0) badge = `<span class="badge saved">${ico("down")}${t("badge_saves", { p: pct })}</span>`;
        else if (pct < 0) badge = `<span class="badge neutral">${ico("up")}${t("badge_more", { p: -pct })}</span>`;
        if (st.is_existing) rel = t("rel_base");
        else if (pct !== null) {
            rel = pct > 0 ? t("rel_less", { p: pct }) : pct < 0 ? t("rel_more", { p: -pct }) : t("rel_same");
            relCls = pct > 0 ? " good" : pct < 0 ? " more" : "";
            relIco = pct > 0 ? ico("down") : pct < 0 ? ico("up") : "";
        }
        const cmp = `<div class="cmp" role="img" aria-label="${esc(rel)}"><span>${esc(st.id)}</span><div class="cmp-bar"><span style="width:${pctW(def)}%"></span></div>${base && !st.is_existing
            ? `<span>${esc(base.id)}</span><div class="cmp-bar base"><span style="width:${pctW(base.annual_deficit_mm)}%"></span></div>` : ""}</div>`;
        const relLine = `<p class="rel-lbl${relCls}">${relIco}${rel}</p>`;
        const calLbl = `<p class="cal-lbl">${bareN ? t("bare_n", { n: bareN }) : t("bare_none")}</p>`;

        let delta = "";
        const b0 = baselineDeficits[st.id];
        if (isNum(def) && isNum(b0) && Math.abs(def - b0) > 1.0) {
            const dm = Math.round((def - b0) * 10);
            delta = `<span class="delta ${dm > 0 ? "up" : "down"}">(${dm > 0 ? "+" : "−"}${fmt(Math.abs(dm))} m³)</span>`;
        }
        const benefits = sText(st, "benefits") || [], risks = sText(st, "risks") || [], gaps = sText(st, "info_gaps") || [];
        const top = [benefits[0] ? `<li class="good-item">${benefits[0]}</li>` : "", risks[0] ? `<li class="risk-item">${risks[0]}</li>` : ""].join("");
        const evidence = (st.evidence || []).map((ev, k) =>
            `<li>${evText(st, k)} <span class="muted">(${ev.source}${ev.verified === false ? " - " + t("nyv") : ""})</span></li>`).join("");
        const calc = (st.phases || []).map(ph => {
            const win = ph.window && ph.window.start ? ` (${ph.window.start} ${t("to")} ${ph.window.end})` : "";
            if (!ph.modeled) return `<li><strong>${phLabel(ph)}</strong>${win}: ${t("calc_nm")}</li>`;
            const extra = isNum(ph.assumed_extra_mm) && ph.assumed_extra_mm > 0 ? t("calc_extra", { v: fmt(ph.assumed_extra_mm) }) : "";
            const low = isNum(ph.deficit_low_mm) && isNum(ph.deficit_mm) && ph.deficit_mm - ph.deficit_low_mm >= 1 ? t("calc_low", { v: fmt(ph.deficit_low_mm) }) : "";
            return `<li><strong>${phLabel(ph)}</strong>${win}: ${t("calc_line", { etc: fmt(ph.etc_mm), extra, presat: ph.presaturated ? t("calc_presat") : "", pe: fmt(ph.peff_mm), d: fmt(ph.deficit_mm), low })}</li>`;
        }).join("");
        const lowRange = isNum(st.annual_deficit_low_mm) && isNum(def) && def - st.annual_deficit_low_mm >= 1 ? `<p class="muted">${t("low_range", { v: m3(st.annual_deficit_low_mm) })}</p>` : "";
        const note = sText(st, "note");
        const list = (h, arr, cls) => (arr.length ? `<div><h4>${h}</h4><ul class="bullet-list">${arr.map(x => `<li class="${cls}">${x}</li>`).join("")}</ul></div>` : "");
        const water = `<div class="metric-val">${num("d-" + currentRegion + st.id, def, 0, 10)} <small>m³/ha</small>${delta}</div>
            <div class="metric-lbl">${waterLabel(st)}${st.partial ? ` · ${t("shrimp_nm")}` : ""} · ${t("per1000", { v: fmt(def) })}</div>`;

        return `
        <article class="rot-card reveal${st.is_existing ? " is-baseline" : ""}${bestAlt && bestAlt.id === st.id ? " is-best" : ""}" data-strategy-id="${esc(st.id)}" style="--i:${i}">
            <div class="rot-top">${badge}<h3 class="rot-title"><span class="rot-id">${esc(st.id)}</span><span class="rot-name">${stratName(st)}</span></h3></div>
            <div>${water}</div>
            ${cmp}
            ${relLine}
            ${yearLine(st)}
            ${calLbl}
            ${renderGanttTimeline(st, salMonths, usedCrops)}
            ${top ? `<ul class="bullet-list top">${top}</ul>` : ""}
            <button type="button" class="more-btn" aria-haspopup="dialog">${t("details")}${ico("chev")}</button>
            <div class="more"><div>
                <div>${water}</div>
                ${cmp}
                ${relLine}
                ${yearLine(st)}
                ${calLbl}
                ${renderGanttTimeline(st, salMonths, new Set())}
                ${yearStrip(st, stressYears)}
                ${lowRange}
                ${plainLine(st, base)}
                ${note ? `<p class="science-note${st.partial ? " shrimp" : ""}">${note}</p>` : ""}
                ${erosionForCard(st, erosion)}
                <div class="bri">${list(t("h_benefits"), benefits, "good-item")}${list(t("h_risks"), risks, "risk-item")}${list(t("h_gaps"), gaps, "gap-item")}</div>
                ${evidence ? `<h4>${t("h_sources")}</h4><ul class="src-list">${evidence}</ul>` : ""}
                ${calc ? `<h4>${t("h_calc")}</h4><ul class="src-list">${calc}</ul>` : ""}
                ${st.partial ? `<p class="muted">${t("shrimp_total")}</p>` : ""}
                <button type="button" class="card-report-btn" data-strategy="${esc(st.id)}" data-name="${esc(stratName(st))}">${t("view_report")}</button>
            </div></div>
        </article>`;
    }).join("");
    animateNums(grid);

    const items = KNOWN_CROPS.filter(k => usedCrops.has(k))
        .map(k => `<span class="legend-item"><span class="swatch" style="background:var(--c-${k});"></span>${t("crop_" + k)}</span>`);
    items.push(`<span class="legend-item"><span class="swatch" style="background:var(--c-bare);"></span>${t("bare")}</span>`);
    if (salMonths.size) items.push(`<span class="legend-item"><span class="swatch line"></span>${t("legend_sal")}</span>`);
    if (stressYears.length) items.push(`<span class="legend-item"><span class="swatch" style="background:var(--sal);"></span>${t("legend_stress")}</span>`);
    document.getElementById("rotationLegend").innerHTML = items.join("");
}

// ==========================================================================
// STEP 3: SATELLITE EVIDENCE TILES (observed_sowing, cross_checks)
// ==========================================================================
function renderCrossChecks(data) {
    renderSowing(data);
    applyImergSeries(data);
    renderRainCheck(data);
    renderSmap(data);
    renderErosionTile(data);
    updateCrossChips(data);
}

const EV_ICONS = { sowingCheck: ["sprout", "ic-good"], rainCheck: ["rain", ""], smapCard: ["layers", "ic-earth"], erosionCheck: ["mountain", "ic-earth"] };
function evTile(el, kicker, title, take, sub, body) {
    const [icon, icCls] = EV_ICONS[el.id] || ["sat", ""];
    el.innerHTML = `<div class="ev-top"><span class="ic ${icCls}">${ico(icon)}</span><span class="ev-kicker">${kicker}</span></div>
        <h3 class="ev-title">${title}</h3><p class="ev-take">${take}</p>${sub || ""}
        <button type="button" class="more-btn link" aria-haspopup="dialog">${t("see_data")}${ico("chev")}</button>
        <div class="more"><div>${body}</div></div>`;
    el.classList.add("reveal");
    el.style.setProperty("--i", Object.keys(EV_ICONS).indexOf(el.id));
    el.hidden = false;
}
function hideTile(el) { el.hidden = true; el.innerHTML = ""; }

function renderSowing(data) {
    const el = document.getElementById("sowingCheck");
    const os = data.observed_sowing;
    if (!os || !os.available) { hideTile(el); return; }
    const names = labelMap();
    const nm = l => names[l] || l;
    const phases = os.phases || [];
    const lines = phases.map(ph => {
        const date = dayMonth(ph.configured_start);
        const n = Number(ph.n_detected) || 0;
        if (!n || !isNum(ph.median_offset_days)) return `<li>${t("sow_none", { phase: nm(ph.label), date })}</li>`;
        const d = Math.round(ph.median_offset_days);
        const rel = d === 0 ? t("sow_on", { date }) : t("sow_rel", { d: fmt(Math.abs(d)), dir: t(d > 0 ? "after" : "before"), date });
        return `<li>${t("sow_line", { phase: nm(ph.label), rel, n })}</li>`;
    });
    const main = phases.filter(p => Number(p.n_detected) > 0 && isNum(p.median_offset_days)).sort((a, b) => b.n_detected - a.n_detected)[0];
    let take = "";
    if (main) {
        const d = Math.round(main.median_offset_days), date = dayMonth(main.configured_start);
        take = d === 0 ? t("sow_take_same", { phase: nm(main.label), date, n: main.n_detected })
            : t("sow_take", { phase: nm(main.label), d: fmt(Math.abs(d)), dir: t(d > 0 ? "after" : "before"), date, n: main.n_detected });
    }
    const spy = Object.entries(os.seasons_per_year || {}).sort((a, b) => a[0].localeCompare(b[0]));
    const expected = phases.length;
    const low = spy.filter(([, n]) => Number(n) < expected);
    const none = spy.filter(([, n]) => Number(n) === 0).map(([y]) => y);
    const gt = (os.ground_truth_checks || []).map(g => {
        const diff = Number(g.difference_days);
        const rel = !isNum(g.difference_days) ? "" : diff === 0 ? t("d_same") : t(diff < 0 ? "d_earlier" : "d_later", { n: fmt(Math.abs(diff)) });
        return `<p class="ev-sub" title="${esc(g.text)}">${t("sow_gt", { r: `${g.approximate ? "~" : ""}${fmtDate(g.date)}`, s: g.detected_date ? fmtDate(g.detected_date) : t("not_detected"), rel })}
            <span class="muted">${g.source}${g.verified === false ? "; " + t("nyv") : ""}</span></p>`;
    }).join("");
    const clouds = low.length ? `<p class="ev-sub warn">${ico("warn")}<span>${t("sow_clouds", { e: expected, n: low.length, m: spy.length })}</span></p>` : "";
    const years = spy.map(([y, n]) => `<span class="sow-yr${Number(n) < expected ? " low" : ""}">${y}: <b>${n}</b></span>`).join("");
    const gap = low.length ? `<p class="muted">${t("sow_gap", { n: low.length, m: spy.length, e: expected, none: none.length ? t("sow_gap_none", { y: none.join(t("and")) }) : "" })}</p>` : "";
    const nUn = Number(os.n_unmatched) || 0;
    const unmatched = nUn ? `<p class="muted">${t("sow_unm", { n: nUn, d: fmt(os.max_offset_days) })}</p>` : "";
    const events = (os.events || []).map(e => e.phase_label
        ? `<tr><td>${fmtDate(e.date)}</td><td>${nm(e.phase_label)}</td><td class="num">${signed(e.offset_days, 0)} ${t("days")}</td></tr>`
        : `<tr><td>${fmtDate(e.date)}</td><td class="muted">${t("sow_unm_row", { d: fmt(os.max_offset_days) })}</td><td class="num">${t("na")}</td></tr>`).join("");
    const body = `<ul class="src-list">${lines.join("")}</ul>
        <div class="sow-years"><span>${t("sow_years")}</span>${years}</div>${gap}${unmatched}
        ${os.expected_error ? `<p class="muted">${t("exp_err")} ${os.expected_error}</p>` : ""}
        <div class="table-scroll"><table class="table-clean xc-table"><thead><tr><th>${t("th_detected")}</th><th>${t("th_season")}</th><th class="num">${t("th_vsmodel")}</th></tr></thead><tbody>${events}</tbody></table></div>
        <p><strong>${t("method")}</strong> ${os.method || ""} <span class="muted">(${os.method_source || ""})</span></p>
        ${os.assumptions ? `<p><strong>${t("assumptions")}</strong> ${os.assumptions}</p>` : ""}
        <p><strong>${t("data")}</strong> ${os.source || ""}${isNum(os.n_composites_used) ? t("images_used", { n: fmt(os.n_composites_used) }) : ""}.</p>
        ${(os.ground_truth_checks || []).map(g => `<p><strong>${t("ground")}</strong> ${g.text} <span class="muted">(${g.source})</span></p>`).join("")}`;
    evTile(el, t("ev_sow_k"), t("ev_sow_t"), take, gt + clouds, body);
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
        ds.push({ id: "imerg", type: "bar", label: t("ch_imerg"), data: MONTHS.en.map((_, k) => byMonth[k + 1]),
            backgroundColor: "rgba(125, 211, 252, 0.9)", borderRadius: 2, order: 3 });
    }
    climateChart.update("none");
}

function renderRainCheck(data) {
    const el = document.getElementById("rainCheck");
    const rain = data.cross_checks && data.cross_checks.rainfall;
    if (!rain || !rain.available) { hideTile(el); return; }
    const pct = isNum(rain.annual_ratio_imerg_to_power) ? (rain.annual_ratio_imerg_to_power - 1) * 100 : null;
    const r = fixed(rain.monthly_correlation, 2);
    const take = t("rain_take", { a: fmt(rain.annual_power_mm), b: fmt(rain.annual_imerg_mm), p: fixed(Math.abs(pct || 0), 1), r });
    const line = t("rain_line", { a: fmt(rain.annual_power_mm), b: fmt(rain.annual_imerg_mm), p: fixed(Math.abs(pct || 0), 1),
        hl: t(pct >= 0 ? "higher" : "lower"), r, n: fmt(rain.n_months), per: rain.period ? `${rain.period[0]} – ${rain.period[1]}` : "" });
    const rows = (rain.monthly || []).map(m => `<tr><td>${mShort(m.month)}</td><td class="num">${fmt(m.power_mm, 1)}</td><td class="num">${fmt(m.imerg_mm, 1)}</td></tr>`).join("");
    const body = `<p>${line}</p>
        <div class="table-scroll"><table class="table-clean xc-table"><thead><tr><th>${t("th_month")}</th><th class="num">${t("th_power")}</th><th class="num">${t("th_imerg")}</th></tr></thead><tbody>${rows}</tbody></table></div>
        <ul class="src-list"><li>${rain.source_power}</li><li>${rain.source_imerg}</li></ul>`;
    evTile(el, t("ev_rain_k"), t("ev_rain_t"), take, "", body);
}

function renderSmap(data) {
    const el = document.getElementById("smapCard");
    const sm = data.cross_checks && data.cross_checks.soil_moisture;
    if (!sm || !sm.available || !(sm.by_year || []).length) { hideTile(el); return; }
    const yrs = sm.by_year;
    const maxA = Math.max(...yrs.map(y => Math.abs(Number(y.anomaly) || 0)), 1e-9);
    const smDry = yrs.filter(y => isNum(y.anomaly)).reduce((a, b) => (b.anomaly < a.anomaly ? b : a));
    const mDry = yrs.filter(y => isNum(y.modeled_deficit_mm)).reduce((a, b) => (b.modeled_deficit_mm > a.modeled_deficit_mm ? b : a));
    const strat = (lastRotations || []).find(s => s.id === sm.strategy_id);
    const months = monthSpans(sm.months || []);
    const r = signed(sm.correlation_anomaly_vs_deficit, 2);
    const agree = sm.agrees_driest_year ? t("smap_agree", { a: smDry.year }) : t("smap_differ", { a: smDry.year, b: mDry.year });
    const take = t("smap_take", { r, n: fmt(sm.n_years_compared), m: months, agree });
    const rows = yrs.map(y => {
        const a = Number(y.anomaly);
        const w = isNum(y.anomaly) ? (Math.abs(a) / maxA * 50).toFixed(1) : 0;
        const bar = `<span class="anom"><i class="${a < 0 ? "dry" : "wet"}" style="width:${w}%;${a < 0 ? "right:50%" : "left:50%"}"></i></span>`;
        return `<tr${y.year === smDry.year || y.year === mDry.year ? ' class="hl"' : ""}><td>${y.year}</td><td class="num">${signed(y.anomaly, 3)}</td><td>${bar}</td><td class="num">${m3(y.modeled_deficit_mm)}</td></tr>`;
    }).join("");
    const body = `<p>${t("smap_line", { for: strat ? t("smap_for", { name: stratName(strat) }) : "", r, n: fmt(sm.n_years_compared) })} ${agree}</p>
        <div class="table-scroll"><table class="table-clean xc-table"><thead><tr><th>${t("th_year")}</th><th class="num">${t("th_anom")}</th><th>${t("th_dw")}</th><th class="num">${t("th_model")}</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="muted">${t("source")} ${sm.source}.</p>`;
    evTile(el, t("ev_smap_k"), t("ev_smap_t"), take, "", body);
}

function renderErosionTile(data) {
    const el = document.getElementById("erosionCheck");
    const ero = data.cross_checks && data.cross_checks.erosion;
    if (!ero || !ero.available) { hideTile(el); return; }
    const take = t("ero_take", { p: fmt(ero.reduction_pct, 0), v: ero.verified === false ? "; " + t("nyv") : "" });
    const sub = isNum(ero.slope_deg_p50) ? `<p class="ev-sub">${t("ero_take2", { a: fixed(ero.slope_deg_p50, 1), b: fixed(ero.slope_deg_p90, 1),
        s: Math.round(ero.wet_season_rain_share * 100), m: monthSpans(ero.wet_season_months || []) })}</p>` : "";
    const lbl = ero.c_labels || {};
    const body = `<ul class="src-list"><li>${t("ero_c", { cb: ero.c_baseline, lb: lbl[ero.baseline_strategy] || ero.baseline_strategy, cc: ero.c_compared, lc: lbl[ero.compared_strategy] || ero.compared_strategy, r: ero.soil_loss_ratio })}</li>
        ${(ero.caveats || []).map(c => `<li>${c}</li>`).join("")}</ul>
        <ul class="src-list"><li>${ero.c_source}${ero.verified === false ? " - " + t("nyv") : ""}</li>${ero.slope_source ? `<li>${ero.slope_source}</li>` : ""}${ero.rain_source ? `<li>${ero.rain_source}</li>` : ""}</ul>`;
    evTile(el, t("ev_ero_k"), t("ev_ero_t"), take, sub, body);
}

// ==========================================================================
// STEP 4 EXPERT: NDVI, ASSUMPTIONS, CROP TABLE
// ==========================================================================
function renderNdviStrip(data, strategies) {
    const el = document.getElementById("ndviStrip");
    const ndvi = Array.isArray(data.ndvi_monthly) ? data.ndvi_monthly : [];
    let html = "";
    for (let m = 1; m <= 12; m++) {
        const v = isNum(ndvi[m - 1]) ? Number(ndvi[m - 1]) : null;
        if (v === null) { html += `<div class="ndvi-cell na"><span>${mShort(m)}</span><b>–</b></div>`; continue; }
        const n = Math.max(0, Math.min(1, v));
        html += `<div class="ndvi-cell${n >= 0.5 ? " dark" : ""}" style="background: rgba(21, 128, 61, ${(0.08 + 0.85 * n).toFixed(2)})" title="${MONTHS_LONG[lang][m - 1]}: NDVI ${fixed(v, 2)}"><span>${mShort(m)}</span><b>${fixed(v, 2)}</b></div>`;
    }
    el.innerHTML = html;
    const p = REGIONS_DATA[currentRegion].ndvi_point;
    const yrs = data.ndvi_years ? `${data.ndvi_years[0]}–${data.ndvi_years[1]}` : t("several_years");
    document.getElementById("ndviNote").textContent = t("ndvi_note", { lat: p.lat, lon: p.lon, yrs });
    const base = (strategies || []).find(s => s.is_existing);
    document.getElementById("ndviModelRow").innerHTML = base
        ? `<div class="ndvi-row-lbl">${t("ndvi_model")}</div>${renderGanttTimeline(base, new Set((data.salinity_months || []).map(Number)), new Set())}<div class="ndvi-row-lbl">${t("ndvi_meas")}</div>`
        : "";
}

function renderAssumptionsBox(data) {
    const items = (rText(data, "assumptions") || []).map(a => `<li>${a}</li>`);
    const sal = rText(data, "salinity_months_source");
    if (sal) items.push(`<li><strong>${t("sal_src")}</strong> ${sal}</li>`);
    (Array.isArray(data.stress_years) ? data.stress_years : []).forEach(s => items.push(
        `<li><strong>${t("stress_y", { y: esc(s.label) })}</strong> ${(lang === "vi" && s.event_vi) || s.event} (${s.source}${s.verified === false ? "; " + t("nyv") : ""})</li>`));
    if (data.stress_years_source) items.push(`<li><strong>${t("stress_src")}</strong> ${data.stress_years_source}</li>`);
    const ndviSrc = rText(data, "ndvi_years_source");
    if (ndviSrc) items.push(`<li><strong>${t("ndvi_src")}</strong> ${ndviSrc}</li>`);
    if (data.display_rule) items.push(`<li><strong>${t("disp_rule")}</strong> ${data.display_rule}</li>`);
    document.getElementById("rotationAssumptionsBox").innerHTML = `<h3 class="card-heading">${t("as_h")}</h3><ul class="src-list">${items.join("")}</ul>`;
}

async function evaluateCrops() {
    try {
        const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: scenarioBody() });
        if (!res.ok) { show("cropTableWrapper", false); show("evaluateEmpty", true); return; }
        lastCrops = (await res.json()).crops || [];
        renderCropTable(lastCrops);
    } catch (e) {
        show("cropTableWrapper", false); show("evaluateEmpty", true);
    }
}

function renderCropTable(crops) {
    show("cropTableWrapper", true); show("evaluateEmpty", false);
    // Salinity is "not modeled" when the region has a salinity season (structured
    // salinity_months from /api/rotations) but the crop has no computed salinity_exceed.
    const regionHasSalinity = !!(lastRotationData && lastRotationData.region_id === currentRegion && (lastRotationData.salinity_months || []).length);
    const salMissing = c => regionHasSalinity && (!c.components || c.components.salinity_exceed === null || c.components.salinity_exceed === undefined);
    const rows = crops.filter(c => isNum(c.deficit_mm));
    show("waterOnlyScoreNote", rows.some(salMissing));
    document.getElementById("cropTableBody").innerHTML = rows.map((c, i) => {
        const note = c.missing_components && c.missing_components.length ? `<div class="muted">(${c.missing_components.join("; ")})</div>` : "";
        const win = c.season_window && c.season_window.start ? `${c.season_window.start} → ${c.season_window.end}` : "–";
        const v = c.water_vs_baseline_pct;
        const saved = !isNum(v) ? "–" : i === 0 ? t("baseline")
            : v > 0 ? `<span class="txt-good">−${fmt(v, 1)}%</span>` : v < 0 ? `<span class="txt-bad">+${fmt(-v, 1)}%</span>` : "0%";
        let risk = `<span class="risk-tag risk-${c.risk_level}">${t("risk_" + c.risk_level)}</span>`;
        if (c.score !== null && !isNum(c.exceed_ratio_r)) risk = `<span class="muted">${t("no_thresh")}</span>`;
        if (salMissing(c)) risk = `<span class="muted">${t("sal_nm")}</span>`;
        const name = lang === "vi" && I18N.vi["crop_" + c.crop_id] ? I18N.vi["crop_" + c.crop_id] : c.crop_name;
        return `<tr><td><strong>${name}</strong>${note}</td><td class="nowrap muted">${win}</td>
            <td class="num"><strong>${m3(c.deficit_mm)}</strong> <small class="muted">(${fmt(c.deficit_mm, 1)} mm)</small></td>
            <td class="num">${saved}</td><td>${risk}</td></tr>`;
    }).join("");
}

// ==========================================================================
// CSV EXPORT (always English column names and config text)
// ==========================================================================
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
    const tv = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const data = lastRotationData || {};
    const stress = new Map((data.stress_years || []).map(s => [stressKey(s), s]));
    const rows = [];
    const add = obj => rows.push(CSV_COLUMNS.map(c => obj[c]));
    const scen = { region: currentRegion, delta_temp_c: tv, delta_rain_pct: r };
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
    a.download = `aero-agri_${currentRegion}_T${tv}_R${r}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ==========================================================================
// ADVISORY REPORT (server text is English for now)
// ==========================================================================
function resetReport() {
    reportReady = false;
    const out = document.getElementById("chatOutput");
    out.textContent = t("report_idle");
    out.classList.add("idle");
}

function updateReportContext() {
    const el = document.getElementById("reportContext");
    if (!el) return;
    const tv = parseFloat(document.getElementById("sliderTemp").value);
    const r = parseInt(document.getElementById("sliderRain").value, 10);
    const w = (tv === 0 && r === 0) ? t("ctx_avg") : scenarioText(tv, r);
    el.textContent = t("ctx", { r: regionName(), w, s: selectedStrategyName ? t("ctx_strategy", { n: selectedStrategyName }) : "" });
}

async function loadReport() {
    reportReady = false;
    updateReportContext();
    const outputEl = document.getElementById("chatOutput");
    outputEl.classList.remove("idle");
    outputEl.innerHTML = `<em>${t("computing")}</em>`;
    try {
        const res = await fetch("/api/advise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...JSON.parse(scenarioBody()), strategy_id: selectedStrategy })
        });
        if (!res.ok) { outputEl.innerHTML = `<span class="txt-bad">${t("report_err", { c: res.status })}</span>`; return; }
        outputEl.innerHTML = renderSimpleMarkdown((await res.json()).markdown);
        reportReady = true;
    } catch (e) {
        outputEl.innerHTML = `<span class="txt-bad">${t("conn_err", { m: esc(e.message) })}</span>`;
    }
}

function renderSimpleMarkdown(md) {
    if (!md) return "";
    let html = "";
    let inTable = false;
    md.split("\n").forEach(line => {
        const s = line.trim();
        if (s.startsWith("|")) {
            if (!inTable) { inTable = true; html += "<div class=\"table-scroll\"><table class=\"table-clean\"><tbody>"; }
            if (s.includes("---")) return;
            html += "<tr>" + s.split("|").slice(1, -1).map(c => `<td>${formatInline(c.trim())}</td>`).join("") + "</tr>";
            return;
        } else if (inTable) { inTable = false; html += "</tbody></table></div>"; }
        if (s.startsWith("### ")) html += `<h3>${formatInline(s.substring(4))}</h3>`;
        else if (s.startsWith("#### ")) html += `<h4>${formatInline(s.substring(5))}</h4>`;
        else if (s.startsWith("> ")) html += `<blockquote>${formatInline(s.substring(2))}</blockquote>`;
        else if (s.startsWith("- ")) html += `<ul><li>${formatInline(s.substring(2))}</li></ul>`;
        else if (s.startsWith("---")) html += "<hr>";
        else if (s !== "") html += `<p>${formatInline(s)}</p>`;
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
