# BÁO CÁO CA ĐÊM (MORNING REPORT) — AERO-AGRI

---

## 1. Bảng trạng thái từng Task

| Task / Fix | Nội dung | Trạng thái | Commit Hash | Ghi chú |
|---|---|---|---|---|
| **Task 0 - Fix 1** | Thiếu dữ liệu thành phần vùng $\to$ `score = null`, `risk_level = INSUFFICIENT_DATA`, `water_vs_baseline_pct = null` | **DONE** | `bddd3c1` | Đã thêm test `rice_shrimp` có `score is None` |
| **Task 0 - Fix 2** | Tách `score` ("Điểm so sánh với hiện trạng") và `risk_level` theo $r = \max(\text{heat\_ratio}, \text{salinity\_exceed})$ | **DONE** | `182570f` | Thêm `risk_thresholds_exceed_ratio` vào `scoring.json` + tooltip UI |
| **Task 0 - Fix 3** | Cập nhật $K_c$ và `heat_threshold_c` của `coffee` (0.90/0.95/0.95) và `coffee_cover_crop` (1.05/1.10/1.10) theo FAO-56 Table 12 | **DONE** | `508fe7f` | Đặt `heat_threshold_c = 33.0` bằng nhau cho cả 2 |
| **Task 0 - Fix 4** | Chuyển `source` của mọi cây trong `crops.json` thành dict `{"kc", "salinity", "heat", "water_extra"}`; `heat` đặt `"TODO: cần nguồn"` | **DONE** | `17e2f0d` | Đã cập nhật unit test kiểm tra cấu trúc dict |
| **Task 0 - Fix 5** | Loại bỏ từ ngữ năng suất/mất mùa; dùng `"nhu cầu tưới X mm"`, `"ít hơn/nhiều hơn <baseline> Y%"`, `"Z% số ngày vượt ngưỡng nhiệt"` | **DONE** | `bb7b38b` | Đã thêm test kiểm tra markdown không chứa `"mất trắng"`, `"mất mùa"` |
| **Task 1** | Cấu hình UTF-8 `sys.stdout` / `sys.stderr` ở đầu mọi entry point để chạy sạch với `PYTHONIOENCODING=cp1252` trên Windows | **DONE** | `5eacebf` | Đã kiểm chứng với `PYTHONIOENCODING=cp1252` |
| **Task 2** | Tạo `core/ndvi_fetch.py` tải MODIS `MOD13Q1` (`250m_16_days_NDVI`) qua ORNL DAAC REST API + fixture unit test | **DONE** | `6c5cb78` | Tải 253 kỳ quan trắc/vùng (2015–2025), lọc fill `-3000` |
| **Task 3** | Tải dữ liệu thật NASA POWER (4018 dòng/vùng) và MODIS NDVI (253 dòng/vùng) vào `data/raw/`, thêm `data/raw/**/*.csv` vào `.gitignore` | **DONE** | `2a9d446` | File CSV thật nằm sẵn trong `data/raw/`, không bị commit vào git |
| **Task 4** | Hiển thị đường NDVI trên trục phụ (0–1) của biểu đồ khí hậu, chụp `screenshot_real_data.png` | **DONE** | `a687e6d` | Số lỗi console trình duyệt: **0 lỗi** |
| **Task 5** | Kiểm tra tính nhất quán trên dữ liệu NASA POWER thật (chỉ đọc và báo cáo, không sửa) | **DONE** | *(Report)* | Chi tiết tại Mục 6 bên dưới |
| **Task 6** | Tạo `docs/SUBMISSION_NOTES.md` (tiếng Anh) và `LICENSE` (Apache-2.0) | **DONE** | `aaa8a08` | Đầy đủ công thức, giới hạn và AI disclosure |

---

## 2. Output `python -m pytest -q` cuối cùng

```text
............................                                             [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
28 passed, 1 warning in 1.74s
```

---

## 3. Output `git log --oneline` của ca đêm

```text
aaa8a08 task 6: add English technical submission notes and Apache-2.0 LICENSE
a687e6d task 4: display MODIS NDVI line on secondary axis of climate chart
2a9d446 task 3: fetch real NASA POWER and MODIS NDVI data, update manifest and gitignore
6c5cb78 task 2: add MODIS ORNL DAAC NDVI fetcher and unit tests with fixture
5eacebf task 1: configure utf-8 stdout/stderr on all entry points for Windows cp1252
bb7b38b fix: replace yield/crop-loss terms in advisor and UI with factual water/heat metrics
17e2f0d fix: structure crop source as parameter dict and mark heat threshold TODO
508fe7f fix: update coffee and coffee_cover_crop kc and heat_threshold per FAO-56 Table 12
182570f fix: separate relative score and absolute exceed-ratio risk_level
bddd3c1 fix: set score=None and INSUFFICIENT_DATA when crop misses active region component
ece1929 fix: data_used only lists sources directly contributing to score
1b892c8 fix: convert salinity threshold from ECe dS/m to ppt water salinity
d43a8d0 fix: add land_prep_mm and percolation_mm_day for rice water balance
5a35cf1 fix: calculate relative water component and rename water_stress to irrigation_share
2a89ea3 fix: clean up pytest shim, pycache and requirements
6a38767 fix(web): prevent console errors on empty data and offline map
ac6ec6c step 8: build vanilla offline web dashboard and finalize test suite
189c33c step 7: implement http server, rest api endpoints and run script
df04f99 step 6: implement crop suitability scoring and deterministic advisor
78e5566 step 5: implement seasonal water balance and usda-scs effective rainfall
77f8525 step 4: implement fao-56 penman-monteith reference evapotranspiration
47faeeb step 3: define agronomic regions, crop coefficients and scoring configs
4b665d0 step 2: implement data contracts, loaders and nasa power fetcher
5bdd6e1 step 1: initialize repository structure and offline vendor assets
```

---

## 4. Lỗi chưa xử lý được

- **Không có lỗi nào bị tồn đọng.** Toàn bộ các task từ Task 0 đến Task 6 đều hoàn thành và vượt qua 28/28 bài kiểm thử.

---

## 5. Giả định đã chọn & Kết quả phụ trợ Task 2, 3, 4

### 5.1. Các giả định đã chọn khi thực thi
1. **Xác định thành phần active của vùng (Task 0 - Fix 1):** Một thành phần (`water`, `salinity`, `heat`) được coi là bị thiếu ở **tất cả** cây trong vùng nếu mọi cây ứng viên trong vùng đều có giá trị `None` ở thành phần đó (ví dụ cả vùng chưa có file CSV độ mặn). Ngược lại, nếu ít nhất 1 cây trong vùng tính được thành phần đó mà một cây khác bị `None` (ví dụ `rice_shrimp` thiếu `Kc`), cây bị thiếu sẽ nhận `score = None` và `risk_level = "INSUFFICIENT_DATA"`.
2. **Giữ `risk_thresholds` cũ song song với `risk_thresholds_exceed_ratio` trong `scoring.json` (Task 0 - Fix 2):** Để không làm hỏng bài kiểm thử regression cũ (`test_step3_config_scoring`), trường `risk_thresholds` vẫn được giữ trong `scoring.json` bên cạnh trường mới `risk_thresholds_exceed_ratio`. Logic phân loại `risk_level` trong `core/scoring.py` dùng `risk_thresholds_exceed_ratio` tính theo $r = \max(\text{heat\_ratio}, \text{salinity\_exceed})$.
3. **Kiểm thử cô lập dữ liệu khi `data/raw/` chứa dữ liệu thật (Task 3):** Khi `data/raw/` chứa các file CSV thật tải ở Task 3 để kiểm tra vào buổi sáng, bài test cô lập dữ liệu kiểm tra: (a) tập file trong `data/raw/*` trước và sau khi chạy `generate_demo_dataset()` (với `AERO_DATA_DIR=tmp_dir`) hoàn toàn không đổi, và (b) mọi file CSV đang có trong `data/raw/` thật đều được khai báo trong `data/manifest.json` với `is_synthetic: false`.

