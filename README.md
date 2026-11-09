# AERO-AGRI: Hệ Thống Hỗ Trợ Quyết Định Chuyển Đổi Cơ Cấu Cây Trồng Thích Ứng Khí Hậu
*2026 NASA International Space Apps Challenge — Challenge: Field Shift: Adapting Farms with NASA Data*

---

## 1. Giới thiệu
**AERO-AGRI** là công cụ hỗ trợ ra quyết định luân canh cả năm và chuyển đổi cây trồng dựa trên dữ liệu quan sát Trái Đất của NASA (NASA POWER, MODIS `MOD13Q1`) kết hợp với mô hình cân bằng nước nông học chuẩn **FAO-56 Penman-Monteith** và **USDA-SCS**, tập trung vào 2 vùng thí điểm tại Việt Nam:
- **Bến Tre (Đồng bằng Sông Cửu Long):** So sánh 4 chiến lược luân canh cả năm (`S0` 2 vụ lúa, `S1` lúa–tôm, `S2` lúa Hè Thu + đậu tương Đông Xuân, `S3` lúa Hè Thu + ngô Đông Xuân) và bảng chi tiết các cây trong ô vụ Đông Xuân bắt đầu từ `11-01` (`rice`, `soybean`, `maize`, `rice_shrimp`).
- **Đắk Lắk (Tây Nguyên):** So sánh 2 chiến lược quản lý mặt đất vườn cà phê vối lâu năm (`D0` cà phê đất trần vs `D1` cà phê có cây che phủ đất / thảm cỏ) trong mùa khô (`coffee`, `coffee_cover_crop`).

---

## 2. Hướng dẫn sử dụng nhanh (Quickstart)
1. **Cài đặt thư viện:** `pip install -r requirements.txt`
2. **Tải dữ liệu NASA thật (2015–2025):**
   - Khí tượng & bức xạ NASA POWER: `python core/power_fetch.py`
   - Chỉ số thực vật MODIS NDVI (lọc mây, cửa sổ 3×3 km): `python core/ndvi_fetch.py`
   - *(Hoặc tạo dữ liệu mẫu để chạy thử offline: `python scripts/make_demo_data.py`)*
3. **Kiểm tra trạng thái dữ liệu:** `python scripts/check_data.py`
4. **Khởi chạy ứng dụng web:** `python run.py` (tự động mở trình duyệt tại `http://127.0.0.1:8050`).
5. **Chạy bộ kiểm thử tự động (38 tests):** `python -m pytest -q`

---

## 3. Cấu trúc dự án & Hệ thống tài liệu

