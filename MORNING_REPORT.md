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