### 5.2. Mẫu JSON thực tế đầu tiên từ ORNL DAAC MODIS API (Task 2)
- Endpoint `/dates`: `GET https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?latitude=10.2433&longitude=106.3758`
  ```json
  {
    "dates": [
      {"modis_date": "A2000049", "calendar_date": "2000-02-18"},
      {"modis_date": "A2000065", "calendar_date": "2000-03-05"}
    ]
  }
  ```
- Endpoint `/subset`: `GET https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=10.2433&longitude=106.3758&band=250m_16_days_NDVI&startDate=A2024001&endDate=A2024049&kmAboveBelow=0&kmLeftRight=0`
  ```json
  {
    "xllcorner": "11639805.40",
    "yllcorner": "1138822.69",
    "cellsize": 231.656358264,
    "nrows": 1,
    "ncols": 1,
    "band": "250m_16_days_NDVI",
    "units": "NDVI ratio - No units",
    "scale": "0.0001",
    "latitude": 10.2433,
    "longitude": 106.3758,
    "subset": [
      {
        "modis_date": "A2024001",
        "calendar_date": "2024-01-01",
        "band": "250m_16_days_NDVI",
        "tile": "h28v07",
        "proc_date": "2024022132730",
        "data": [3316]
      }
    ]
  }
  ```

### 5.3. Output `python scripts/check_data.py` sau khi tải dữ liệu thật (Task 3)
```text
=====================================================================================
VÙNG                 | NGUỒN           | TRẠNG THÁI   | SỐ DÒNG  | NGÀY BẮT ĐẦU | NGÀY KẾT THÚC | MẪU?
-------------------------------------------------------------------------------------
Ben_Tre_DBSCL        | power           | SẴN SÀNG     | 4018     | 2015-01-01 | 2025-12-31 | NO
Ben_Tre_DBSCL        | ndvi            | SẴN SÀNG     | 253      | 2015-01-01 | 2025-12-19 | NO
Ben_Tre_DBSCL        | soil_moisture   | CHƯA CÓ      | 0        | -          | -          | NO
Ben_Tre_DBSCL        | salinity        | CHƯA CÓ      | 0        | -          | -          | NO
Dak_Lak_Tay_Nguyen   | power           | SẴN SÀNG     | 4018     | 2015-01-01 | 2025-12-31 | NO
Dak_Lak_Tay_Nguyen   | ndvi            | SẴN SÀNG     | 253      | 2015-01-01 | 2025-12-19 | NO
Dak_Lak_Tay_Nguyen   | soil_moisture   | CHƯA CÓ      | 0        | -          | -          | NO
Dak_Lak_Tay_Nguyen   | salinity        | CHƯA CÓ      | 0        | -          | -          | NO
=====================================================================================
```

### 5.4. Kiểm tra giao diện với dữ liệu thật (Task 4)
- Đã chụp màn hình lưu tại `aero-agri/screenshot_real_data.png`.
- Chip `POWER` và `NDVI` đều hiển thị màu xanh lá (`Dữ liệu thật`), biểu đồ khí hậu hiển thị đường NDVI trên trục phụ bên phải (`0–1`).
- Số lỗi console trình duyệt (Playwright Chromium): **0 lỗi**.

---

## 6. Kết quả Task 5 — Kiểm tra tính nhất quán trên dữ liệu NASA POWER thật (2015–2025)

### 6.1. $ET_o$ trung bình ngày theo từng tháng (mm/ngày)

| Tháng | Bến Tre (ĐBSCL) — `mm/ngày` | Đắk Lắk (Tây Nguyên) — `mm/ngày` |
|---|---|---|
| **Tháng 01** | 4.06 | 2.73 |
| **Tháng 02** | 5.25 | 3.35 |
| **Tháng 03** | 6.04 | 4.22 |
| **Tháng 04** | 5.90 | 4.38 |
| **Tháng 05** | 4.71 | 4.03 |
| **Tháng 06** | 3.90 | 3.69 |
| **Tháng 07** | 3.65 | 3.38 |
| **Tháng 08** | 3.77 | 3.55 |
| **Tháng 09** | 3.59 | 3.38 |
| **Tháng 10** | 3.44 | 2.98 |
| **Tháng 11** | 3.37 | 2.48 |
| **Tháng 12** | 3.38 | 2.23 |
| **Min / Max ngày (2015–2025)** | Min: `1.22`, Max: `8.03` | Min: `0.36`, Max: `5.75` |

### 6.2. Tổng mưa trung bình tháng 1–4 (mm)

| Chỉ tiêu | Bến Tre (ĐBSCL) | Đắk Lắk (Tây Nguyên) |
|---|---|---|
| **Tháng 01** | 20.8 mm | 18.7 mm |
| **Tháng 02** | 6.3 mm | 6.6 mm |
| **Tháng 03** | 24.0 mm | 14.2 mm |
| **Tháng 04** | 58.3 mm | 41.5 mm |
| **Tổng mưa trung bình cả mùa khô (Tháng 1–4)** | **109.3 mm / mùa** | **80.9 mm / mùa** |

### 6.3. Bảng kết quả đánh giá 2 vùng × 2 kịch bản (NASA POWER thật, chưa có CSV độ mặn)

#### A. Vùng `Ben_Tre_DBSCL` (Bến Tre — Đồng bằng Sông Cửu Long)

| Kịch bản | Crop (`crop_id`) | Điểm so sánh (`score`) | Mức rủi ro (`risk_level`) | $r$ (`exceed_ratio_r`) | `deficit_mm` | `water_vs_baseline_pct` | `missing_components` |
|---|---|---|---|---|---|---|---|
| **(0°C, 0% mưa)** | Lúa thâm canh (`rice`) | **22.7** | `MODERATE` | `0.206` | `1058.8` | `0.0%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(0°C, 0% mưa)** | Đậu tương (`soybean`) | **67.6** | `MODERATE` | `0.206` | `392.6` | `+62.9%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(0°C, 0% mưa)** | Ngô (`maize`) | **71.2** | `LOW` | `0.091` | `388.1` | `+63.3%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(0°C, 0% mưa)** | Lúa - Tôm (`rice_shrimp`) | `None` | `INSUFFICIENT_DATA` | `0.206` | `None` | `None` | `['cây không có ngưỡng mặn', 'chưa tính bốc thoát hơi nước do thiếu Kc nông học']` |
| **(+2°C, -30% mưa)** | Lúa thâm canh (`rice`) | **13.4** | `CRITICAL` | `0.530` | `1114.3` | `0.0%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(+2°C, -30% mưa)** | Đậu tương (`soybean`) | **56.9** | `CRITICAL` | `0.530` | `437.0` | `+60.8%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(+2°C, -30% mưa)** | Ngô (`maize`) | **61.7** | `SEVERE` | `0.370` | `432.2` | `+61.2%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(+2°C, -30% mưa)** | Lúa - Tôm (`rice_shrimp`) | `None` | `INSUFFICIENT_DATA` | `0.530` | `None` | `None` | `['cây không có ngưỡng mặn', 'chưa tính bốc thoát hơi nước do thiếu Kc nông học']` |