```text
aero-agri/
├── README.md                     # Tài liệu tổng quan, hướng dẫn chạy & giả định kỹ thuật (Tiếng Việt)
├── LICENSE                       # Giấy phép nguồn mở Apache License 2.0
├── MORNING_REPORT.md             # Báo cáo kiểm toán số liệu, kết quả test và lịch sử các vòng sửa (Task 0–6, Vòng 3, Prep 6, Fix 6)
├── docs/
│   └── SUBMISSION_NOTES.md       # Hồ sơ kỹ thuật nộp NASA Space Apps (Tiếng Anh: nguồn dữ liệu, phương trình, trích dẫn, giới hạn)
├── config/
│   ├── regions.json              # Tọa độ vùng, ndvi_point (3x3 km), season_start, crop_season_start, candidate_crops
│   ├── crops.json                # Hệ số Kc theo giai đoạn, ngưỡng mặn + salinity_basis, ngưỡng nhiệt có nguồn, nguồn trích dẫn
│   ├── rotations.json            # Định nghĩa các chiến lược luân canh cả năm, bằng chứng, lợi ích, khoảng trống thông tin & rủi ro
│   └── scoring.json              # Trọng số (w_water, w_salinity, w_heat), ngưỡng rủi ro tuyệt đối r, chặn dưới gió u2_min_ms
├── core/
│   ├── loaders.py                # Đọc & kiểm tra hợp đồng schema CSV, quản lý manifest.json, cô lập qua AERO_DATA_DIR
│   ├── power_fetch.py            # Tải dữ liệu ngày NASA POWER API (T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR)
│   ├── ndvi_fetch.py             # Tải dữ liệu MODIS MOD13Q1 v061 qua ORNL DAAC API (lọc mây pixel_reliability, median 3x3 km)
│   ├── eto.py                    # Bốc thoát hơi nước tham chiếu FAO-56 Penman-Monteith (Eq. 6)
│   ├── water_balance.py          # Cửa sổ mùa vụ (hỗ trợ vắt qua năm & ghi đè season_start theo pha), nội suy Kc, Peff tháng lẻ
│   ├── rotation.py               # Đánh giá chiến lược luân canh cả năm (evaluate_rotations), lịch 12 tháng & NDVI quan sát
│   ├── scoring.py                # Tính điểm so sánh tương đối (0–100) và phân loại cấp rủi ro tuyệt đối (LOW..CRITICAL)
│   └── advisor.py                # Sinh báo cáo khuyến nghị 3 phần tất định từ số liệu đã tính (không bịa số)
├── data/
│   ├── manifest.json             # Truy xuất nguồn gốc dữ liệu và cờ is_synthetic
│   └── raw/                      # Chứa CSV theo 4 nguồn: power/, ndvi/, soil_moisture/, salinity/
├── scripts/
│   ├── check_data.py             # In bảng trạng thái từng nguồn dữ liệu × từng vùng
│   └── make_demo_data.py         # Sinh dữ liệu mẫu (is_synthetic: true, seed cố định) phục vụ kiểm thử & demo
├── server.py                     # Máy chủ HTTP & REST API (/api/status, /api/regions, /api/climate, /api/evaluate, /api/rotations, /api/advise)
├── run.py                        # Điểm vào 1 lệnh: kiểm tra dữ liệu -> mở server cổng 8050 -> mở trình duyệt
├── tests/
│   ├── test_core.py              # Bộ 38 unit & regression tests
│   └── fixtures/                 # Fixture kiểm thử MODIS subset (modis_subset_sample.json) & mốc regression (regression_baseline.json)
└── web/
    ├── index.html                # Giao diện bảng điều khiển Tiếng Việt (So sánh chiến lược luân canh + Bảng chi tiết từng cây)
    ├── style.css                 # Giao diện nền tối, đáp ứng màn hình di động >= 360px
    ├── app.js                    # Logic bản đồ Leaflet circleMarker, dải 12 tháng luân canh, biểu đồ Chart.js, Simulator & Cố vấn
    └── vendor/                   # Thư viện Leaflet 1.9.4 & Chart.js 4.4.1 lưu cục bộ (không phụ thuộc CDN)
```

### Danh mục tài liệu trong kho mã nguồn
| Tài liệu | Mục đích | Ngôn ngữ |
|---|---|---|
| [`README.md`](README.md) | Hướng dẫn cài đặt, vận hành, cấu trúc thư mục và các giả định kỹ thuật cốt lõi. | Tiếng Việt |
| [`docs/SUBMISSION_NOTES.md`](docs/SUBMISSION_NOTES.md) | Tài liệu kỹ thuật phục vụ chấm thi NASA Space Apps (bảng sản phẩm NASA, công thức toán học, trích dẫn khoa học, phiên bản thư viện, các giới hạn mô hình). | Tiếng Anh |
| [`MORNING_REPORT.md`](MORNING_REPORT.md) | Nhật ký kỹ thuật chi tiết các bản vá (Task 0–6, Vòng 3 Fix 0–5, Prep 6 Bước 0–3), bảng kiểm tra tính nhất quán trên dữ liệu thật và danh sách quyết định mở. | Tiếng Việt |
| [`LICENSE`](LICENSE) | Giấy phép mã nguồn mở Apache License, Version 2.0. | Tiếng Anh |