#### B. Vùng `Dak_Lak_Tay_Nguyen` (Đắk Lắk — Tây Nguyên)

| Kịch bản | Crop (`crop_id`) | Điểm so sánh (`score`) | Mức rủi ro (`risk_level`) | $r$ (`exceed_ratio_r`) | `deficit_mm` | `water_vs_baseline_pct` | `missing_components` |
|---|---|---|---|---|---|---|---|
| **(0°C, 0% mưa)** | Cà phê đất trần (`coffee`) | **22.9** | `MODERATE` | `0.200` | `345.6` | `0.0%` | `['cây không có ngưỡng mặn']` |
| **(0°C, 0% mưa)** | Cà phê có cây phủ (`coffee_cover_crop`) | **22.9** | `MODERATE` | `0.200` | `411.9` | `-19.2%` | `['cây không có ngưỡng mặn']` |
| **(0°C, 0% mưa)** | Ngô (`maize`) | **44.3** | `LOW` | `0.048` | `262.9` | `+23.9%` | `['chưa tính mặn do thiếu dữ liệu']` |
| **(+2°C, -30% mưa)** | Cà phê đất trần (`coffee`) | **18.1** | `SEVERE` | `0.367` | `386.7` | `0.0%` | `['cây không có ngưỡng mặn']` |
| **(+2°C, -30% mưa)** | Cà phê có cây phủ (`coffee_cover_crop`) | **18.1** | `SEVERE` | `0.367` | `456.2` | `-18.0%` | `['cây không có ngưỡng mặn']` |
| **(+2°C, -30% mưa)** | Ngô (`maize`) | **42.6** | `MODERATE` | `0.130` | `290.4` | `+24.9%` | `['chưa tính mặn do thiếu dữ liệu']` |

### 6.4. Các điểm bất thường / đáng chú ý phát hiện được (chỉ báo cáo, không tự sửa)

1. **Hai cây `coffee` và `coffee_cover_crop` ở Đắk Lắk có `score` (`22.9` và `18.1`), `risk_level` (`MODERATE` và `SEVERE`), và `r` (`0.200` và `0.367`) y hệt nhau dù `deficit_mm` khác nhau (`345.6 mm` vs `411.9 mm`):**
   - **Nguyên nhân toán học:** Công thức `water_component = clip(deficit_mm / baseline_deficit_mm, 0, 1)` chặn trên ở `1.0`. Vì `coffee` là cây baseline (`deficit_mm = 345.6`, `water_component = 1.0`), còn `coffee_cover_crop` có $K_{c,\text{mid}} = 1.10 > 0.95$ nên `deficit_mm = 411.9` ($\text{tỉ số} = 1.192$), sau khi `clip(..., 0, 1)` cả hai cây đều nhận `water_component = 1.0`. Đồng thời cả hai có cùng `heat_threshold_c = 33.0°C` (theo Fix 3) nên `heat_ratio` cũng bằng nhau (`0.200`), dẫn đến `score` và `r` giống hệt nhau.
2. **Có 27 ngày tại Đắk Lắk có $ET_o < 1.0\text{ mm/ngày}$ (nhỏ nhất `0.36 mm/ngày`) và 1 ngày tại Bến Tre có $ET_o > 8.0\text{ mm/ngày}$ (`8.03 mm/ngày`):**
   - Các ngày $ET_o < 1.0\text{ mm/ngày}$ ở Đắk Lắk đều rơi vào những ngày mưa lớn / áp thấp cuối năm (tháng 11–12, ví dụ `2016-12-13` mưa `60.4 mm`, bức xạ mặt trời `ALLSKY_SFC_SW_DWN` chỉ đạt `1.87 MJ/m²/ngày`).
3. **`rice` và `soybean` ở Bến Tre có cùng giá trị $r$ (`0.206` ở kịch bản gốc, `0.530` ở kịch bản +2°C):**
   - Nguyên nhân: Khi chưa có dữ liệu độ mặn (`salinity_exceed = None`), $r = \max(\text{heat\_ratio}, \text{salinity\_exceed}) = \text{heat\_ratio}$. Vì cả `rice` và `soybean` đều đang cấu hình `heat_threshold_c = 35.0°C` nên có cùng tỷ lệ ngày vượt ngưỡng nhiệt.

---

## 7. Danh sách việc cần quyết định (Tối đa 5 mục)

1. **Xử lý trần `clip(..., 0, 1)` của `water_component`:** Có muốn mở trần lên `1.5` (hoặc chuẩn hóa theo cây có `deficit_mm` lớn nhất vùng) để phân biệt điểm `score` giữa `coffee` (`345.6 mm`) và `coffee_cover_crop` (`411.9 mm`) không?
2. **Nguồn ngưỡng nhiệt (`heat_threshold_c`):** Cần chốt tài liệu tham khảo chính thức cho ngưỡng nhiệt của `rice` (35°C), `soybean` (35°C), `maize` (36°C), `coffee` (33°C) để thay thế `"TODO: cần nguồn"` và đặt `"verified": true`.
3. **Dữ liệu độ mặn thực tế cho Bến Tre (`data/raw/salinity/Ben_Tre_DBSCL.csv`):** Cần cung cấp chuỗi CSV độ mặn trạm quan trắc (hoặc số liệu báo cáo Viện KHTL Miền Nam) để kích hoạt thành phần `salinity_exceed` trên dữ liệu thật.
4. **Thông số mô hình `rice_shrimp`:** Quyết định giữ trạng thái `INSUFFICIENT_DATA` (minh bạch về giới hạn mô hình FAO-56 đối với thủy sản) hay bổ sung bộ quy tắc đánh giá riêng cho vụ tôm.
5. **Tích hợp khóa API cho `call_llm()` trong `core/advisor.py`:** Quyết định có nối Gemini/Claude API cho phần trình bày khuyến nghị hay giữ nguyên bộ sinh khuyến nghị tất định (deterministic template) khi đem đi demo để đảm bảo tốc độ và 0% rủi ro mạng/hallucination.

---

## 8. Vòng 3 (Round 3 Fixes & Verification)

### 8.1. Commit hash của từng Fix (Fix 0 → Fix 5)