---

## 4. Phương pháp luận & Giả định kỹ thuật (Technical Assumptions)

1. **Cô lập thư mục dữ liệu (`AERO_DATA_DIR`):**
   - Toàn bộ các mô-đun đọc/ghi dữ liệu qua biến môi trường `AERO_DATA_DIR` (mặc định là `aero-agri/data`). Mọi kiểm thử tự động chạy trong thư mục tạm `tmp_path`, tuyệt đối không ghi đè dữ liệu thật trong `data/raw/`.
2. **Bốc thoát hơi nước tham chiếu ($ET_o$ — FAO-56 Penman-Monteith):**
   - Tính theo phương trình FAO-56 Eq. 6 từ `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`.
   - Tỉ số bức xạ sóng ngắn tương đối $R_s / R_{so}$ được chặn trên ở `1.0` trước khi tính bức xạ sóng dài ròng $R_{nl}$ (Eq. 39).
   - Tốc độ gió ở độ cao 2 m được chặn dưới tại $u_2 = \max(u_2, 0.5\text{ m/s})$ theo chuẩn **FAO-56 Ch. 3, p. 63** (`verified: true`) để khắc phục sai lệch gió thấp của dữ liệu tái phân tích trên địa hình gồ ghề.
3. **Lịch thời vụ cấu hình được (`season_start` / `crop_season_start`) & Mưa hiệu quả tháng lẻ:**
   - Cây hằng năm (`perennial: false`): tại Bến Tre, bảng chi tiết từng cây so sánh trong ô vụ Đông Xuân bắt đầu từ `season_start = "11-01"` (`01/11` đến giữa tháng 2 năm sau, tránh cao điểm xâm nhập mặn theo khuyến cáo của Trung tâm Khuyến nông Quốc gia (sổ tay hạn mặn mùa khô 2026–2027, tr.10)), có thể ghi đè theo từng cây qua `crop_season_start` hoặc theo từng pha luân canh qua tham số `season_start` của `calculate_water_balance`.
   - Cây lâu năm (`perennial: true`, gồm `coffee` và `coffee_cover_crop`): đánh giá trong các tháng mùa khô `dry_season_months` (`1..4`) với hệ số $K_c = K_{c,\text{mid}}$ cố định (theo FAO-56 Table 12 p. 112: đất trần `0.95`, có cây phủ/cỏ `1.10`). Vì không có ngưỡng $T_{max}$ ngày theo kiểu bậc thang cho cà phê vối (Kath et al., 2020), `heat_threshold_c` của cà phê đặt `null` và chỉ so sánh nhu cầu nước.
   - Lượng mưa hiệu quả tháng theo công thức **USDA-SCS** được tính trên tổng mưa **cả tháng**, sau đó phân bổ theo tỷ lệ số ngày thực tế thuộc mùa vụ trong tháng đó ($\text{days\_in\_season} / \text{days\_in\_month}$).
4. **Chiến lược luân canh cả năm (`core/rotation.py`, `config/rotations.json`, `POST /api/rotations`):**
   - Mỗi chiến lược gồm nhiều pha trong năm (ví dụ Bến Tre: `S0` 2 vụ lúa Hè Thu `05-25` + Đông Xuân `11-01`, `S1` lúa mùa mưa `09-01` + tôm nước lợ `03-01..07-31`, `S2` lúa Hè Thu + đậu tương Đông Xuân, `S3` lúa Hè Thu + ngô Đông Xuân; Đắk Lắk: `D0` cà phê đất trần vs `D1` cà phê có cây phủ).
   - Trình bày trực tiếp số liệu thô (`annual_deficit_mm`, `bare_months`, thiếu hụt từng pha, lịch 12 tháng kèm tháng mặn và chấm nhiệt, hàng NDVI quan sát 12 tháng) cùng 5 khối thông tin định tính có trích dẫn nguồn (**Vì sao đề xuất / Bằng chứng / Lợi ích / Thiếu hụt thông tin / Rủi ro cần nông dân và chuyên gia địa phương kiểm tra**), không tự đặt trọng số gộp điểm giữa các chiến lược.