| Fix | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Fix 0** | `0fb112f` | `chore: trailing newlines` | Dọn working tree (3 file `LICENSE`, `MORNING_REPORT.md`, `docs/SUBMISSION_NOTES.md`). |
| **Fix 1** | `fa7ce46` | `fix: enforce u2 >= 0.5 m/s floor in FAO-56 ETo calculation` | Áp dụng chặn dưới tốc độ gió `u2 = max(u2, 0.5)` trong `core/eto.py` và đưa `u2_min_ms: 0.5` vào `config/scoring.json` (nguồn: `FAO-56 ch.3, p.63`, `verified: true` cho riêng tham số này, `verified: false` ở cấp file). Thêm test `u2 = 0.1` và `u2 = 0.5` cho ra cùng một $ET_o$. |
| **Fix 2** | `8fd9156` | `fix: normalize water_component by max regional crop deficit` | Chuẩn hóa `water_component = deficit_mm / max(deficit_mm hợp lệ trong vùng)` (nếu `max = 0` thì mọi cây `= 0`), giúp phân biệt điểm giữa `coffee` (`34.4`) và `coffee_cover_crop` (`22.9`) tại Đắk Lắk. Cập nhật công thức và xóa Limitation 5 cũ trong `docs/SUBMISSION_NOTES.md`. |
| **Fix 3** | `6c0eda2` | `fix: fetch 3x3km cloud-filtered agricultural MODIS NDVI median` | Bổ sung `ndvi_point` (ruộng lúa Ba Tri cũ tại Bến Tre `10.0992, 106.6040`; vườn cà phê Cư M'gar cũ tại Đắk Lắk `12.8314, 108.1282`), tải cửa sổ 3×3 km (`kmAboveBelow=1&kmLeftRight=1`, 81 pixel), lọc mây qua `250m_16_days_pixel_reliability` (chỉ giữ `0` và `1`, bỏ ngày `< 20` pixel hợp lệ), lấy `median` và ghi thêm cột `n_valid_pixels`. Cập nhật tooltip đường NDVI trên UI. |
| **Fix 4** | `1174d42` | `docs: update SUBMISSION_NOTES citations, resolutions, tested versions and limitations` | Cập nhật `docs/SUBMISSION_NOTES.md`: chuyển SMAP sang Limitations, ghi rõ độ phân giải MERRA-2 ($0.5^\circ \times 0.625^\circ$) vs CERES ($1^\circ \times 1^\circ$), thêm mục *Data Citations & Acknowledgements*, cột *Tested Version* (`Python 3.13.15`, `pandas 3.0.6`, `numpy 2.5.2`, `requests 2.34.2`, `pytest 9.2.0`), và bổ sung đầy đủ các Limitations nông học/khí tượng. |
| **Fix 5** | `bb522a6` | `fix: distinguish submerged rice soil water EC vs upland ECe per FAO-56 Table 23` | Thêm `salinity_basis` (`"soil_water_submerged"` cho `rice` $\rightarrow \text{ppt} = EC / 1.56 \approx 1.923\text{ ‰}$ theo FAO-56 Table 23 p.179 footnote 6; `"ece"` cho `soybean`, `maize` $\rightarrow \text{ppt} = EC_e / 1.5 / 1.56 \approx 2.137\text{ ‰}$), cập nhật số trang nguồn FAO-56, thêm `verified_params`, và cập nhật `docs/SUBMISSION_NOTES.md` mục 2.3. |

---

### 8.2. Output `python -m pytest -q`

```text
.............................                                            [100%]
29 passed, 1 warning in 1.72s
```

---

### 8.3. Bảng kết quả 2 vùng × 2 kịch bản sau Vòng 3 (NASA POWER thật 2015–2025)

#### A. Vùng `Ben_Tre_DBSCL` (Bến Tre — Đồng bằng Sông Cửu Long)

| Kịch bản | Crop (`crop_id`) | Điểm so sánh (`score`) | Mức rủi ro (`risk_level`) | $r$ (`exceed_ratio_r`) | `deficit_mm` | `water_component` | `water_vs_baseline_pct` |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **(0°C, 0% mưa)** | Ngô (`maize`) | **71.2** | `LOW` | `0.091` | `388.1` | `0.367` | `+63.3%` |
| **(0°C, 0% mưa)** | Đậu tương (`soybean`) | **67.6** | `MODERATE` | `0.206` | `392.6` | `0.371` | `+62.9%` |
| **(0°C, 0% mưa)** | Lúa thâm canh (`rice`) | **22.7** | `MODERATE` | `0.206` | `1058.8` | `1.000` | `0.0%` |
| **(0°C, 0% mưa)** | Lúa - Tôm (`rice_shrimp`) | `None` | `INSUFFICIENT_DATA` | `0.206` | `None` | `None` | `None` |
| **(+2°C, -30% mưa)** | Ngô (`maize`) | **61.7** | `SEVERE` | `0.370` | `432.2` | `0.388` | `+61.2%` |
| **(+2°C, -30% mưa)** | Đậu tương (`soybean`) | **56.9** | `CRITICAL` | `0.530` | `437.0` | `0.392` | `+60.8%` |
| **(+2°C, -30% mưa)** | Lúa thâm canh (`rice`) | **13.4** | `CRITICAL` | `0.530` | `1114.3` | `1.000` | `0.0%` |
| **(+2°C, -30% mưa)** | Lúa - Tôm (`rice_shrimp`) | `None` | `INSUFFICIENT_DATA` | `0.530` | `None` | `None` | `None` |

#### B. Vùng `Dak_Lak_Tay_Nguyen` (Đắk Lắk — Tây Nguyên)

| Kịch bản | Crop (`crop_id`) | Điểm so sánh (`score`) | Mức rủi ro (`risk_level`) | $r$ (`exceed_ratio_r`) | `deficit_mm` | `water_component` | `water_vs_baseline_pct` |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **(0°C, 0% mưa)** | Ngô (`maize`) | **53.1** | `LOW` | `0.048` | `266.4` | `0.637` | `+24.2%` |
| **(0°C, 0% mưa)** | Cà phê đất trần (`coffee`) | **34.4** | `MODERATE` | `0.200` | `351.3` | `0.839` | `0.0%` |
| **(0°C, 0% mưa)** | Cà phê có cây phủ (`coffee_cover_crop`) | **22.9** | `MODERATE` | `0.200` | `418.5` | `1.000` | `-19.1%` |
| **(+2°C, -30% mưa)** | Ngô (`maize`) | **50.9** | `MODERATE` | `0.130` | `294.3` | `0.635` | `+25.1%` |
| **(+2°C, -30% mưa)** | Cà phê đất trần (`coffee`) | **28.9** | `SEVERE` | `0.367` | `393.0` | `0.848` | `0.0%` |
| **(+2°C, -30% mưa)** | Cà phê có cây phủ (`coffee_cover_crop`) | **18.1** | `SEVERE` | `0.367` | `463.5` | `1.000` | `-17.9%` |

---

### 8.4. $ET_o$ theo tháng 1–4 của Đắk Lắk trước và sau Fix 1 (`u2 = max(u2, 0.5)`)

| Tháng | `WS2M` trung bình (m/s) | $ET_o$ trung bình ngày **Trước Fix 1** (mm/ngày) | $ET_o$ trung bình ngày **Sau Fix 1** (mm/ngày) | Tổng $ET_o$ tháng **Trước Fix 1** (mm/tháng) | Tổng $ET_o$ tháng **Sau Fix 1** (mm/tháng) |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **Tháng 01** | `0.383` | `2.73` | **2.75** | `84.7` | **85.3** |
| **Tháng 02** | `0.382` | `3.35` | **3.38** | `94.8` | **95.5** |
| **Tháng 03** | `0.334` | `4.22` | **4.27** | `130.7` | **132.5** |
| **Tháng 04** | `0.292` | `4.38` | **4.48** | `131.5` | **134.5** |

---

### 8.5. NDVI trung bình theo tháng mới (Cửa sổ nông nghiệp 3×3 km, lọc mây `reliability in (0, 1)`, $\ge 20$ pixel/ngày)

- **Bến Tre (`Ben_Tre_DBSCL`)**: Tọa độ `10.0992, 106.6040` (Ruộng lúa gần chợ Mỹ Nhơn, Ba Tri cũ) — **181 kỳ hợp lệ / 253 kỳ** (trung bình toàn chuỗi: `0.629`, thể hiện rõ chu kỳ 2–3 vụ lúa trong năm).
- **Đắk Lắk (`Dak_Lak_Tay_Nguyen`)**: Tọa độ `12.8314, 108.1282` (Vườn cà phê gần Quảng Phú, Cư M'gar cũ) — **201 kỳ hợp lệ / 253 kỳ** (trung bình toàn chuỗi: `0.744`, thể hiện tán cây lâu năm xanh quanh năm, giảm nhẹ vào đỉnh mùa khô tháng 2–4).

| Tháng | Bến Tre (`10.0992, 106.6040` — Ruộng lúa) | Đắk Lắk (`12.8314, 108.1282` — Vườn cà phê) |
|:---:|:---:|:---:|
| **Tháng 01** | `0.735` | `0.755` |
| **Tháng 02** | `0.681` | `0.679` |
| **Tháng 03** | `0.482` | `0.660` |
| **Tháng 04** | `0.398` | `0.679` |
| **Tháng 05** | `0.435` | `0.728` |
| **Tháng 06** | `0.686` | `0.769` |
| **Tháng 07** | `0.781` | `0.791` |
| **Tháng 08** | `0.736` | `0.796` |
| **Tháng 09** | `0.569` | `0.781` |
| **Tháng 10** | `0.629` | `0.795` |
| **Tháng 11** | `0.654` | `0.803` |
| **Tháng 12** | `0.688` | `0.797` |

---

## 9. Prep 6 (Configurable Season Start & Partial-Month $P_{eff}$ Proration)

### 9.1. Commit Hash của từng bước (Bước 0 → Bước 3)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 0** | `5e8ee4e` | `test: regression baseline before season refactor` | Chụp mốc regression cho 2 vùng × 2 kịch bản (`(0,0)` và `(+2, -30)`) trên dữ liệu demo (seed cố định trong `tmp_path`) vào `tests/fixtures/regression_baseline.json` và thêm unit test `test_prep6_regression_baseline`. |
| **Bước 1** | `715b120` | `feat: configurable season start per region/crop, cross-year seasons` | Thêm `season_start: "01-01"` và `crop_season_start: {}` vào `config/regions.json`; gom phần tính cửa sổ mùa vụ vào hàm dùng chung `iter_crop_season_slices` / `collect_crop_season_df` trong `core/water_balance.py` (hỗ trợ mùa vụ vắt qua năm sau như `"11-01"`, 105 ngày $\rightarrow$ `01/11/y` đến `13/02/y+1`); cập nhật `core/scoring.py` dùng đúng cửa sổ mùa vụ của từng cây hằng năm cho `heat_ratio` và `salinity_exceed`. |
| **Bước 2** | `5767216` | `fix: prorate USDA-SCS Peff for partial months` | Thêm `calculate_season_peff`: tính $P_{eff}$ theo tổng mưa **cả tháng** rồi nhân với `(số ngày thuộc mùa vụ trong tháng đó / tổng số ngày của tháng)`. Cập nhật `regression_baseline.json` và thêm unit test `test_prep6_prorate_peff_partial_months`. |
| **Bước 3** | `113f26e` | `feat: add season_window to evaluate output, UI table and SUBMISSION_NOTES` | Trả thêm `season_window: {"start": "MM-DD", "end": "MM-DD"}` cho từng cây trong `evaluate_crop_suitability`, hiển thị cột **Khung mùa vụ** trên bảng UI (`web/index.html`, `web/app.js`), và cập nhật `docs/SUBMISSION_NOTES.md`. |

---

### 9.2. Output `python -m pytest -q`

```text
................................                                         [100%]
32 passed, 1 warning in 2.15s
```

---

### 9.3. Bảng so sánh `deficit_mm` trước và sau Bước 2 (Phân bổ tỷ lệ $P_{eff}$ cho tháng lẻ)

#### A. Trên dữ liệu thật NASA POWER (2015–2025)

| Vùng | Cây trồng (`crop_id`) | Khung mùa vụ (`season_window`) | Kịch bản `(0°C, 0% mưa)` **Trước Bước 2** (mm) | Kịch bản `(0°C, 0% mưa)` **Sau Bước 2** (mm) | Kịch bản `(+2°C, -30% mưa)` **Trước Bước 2** (mm) | Kịch bản `(+2°C, -30% mưa)` **Sau Bước 2** (mm) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `Ben_Tre_DBSCL` | `rice` (105 ngày) | `01-01 → 04-15` | `1058.8` | **1060.1** | `1114.3` | **1114.8** |
| `Ben_Tre_DBSCL` | `soybean` (100 ngày) | `01-01 → 04-10` | `392.6` | **394.9** | `437.0` | **438.4** |
| `Ben_Tre_DBSCL` | `maize` (100 ngày) | `01-01 → 04-10` | `388.1` | **390.4** | `432.2` | **433.6** |
| `Ben_Tre_DBSCL` | `rice_shrimp` (120 ngày) | `01-01 → 04-30` | `None` | `None` | `None` | `None` |
| `Dak_Lak_Tay_Nguyen` | `coffee` (lâu năm) | `01-01 → 04-30` | `351.3` | **351.3** | `393.0` | **393.0** |
| `Dak_Lak_Tay_Nguyen` | `coffee_cover_crop` (lâu năm) | `01-01 → 04-30` | `418.5` | **418.5** | `463.5` | **463.5** |
| `Dak_Lak_Tay_Nguyen` | `maize` (100 ngày) | `01-01 → 04-10` | `266.4` | **260.3** | `294.3` | **289.7** |

#### B. Trên dữ liệu Demo (`make_demo_data`, Seed 42 — `regression_baseline.json`)

| Vùng | Cây trồng (`crop_id`) | Khung mùa vụ (`season_window`) | Kịch bản `(0°C, 0% mưa)` **Trước Bước 2** (mm) | Kịch bản `(0°C, 0% mưa)` **Sau Bước 2** (mm) | Kịch bản `(+2°C, -30% mưa)` **Trước Bước 2** (mm) | Kịch bản `(+2°C, -30% mưa)` **Sau Bước 2** (mm) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `Ben_Tre_DBSCL` | `rice` (105 ngày) | `01-01 → 04-15` | `1124.1` | **1124.1** | `1173.7` | **1173.7** |
| `Ben_Tre_DBSCL` | `soybean` (100 ngày) | `01-01 → 04-10` | `429.1` | **429.3** | `467.4` | **467.5** |
| `Ben_Tre_DBSCL` | `maize` (100 ngày) | `01-01 → 04-10` | `418.4` | **418.6** | `456.0` | **456.1** |
| `Ben_Tre_DBSCL` | `rice_shrimp` (120 ngày) | `01-01 → 04-30` | `None` | `None` | `None` | `None` |
| `Dak_Lak_Tay_Nguyen` | `coffee` (lâu năm) | `01-01 → 04-30` | `723.5` | **723.5** | `767.7` | **767.7** |
| `Dak_Lak_Tay_Nguyen` | `coffee_cover_crop` (lâu năm) | `01-01 → 04-30` | `838.7` | **838.7** | `889.6` | **889.6** |
| `Dak_Lak_Tay_Nguyen` | `maize` (100 ngày) | `01-01 → 04-10` | `518.6` | **518.8** | `550.3` | **550.5** |

---

## 10. Fix 6 (Whole-Year Rotation Strategies, Sourced Heat Thresholds & 12-Month Calendar)

### 10.1. Commit Hash của từng bước (Bước 1 → Bước 7)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `5115adc` | `fix: Ben Tre Dong Xuan window, sourced heat thresholds, drop unsourced coffee heat` | Đặt `Ben_Tre_DBSCL.season_start = "11-01"` (vụ Đông Xuân sớm) kèm `season_start_source`; bỏ `maize` khỏi `Dak_Lak_Tay_Nguyen.candidate_crops`; cập nhật nguồn nhiệt có trích dẫn khoa học cho `rice` (`35.0°C`, `verified_params` thêm `"heat"`), `maize` (`35.0°C`), `soybean` (`35.0°C`), và đặt `heat_threshold_c = null` cho `coffee`, `coffee_cover_crop`. Cập nhật `regression_baseline.json` và mở rộng khoảng ngày dữ liệu giả trong `test_step5_water_balance_rice_vs_soybean` (`2023-11-01..2024-06-30`, giữ nguyên mọi assert). |
| **Bước 2–6** | `6f2e9dc` | `feat: whole-year rotation strategies with evidence, gaps, risks and 12-month calendar` | Thêm tham số `season_start=None` vào `calculate_water_balance`; tạo `config/rotations.json` nguyên văn; cài đặt `core/rotation.py` (`evaluate_rotations`); thêm endpoint `POST /api/rotations` trong `server.py`; bổ sung giao diện **So sánh chiến lược luân canh** (hàng NDVI 12 tháng, thẻ chiến lược với dải 12 tháng, bộ lọc ưu tiên, khung giả định, `<details>` giải thích thuật ngữ) và cập nhật bảng chi tiết từng cây; thêm 6 unit tests trong `TestAeroAgriFix6`. |
| **Bước 7** | *(commit hiện tại)* | `fix6 report` | Bổ sung mục `Rotation strategies`, `Validation`, `Known Limitations` vào `docs/SUBMISSION_NOTES.md`; cập nhật mục 1 & 4 của `README.md`; ghi báo cáo mục **Fix 6** vào `MORNING_REPORT.md`. |

---

### 10.2. Output `python -m pytest -q`

```text
......................................                                   [100%]
38 passed, 1 warning in 20.31s
```

---

### 10.3. Bảng Baseline Trước và Sau Bước 1

#### A. Trên dữ liệu Demo (`tests/fixtures/regression_baseline.json`, Seed 42)

| Vùng | Kịch bản | Cây trồng (`crop_id`) | `season_window` (Trước → Sau) | `score` (Trước → Sau) | `risk_level` (Trước → Sau) | `r` (Trước → Sau) | `deficit_mm` (Trước → Sau) | `water_vs_baseline_pct` (Trước → Sau) |
|---|---|---|---|---|---|---|---|---|
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `rice` | `01-01→04-15` → **`11-01→02-13`** | `17.0` → **`35.8`** | `CRITICAL` → **`SEVERE`** | `0.58` → **`0.485`** | `1124.1` → **`721.5`** | `0.0%` → **`0.0%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `soybean` | `01-01→04-10` → **`11-01→02-08`** | `48.2` → **`82.3`** | `CRITICAL` → **`MODERATE`** | `0.57` → **`0.224`** | `429.3` → **`67.3`** | `+61.8%` → **`+90.7%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `maize` | `01-01→04-10` → **`11-01→02-08`** | `50.6` → **`77.6`** | `SEVERE` → **`SEVERE`** | `0.48` → **`0.47`** | `418.6` → **`63.6`** | `+62.8%` → **`+91.2%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `rice_shrimp` | `01-01→04-30` → **`11-01→02-28`** | `None` → **`None`** | `INSUFFICIENT_DATA` | `0.57` → **`0.24`** | `None` → **`None`** | `None` → **`None`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `rice` | `01-01→04-15` → **`11-01→02-13`** | `5.7` → **`29.1`** | `CRITICAL` → **`CRITICAL`** | `0.81` → **`0.629`** | `1173.7` → **`803.8`** | `0.0%` → **`0.0%`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `soybean` | `01-01→04-10` → **`11-01→02-08`** | `36.2` → **`71.8`** | `CRITICAL` → **`SEVERE`** | `0.81` → **`0.46`** | `467.5` → **`140.6`** | `+60.2%` → **`+82.5%`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `maize` | `01-01→04-10` → **`11-01→02-08`** | `40.6` → **`67.1`** | `CRITICAL` → **`CRITICAL`** | `0.72` → **`0.62`** | `456.1` → **`136.7`** | `+61.1%` → **`+83.0%`** |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0%)` | `coffee` | `01-01→04-30` → **`01-01→04-30`** | `27.8` → **`13.7`** | `SEVERE` → **`INSUFFICIENT_DATA`** | `0.37` → **`None`** | `723.5` → **`723.5`** | `0.0%` → **`0.0%`** |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0%)` | `coffee_cover_crop` | `01-01→04-30` → **`01-01→04-30`** | `18.0` → **`0.0`** | `SEVERE` → **`INSUFFICIENT_DATA`** | `0.37` → **`None`** | `838.7` → **`838.7`** | `-15.9%` → **`-15.9%`** |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0%)` | `maize` | `01-01→04-10` → *(đã bỏ)* | `49.9` → *(đã bỏ)* | `LOW` → *(đã bỏ)* | `0.09` → *(đã bỏ)* | `518.8` → *(đã bỏ)* | `+28.3%` → *(đã bỏ)* |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30%)` | `coffee` | `01-01→04-30` → **`01-01→04-30`** | `14.6` → **`13.7`** | `CRITICAL` → **`INSUFFICIENT_DATA`** | `0.73` → **`None`** | `767.7` → **`767.7`** | `0.0%` → **`0.0%`** |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30%)` | `coffee_cover_crop` | `01-01→04-30` → **`01-01→04-30`** | `4.8` → **`0.0`** | `CRITICAL` → **`INSUFFICIENT_DATA`** | `0.73` → **`None`** | `889.6` → **`889.6`** | `-15.9%` → **`-15.9%`** |

#### B. Trên dữ liệu thật NASA POWER (`data/raw/power/`, 2015–2025)

| Vùng | Kịch bản | Cây trồng (`crop_id`) | `season_window` (Trước → Sau) | `score` (Trước → Sau) | `risk_level` (Trước → Sau) | `r` (Trước → Sau) | `deficit_mm` (Trước → Sau) | `water_vs_baseline_pct` (Trước → Sau) |
|---|---|---|---|---|---|---|---|---|
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `rice` | `01-01→04-15` → **`11-01→02-13`** | `22.7` → **`28.5`** | `MODERATE` → **`LOW`** | `0.206` → **`0.002`** | `1060.1` → **`759.4`** | `0.0%` → **`0.0%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `soybean` | `01-01→04-10` → **`11-01→02-08`** | `67.6` → **`88.7`** | `MODERATE` → **`LOW`** | `0.206` → **`0.002`** | `394.9` → **`119.9`** | `+62.7%` → **`+84.2%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `maize` | `01-01→04-10` → **`11-01→02-08`** | `71.2` → **`89.2`** | `LOW` → **`LOW`** | `0.091` → **`0.002`** | `390.4` → **`114.8`** | `+63.2%` → **`+84.9%`** |
| `Ben_Tre_DBSCL` | `(0°C, 0%)` | `rice_shrimp` | `01-01→04-30` → **`11-01→02-28`** | `None` → **`None`** | `INSUFFICIENT_DATA` | `0.206` → **`0.008`** | `None` → **`None`** | `None` → **`None`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `rice` | `01-01→04-15` → **`11-01→02-13`** | `13.4` → **`27.2`** | `CRITICAL` → **`LOW`** | `0.530` → **`0.048`** | `1114.8` → **`832.8`** | `0.0%` → **`0.0%`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `soybean` | `01-01→04-10` → **`11-01→02-08`** | `56.9` → **`83.2`** | `CRITICAL` → **`LOW`** | `0.530` → **`0.033`** | `438.4` → **`184.9`** | `+60.7%` → **`+77.8%`** |
| `Ben_Tre_DBSCL` | `(+2°C, -30%)` | `maize` | `01-01→04-10` → **`11-01→02-08`** | `61.7` → **`83.7`** | `SEVERE` → **`LOW`** | `0.370` → **`0.033`** | `433.6` → **`178.9`** | `+61.1%` → **`+78.5%`** |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0%)` | `coffee` | `01-01→04-30` → **`01-01→04-30`** | `34.4` → **`16.1`** | `MODERATE` → **`INSUFFICIENT_DATA`** | `0.200` → **`None`** | `351.3` → **`351.3`** | `0.0%` → **`0.0%`** |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0%)` | `coffee_cover_crop` | `01-01→04-30` → **`01-01→04-30`** | `22.9` → **`0.0`** | `MODERATE` → **`INSUFFICIENT_DATA`** | `0.200` → **`None`** | `418.5` → **`418.5`** | `-19.1%` → **`-19.1%`** |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30%)` | `coffee` | `01-01→04-30` → **`01-01→04-30`** | `28.9` → **`15.2`** | `SEVERE` → **`INSUFFICIENT_DATA`** | `0.367` → **`None`** | `393.0` → **`393.0`** | `0.0%` → **`0.0%`** |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30%)` | `coffee_cover_crop` | `01-01→04-30` → **`01-01→04-30`** | `18.1` → **`0.0`** | `SEVERE` → **`INSUFFICIENT_DATA`** | `0.367` → **`None`** | `463.5` → **`463.5`** | `-17.9%` → **`-17.9%`** |