5. **Nhu cầu nước phụ trợ của lúa nước (`land_prep_mm`, `percolation_mm_day`):**
   - Tổng nhu cầu nước $W_{\text{req}} = \sum ET_c + W_{\text{land\_prep}} + d_{\text{season}} \cdot W_{\text{percolation}}$ (lúa nước: 300 mm = bão hòa đất 200 mm + lớp nước 100 mm, cộng thấm 4 mm/ngày mức đất sét nặng, theo FAO Training Manual 3, Brouwer & Heibloem 1986, Part II mục 4.4; loại đất là giả định; cây cạn đặt `null` → 0).
6. **Quy đổi ngưỡng độ mặn (`salinity_basis` — FAO-56 Table 23 pp. 178–179):**
   - Với lúa ngập nước (`salinity_basis = "soil_water_submerged"`): theo Footnote 6 của FAO-56 Table 23 (p. 179), ngưỡng `3.0 dS/m` của lúa đã là độ dẫn điện của nước ruộng khi ngập, do đó đổi trực tiếp sang phần nghìn: $\text{ppt} = EC / 1.56 \approx 1.923\text{ ‰}$.
   - Với cây trồng cạn (`salinity_basis = "ece"`, như đậu tương `5.0 dS/m`, ngô `1.7 dS/m`): áp dụng quy chuẩn $EC_e \approx 1.5 \cdot EC_w$ (FAO-29) và $1\text{ ‰} \approx 1.56\text{ dS/m}$ $\rightarrow \text{ppt} = EC_e / (1.5 \times 1.56)$.
7. **Tách biệt Điểm so sánh tương đối (`score`) và Mức rủi ro tuyệt đối (`risk_level`):**
   - **Thành phần nước (`water_component`):** Chuẩn hóa theo mức thiếu hụt nước lớn nhất trong số các cây có số liệu hợp lệ của vùng:
     $$\text{water\_component}_i = \frac{\text{deficit\_mm}_i}{\max_{j \in \text{valid}} (\text{deficit\_mm}_j)}$$
   - **Quy tắc thiếu dữ liệu (`INSUFFICIENT_DATA`):** Chỉ chia lại trọng số khi một thành phần bị thiếu ở **tất cả** các cây trong vùng (ví dụ toàn vùng chưa có file CSV độ mặn). Nếu một thành phần chỉ thiếu ở một số cây (ví dụ `rice_shrimp` chưa có $K_c$ thực vật), cây đó nhận `score = null`, `risk_level = "INSUFFICIENT_DATA"` và không đưa vào xếp hạng.
   - **Mức rủi ro tuyệt đối (`risk_level`):** Chỉ tính từ tỷ lệ ngày mùa vụ vượt ngưỡng tuyệt đối $r = \max(\text{heat\_ratio}, \text{salinity\_exceed})$ theo ngưỡng trong `config/scoring.json` (`LOW < 0.10`, `MODERATE < 0.25`, `SEVERE < 0.50`, `CRITICAL >= 0.50`).
8. **Nguồn dữ liệu tham gia tính điểm (`data_used`) & Viễn thám MODIS NDVI:**
   - Trường `data_used` chỉ liệt kê các nguồn thực sự tham gia vào phép tính điểm (`power` và `salinity` khi có).
   - Chuỗi MODIS NDVI (`MOD13Q1`, 250 m, 16 ngày) được lấy trung vị (`median`) trên cửa sổ **3×3 km (81 pixel)** tại tọa độ ruộng canh tác (`ndvi_point`), lọc mây qua band `250m_16_days_pixel_reliability` (chỉ giữ pixel loại `0` và `1`, loại bỏ ngày có dưới 20 pixel hợp lệ), dùng để hiển thị chu kỳ mùa vụ trên trục phụ của biểu đồ khí hậu.