---

### 10.4. Bảng kết quả thật (`data/raw/` NASA POWER 2015–2025) cho từng chiến lược luân canh (`evaluate_rotations`)

| Vùng | Kịch bản | Mã | Tên chiến lược (`name_vi`) | `annual_deficit_mm` | `partial` | `bare_months` | Chi tiết `deficit_mm` từng pha |
|---|---|---|---|---:|:---:|:---:|---|
| `Ben_Tre_DBSCL` | `(0°C, 0% mưa)` | **S0** | Hiện trạng: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | **1226.2 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **466.8 mm** (`heat_ratio = 0.007`)<br>• Lúa Đông Xuân sớm (`11-01 → 02-13`): **759.4 mm** (`heat_ratio = 0.002`) |
| `Ben_Tre_DBSCL` | `(0°C, 0% mưa)` | **S1** | Lúa – tôm (lúa mùa mưa, tôm sú mùa khô) | **475.5 mm** *(chưa tính vụ tôm)* | `True` | `[1, 2, 8, 12]` (4 tháng) | • Lúa mùa mưa (`09-01 → 12-14`): **475.5 mm** (`heat_ratio = 0.000`)<br>• Tôm sú (nước lợ) (`03-01 → 07-31`): `modeled = False` (`deficit_mm = None`) |
| `Ben_Tre_DBSCL` | `(0°C, 0% mưa)` | **S2** | Lúa Hè Thu + đậu tương thay vụ Đông Xuân | **586.7 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **466.8 mm** (`heat_ratio = 0.007`)<br>• Đậu tương (`11-01 → 02-08`): **119.9 mm** (`heat_ratio = 0.002`) |
| `Ben_Tre_DBSCL` | `(0°C, 0% mưa)` | **S3** | Lúa Hè Thu + ngô thay vụ Đông Xuân | **581.6 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **466.8 mm** (`heat_ratio = 0.007`)<br>• Ngô (`11-01 → 02-08`): **114.8 mm** (`heat_ratio = 0.002`) |
| `Ben_Tre_DBSCL` | `(+2°C, -30% mưa)` | **S0** | Hiện trạng: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | **1400.7 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **567.9 mm** (`heat_ratio = 0.023`)<br>• Lúa Đông Xuân sớm (`11-01 → 02-13`): **832.8 mm** (`heat_ratio = 0.048`) |
| `Ben_Tre_DBSCL` | `(+2°C, -30% mưa)` | **S1** | Lúa – tôm (lúa mùa mưa, tôm sú mùa khô) | **568.4 mm** *(chưa tính vụ tôm)* | `True` | `[1, 2, 8, 12]` (4 tháng) | • Lúa mùa mưa (`09-01 → 12-14`): **568.4 mm** (`heat_ratio = 0.000`)<br>• Tôm sú (nước lợ) (`03-01 → 07-31`): `modeled = False` (`deficit_mm = None`) |
| `Ben_Tre_DBSCL` | `(+2°C, -30% mưa)` | **S2** | Lúa Hè Thu + đậu tương thay vụ Đông Xuân | **752.8 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **567.9 mm** (`heat_ratio = 0.023`)<br>• Đậu tương (`11-01 → 02-08`): **184.9 mm** (`heat_ratio = 0.033`) |
| `Ben_Tre_DBSCL` | `(+2°C, -30% mưa)` | **S3** | Lúa Hè Thu + ngô thay vụ Đông Xuân | **746.8 mm** | `False` | `[2, 3, 4, 5, 9, 10]` (6 tháng) | • Lúa Hè Thu (`05-25 → 09-06`): **567.9 mm** (`heat_ratio = 0.023`)<br>• Ngô (`11-01 → 02-08`): **178.9 mm** (`heat_ratio = 0.033`) |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0% mưa)` | **D0** | Hiện trạng: cà phê vối đất trần | **351.3 mm** | `False` | `[]` (0 tháng) | • Cà phê (đất trần) (`01-01 → 04-30`): **351.3 mm** (`heat_ratio = None`) |
| `Dak_Lak_Tay_Nguyen` | `(0°C, 0% mưa)` | **D1** | Cà phê vối có cây che phủ đất / thảm cỏ | **418.5 mm** | `False` | `[]` (0 tháng) | • Cà phê + cây phủ (`01-01 → 04-30`): **418.5 mm** (`heat_ratio = None`) |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30% mưa)` | **D0** | Hiện trạng: cà phê vối đất trần | **393.0 mm** | `False` | `[]` (0 tháng) | • Cà phê (đất trần) (`01-01 → 04-30`): **393.0 mm** (`heat_ratio = None`) |
| `Dak_Lak_Tay_Nguyen` | `(+2°C, -30% mưa)` | **D1** | Cà phê vối có cây che phủ đất / thảm cỏ | **463.5 mm** | `False` | `[]` (0 tháng) | • Cà phê + cây phủ (`01-01 → 04-30`): **463.5 mm** (`heat_ratio = None`) |

---

## 11. Fix 6B (Auto-Generated Config Source Table, Unfabricated Citations & Assumed Rice Extra Water Breakdown)

### 11.1. Commit Hash của từng bước (Bước 1 → Bước 3 + Report)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `0292e08` | `docs: generate SUBMISSION_NOTES source table from config, remove fabricated citations` | Tạo `scripts/gen_sources_table.py` tự động sinh 2 bảng nguồn trực tiếp từ `config/rotations.json` và `config/crops.json`; thay bảng viết tay trong mục 2.4 của `docs/SUBMISSION_NOTES.md` bằng khối giữa `<!-- BEGIN SOURCES ... -->` và `<!-- END SOURCES -->`; sửa câu mô tả `_display_rule` (`at least 15 days`); thêm unit test `test_fix6b_sources_table_in_sync`. |
| **Bước 2** | `6b4a731` | `docs: fix validation quote, limitations, README strategy order` | Thay nguyên văn mục Validation 2 và các mục Known Limitations (pha tôm `03-01 → 07-31`, tháng mặn `[2, 3, 4]`, ngưỡng nhiệt, nước giả định của lúa) trong `docs/SUBMISSION_NOTES.md`; sửa thứ tự `S2`/`S3` và nguồn lịch thời vụ trong `README.md`. |
| **Bước 3** | `3fa8bcf` | `feat: show assumed rice land-prep/percolation water separately` | Thêm `assumed_extra_mm = round(mean_water_req_mm - mean_etc_mm, 1)` vào mỗi pha có mô hình trong `core/rotation.py`; cập nhật `web/app.js` hiển thị công thức `ETc X + nước giả định (làm đất/thấm) Y [giả định, chưa có nguồn] − mưa hiệu quả Z = thiếu hụt W mm (trung bình các năm)` (bỏ cụm `+ nước giả định...` khi `Y = 0`); thêm unit test `test_fix6b_assumed_extra`. |
| **Kết thúc** | *(commit hiện tại)* | `fix6b report` | Ghi báo cáo mục **11. Fix 6B** vào `MORNING_REPORT.md`. |

---

### 11.2. Output `python -m pytest -q`

```text
........................................                                 [100%]
40 passed, 1 warning in 22.65s
```

---

### 11.3. Output lệnh `grep` kiểm tra trích dẫn bịa ở Bước 2

Lệnh kiểm tra trên `docs/`, `README.md` và `web/`:
```bash
grep -rnE "1705|Nhân Dân|VnEconomy|VietnamPlus|Báo Chính phủ|Soils Bulletin|Yoshida|Dupuis|Sánchez|Hatfield|Sở NN&PTNT Bến Tre|01-15 → 05-15|ge 10" docs/ README.md web/
```
Kết quả:
```text
(rỗng — 0 dòng khớp)
```

---

### 11.4. Bảng chi tiết các pha Bến Tre (`Ben_Tre_DBSCL`) chạy trên dữ liệu thật (`data/raw/power/`, 2015–2025)

| Kịch bản | Chiến lược | Pha (`label`) | Khung mùa vụ (`window`) | `modeled` | `etc_mm` (mm) | `assumed_extra_mm` (mm) | `peff_mm` (mm) | `deficit_mm` (mm, trung bình các năm) |
|---|---:|---|---|:---:|---:|---:|---:|---:|
| **(0°C, 0% mưa)** | `S0` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `443.7` | **515.0** | `491.9` | **466.8** |
| **(0°C, 0% mưa)** | `S0` | Lúa Đông Xuân sớm | `11-01 → 02-13` | `True` | `436.9` | **515.0** | `192.6` | **759.4** |
| **(0°C, 0% mưa)** | `S1` | Lúa mùa mưa | `09-01 → 12-14` | `True` | `404.3` | **515.0** | `443.9` | **475.5** |
| **(0°C, 0% mưa)** | `S1` | Tôm sú (nước lợ) | `03-01 → 07-31` | `False` | `None` | `None` | `None` | `None` |
| **(0°C, 0% mưa)** | `S2` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `443.7` | **515.0** | `491.9` | **466.8** |
| **(0°C, 0% mưa)** | `S2` | Đậu tương | `11-01 → 02-08` | `True` | `310.9` | **0.0** | `191.4` | **119.9** |
| **(0°C, 0% mưa)** | `S3` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `443.7` | **515.0** | `491.9` | **466.8** |
| **(0°C, 0% mưa)** | `S3` | Ngô | `11-01 → 02-08` | `True` | `305.2` | **0.0** | `191.4` | **114.8** |
| **(+2°C, -30% mưa)** | `S0` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `469.2` | **515.0** | `416.3` | **567.9** |
| **(+2°C, -30% mưa)** | `S0` | Lúa Đông Xuân sớm | `11-01 → 02-13` | `True` | `463.9` | **515.0** | `146.1` | **832.8** |
| **(+2°C, -30% mưa)** | `S1` | Lúa mùa mưa | `09-01 → 12-14` | `True` | `428.2` | **515.0** | `374.9` | **568.4** |
| **(+2°C, -30% mưa)** | `S1` | Tôm sú (nước lợ) | `03-01 → 07-31` | `False` | `None` | `None` | `None` | `None` |
| **(+2°C, -30% mưa)** | `S2` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `469.2` | **515.0** | `416.3` | **567.9** |
| **(+2°C, -30% mưa)** | `S2` | Đậu tương | `11-01 → 02-08` | `True` | `330.2` | **0.0** | `145.3` | **184.9** |
| **(+2°C, -30% mưa)** | `S3` | Lúa Hè Thu | `05-25 → 09-06` | `True` | `469.2` | **515.0** | `416.3` | **567.9** |
| **(+2°C, -30% mưa)** | `S3` | Ngô | `11-01 → 02-08` | `True` | `324.1` | **0.0** | `145.3` | **178.9** |





