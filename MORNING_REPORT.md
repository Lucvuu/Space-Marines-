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

---

## 12. Fix 6C (Rice Extra Water from FAO Training Manual 3: SAT 200 + WL 100, PERC 4)

### 12.1. Commit Hash của từng bước (Bước 1 → Bước 2 + Report)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `03c09d7` | `config: rice extra water from FAO Training Manual 3 (SAT 200 + WL 100, PERC 4)` | Cập nhật `config/crops.json` cho `rice`: `land_prep_mm = 300`, `percolation_mm_day = 4`, và `source.water_extra` theo FAO Training Manual 3 (Brouwer & Heibloem 1986, Part II Sec. 4.4); cập nhật `Ben_Tre_DBSCL.assumptions[1]` trong `config/rotations.json`; cập nhật `test_step5_water_balance_rice_vs_soybean` (`515.0 → 720.0`), 10 giá trị trong `tests/fixtures/regression_baseline.json`, và đồng bộ bảng nguồn trong `docs/SUBMISSION_NOTES.md`. |
| **Bước 2** | `53d42e4` | `docs: cite FAO Training Manual 3 for rice extra water` | Chép nguyên văn mô tả `land_prep_mm`/`percolation_mm_day` và mục Limitations 5 trong `docs/SUBMISSION_NOTES.md`, mục 5 trong `README.md`, và nhãn hiển thị `nước làm đất, lớp nước và thấm (FAO TM3)` / `loại đất giả định` trong `web/app.js`. |
| **Kết thúc** | *(commit hiện tại)* | `fix6c report` | Ghi báo cáo mục **12. Fix 6C** vào `MORNING_REPORT.md`. |

---

### 12.2. Output `git diff tests/fixtures/regression_baseline.json` (ở Bước 1 — đúng 10 dòng thay đổi)

```diff
diff --git a/tests/fixtures/regression_baseline.json b/tests/fixtures/regression_baseline.json
index 63c2a40..358ba88 100644
--- a/tests/fixtures/regression_baseline.json
+++ b/tests/fixtures/regression_baseline.json
@@ -5,22 +5,22 @@
         "score": 35.8,
         "risk_level": "SEVERE",
         "r": 0.398,
-        "deficit_mm": 721.5,
+        "deficit_mm": 926.5,
         "water_vs_baseline_pct": 0.0
       },
       "soybean": {
-        "score": 82.3,
+        "score": 83.3,
         "risk_level": "SEVERE",
         "r": 0.362,
         "deficit_mm": 67.3,
-        "water_vs_baseline_pct": 90.7
+        "water_vs_baseline_pct": 92.7
       },
       "maize": {
-        "score": 77.6,
+        "score": 78.6,
         "risk_level": "CRITICAL",
         "r": 0.527,
         "deficit_mm": 63.6,
-        "water_vs_baseline_pct": 91.2
+        "water_vs_baseline_pct": 93.1
       },
       "rice_shrimp": {
         "score": null,
@@ -35,22 +35,22 @@
         "score": 29.1,
         "risk_level": "SEVERE",
         "r": 0.449,
-        "deficit_mm": 803.8,
+        "deficit_mm": 1008.8,
         "water_vs_baseline_pct": 0.0
       },
       "soybean": {
-        "score": 71.8,
+        "score": 73.6,
         "risk_level": "SEVERE",
         "r": 0.43,
         "deficit_mm": 140.6,
-        "water_vs_baseline_pct": 82.5
+        "water_vs_baseline_pct": 86.1
       },
       "maize": {
-        "score": 67.1,
+        "score": 68.8,
         "risk_level": "CRITICAL",
         "r": 0.527,
         "deficit_mm": 136.7,
-        "water_vs_baseline_pct": 83.0
+        "water_vs_baseline_pct": 86.4
       },
       "rice_shrimp": {
         "score": null,
```

---

### 12.3. Output `python -m pytest -q`

```text
........................................                                 [100%]
40 passed, 1 warning in 23.25s
```

---

### 12.4. Output lệnh `grep` ở Bước 2

Lệnh kiểm tra trên `docs/`, `README.md`, `web/` và `config/`:
```bash
grep -rnE "3 mm/day|3 mm/ngày|thấm 3|source TODO|chưa có nguồn chuẩn|calendar_12m" docs/ README.md web/ config/
```
Kết quả (chỉ còn đúng 1 dòng ngoại lệ `st.calendar_12m` làm fallback trong `web/app.js`):
```text
web/app.js:468:        const calHtml = (st.calendar || st.calendar_12m || []).map(mc => {
```

---

### 12.5. Bảng số liệu trên dữ liệu thật (`data/raw/power/`, 2015–2025) ở kịch bản `(0 °C, 0%)`

| Vùng | Chiến lược | `annual_deficit_mm` | `partial` | `bare_months` | Pha (`label`) | Khung mùa vụ (`window`) | `etc_mm` (mm) | `assumed_extra_mm` (mm) | `peff_mm` (mm) | `deficit_mm` (mm) |
|---|---|---:|:---:|:---:|---|---|---:|---:|---:|---:|
| `Ben_Tre_DBSCL` | **S0**: Hiện trạng: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | **1636.2 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Lúa Hè Thu | `05-25 → 09-06` | `443.7` | **720.0** | `491.9` | **671.8** |
| `Ben_Tre_DBSCL` | **S0**: Hiện trạng: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | **1636.2 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Lúa Đông Xuân sớm | `11-01 → 02-13` | `436.9` | **720.0** | `192.6` | **964.4** |
| `Ben_Tre_DBSCL` | **S1**: Lúa – tôm (lúa mùa mưa, tôm sú mùa khô) | **680.5 mm** *(chưa tính vụ tôm)* | `True` | `[1, 2, 8, 12]` | Lúa mùa mưa | `09-01 → 12-14` | `404.3` | **720.0** | `443.9` | **680.5** |
| `Ben_Tre_DBSCL` | **S1**: Lúa – tôm (lúa mùa mưa, tôm sú mùa khô) | **680.5 mm** *(chưa tính vụ tôm)* | `True` | `[1, 2, 8, 12]` | Tôm sú (nước lợ) | `03-01 → 07-31` | `None` | `None` | `None` | `None` |
| `Ben_Tre_DBSCL` | **S2**: Lúa Hè Thu + đậu tương thay vụ Đông Xuân | **791.7 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Lúa Hè Thu | `05-25 → 09-06` | `443.7` | **720.0** | `491.9` | **671.8** |
| `Ben_Tre_DBSCL` | **S2**: Lúa Hè Thu + đậu tương thay vụ Đông Xuân | **791.7 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Đậu tương | `11-01 → 02-08` | `310.9` | **0.0** | `191.4` | **119.9** |
| `Ben_Tre_DBSCL` | **S3**: Lúa Hè Thu + ngô thay vụ Đông Xuân | **786.6 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Lúa Hè Thu | `05-25 → 09-06` | `443.7` | **720.0** | `491.9` | **671.8** |
| `Ben_Tre_DBSCL` | **S3**: Lúa Hè Thu + ngô thay vụ Đông Xuân | **786.6 mm** | `False` | `[2, 3, 4, 5, 9, 10]` | Ngô | `11-01 → 02-08` | `305.2` | **0.0** | `191.4` | **114.8** |
| `Dak_Lak_Tay_Nguyen` | **D0**: Hiện trạng: cà phê vối đất trần | **351.3 mm** | `False` | `[]` | Cà phê (đất trần) | `01-01 → 04-30` | `425.4` | **0.0** | `74.1` | **351.3** |
| `Dak_Lak_Tay_Nguyen` | **D1**: Cà phê vối có cây che phủ đất / thảm cỏ | **418.5 mm** | `False` | `[]` | Cà phê + cây phủ | `01-01 → 04-30` | `492.6` | **0.0** | `74.1` | **418.5** |

---

## 13. Fix 6D (Verified Soil-Health Evidence in `S2`, `S3`, `D1` & TCVN 9168:2012 Percolation Sensitivity Note)

### 13.1. Commit Hash của từng bước (Bước 1 → Bước 2 + Report)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `e089625` | `config: add verified soil-health evidence to S2, S3, D1` | Bổ sung nguyên văn giả định độ nhạy thấm `2 mm/ngày` (TCVN 9168:2012 qua Nguyễn Trung Nam, 2022–2023) vào `Ben_Tre_DBSCL.assumptions`; bổ sung bằng chứng Võ Thị Gương et al. (2010) và Nguyễn Mỹ Hoa và cs. (2014) vào `S2` và `S3`; bổ sung bằng chứng Quyết định 26/QĐ-VNLT-KHKH (04/3/2013, WASI) và ghi chú rủi ro cỏ dại vào `D1` trong `config/rotations.json`. |
| **Bước 2** | `5db991a` | `docs: sync sources table, note TCVN percolation sensitivity` | Chạy `python scripts/gen_sources_table.py` đồng bộ bảng nguồn tự động và bổ sung câu ghi chú độ nhạy `2 mm/day` (`510 mm` so với `720 mm`) vào mục Limitations 5 trong `docs/SUBMISSION_NOTES.md`. |
| **Kết thúc** | *(commit hiện tại)* | `fix6d report` | Ghi báo cáo mục **13. Fix 6D** vào `MORNING_REPORT.md`. |

---

### 13.2. Output `python -m pytest -q`

```text
........................................                                 [100%]
40 passed, 1 warning in 26.19s
```

---

### 13.3. Output `git diff --stat` của 2 commit

- **Bước 1 (`e089625` — `git diff --stat e089625~1..e089625`)**:
```text
 config/rotations.json | 19 ++++++++++++-------
 1 file changed, 12 insertions(+), 7 deletions(-)
```

- **Bước 2 (`5db991a` — `git diff --stat 5db991a~1..5db991a`)**:
```text
 docs/SUBMISSION_NOTES.md | 6 +++++-
 1 file changed, 5 insertions(+), 1 deletion(-)
```

- **Tổng hợp cả 2 bước (`git diff --stat e089625~1..5db991a`)**:
```text
 config/rotations.json    | 19 ++++++++++++-------
 docs/SUBMISSION_NOTES.md |  6 +++++-
 2 files changed, 17 insertions(+), 8 deletions(-)
```



---

## 14. Fix 7 (NDVI theo đúng giai đoạn đã kiểm chứng, ghi rõ tháng được tính nước, đổi ô hỏi đáp thành báo cáo)

### 14.1. Commit Hash của từng bước (Bước 1 → Bước 3 + Report)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `befd8e9` | `rotation: NDVI reference years, water_months per strategy` | Thêm `ndvi_years: [2022, 2024]` và nguồn vào `Ben_Tre_DBSCL` trong `config/rotations.json`; lọc NDVI theo khoảng năm nếu cấu hình có; đặt ngưỡng hiển thị pha `MIN_PHASE_DAYS_FOR_DISPLAY = 15`; thêm cờ `ignore_perennial` khi tính tháng có cây trồng để tránh cây lâu năm chiếm trọn 12 tháng lịch; trả về `water_months`, `water_full_year`, `ndvi_years`, `ndvi_years_source` trong kết quả chiến lược; thêm 3 unit tests (`test_fix7_1_ndvi_monthly_year_filter`, `test_fix7_2_water_months`, `test_fix7_3_ben_tre_ndvi_years`). |
| **Bước 2** | `59cb280` | `advise: follow scenario sliders, drop emoji` | Endpoint `/api/advise` đọc `delta_temp_c` và `delta_rain_pct` từ request body và truyền vào `evaluate_crop_suitability`; xoá toàn bộ emoji trong `core/advisor.py`. |
| **Bước 3** | `c582d40` | `web: report button, water-month label, NDVI years` | Thay ô hỏi đáp tự do bằng nút `#btnReport` ("Tạo báo cáo cho vùng này"); hiển thị báo cáo trong `#chatOutput`; reset báo cáo khi đổi vùng hoặc kéo slider kịch bản; hiển thị nhãn nước động `${waterLabel(st)}` (ghi rõ các tháng được tính nước nếu không đủ năm kèm chú thích "các tháng khác chưa tính"); chú thích năm tính NDVI MODIS; cập nhật mô tả file trong `README.md`. |
| **Kết thúc** | *(commit hiện tại)* | `fix7 report` | Ghi báo cáo mục **14. Fix 7** vào `MORNING_REPORT.md`. |

---

### 14.2. Output `python -m pytest -q`

```text
...........................................                              [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
43 passed, 1 warning in 28.70s
```

---

### 14.3. Output 3 lệnh gọi API ở Bước 4 (kiểm tra trên dữ liệu thật)

#### 1. `POST /api/rotations` (`{"region": "Ben_Tre_DBSCL", "delta_temp_c": 0, "delta_rain_pct": 0}`)
- `ndvi_years`: `[2022, 2024]`
- `ndvi_monthly`: `[0.835, 0.617, 0.35, 0.454, 0.452, 0.613, 0.795, 0.737, 0.433, 0.447, 0.403, 0.781]`
- `annual_deficit_mm`:
  * `S0`: `1636.2`
  * `S1`: `680.5`
  * `S2`: `791.7`
  * `S3`: `786.6`

#### 2. `POST /api/rotations` (`{"region": "Dak_Lak_Tay_Nguyen", "delta_temp_c": 0, "delta_rain_pct": 0}`)
- `D0`:
  * `water_months`: `[1, 2, 3, 4]`
  * `water_full_year`: `false`
  * `annual_deficit_mm`: `351.3`
- `D1`:
  * `water_months`: `[1, 2, 3, 4]`
  * `water_full_year`: `false`
  * `annual_deficit_mm`: `418.5`

#### 3. `POST /api/advise` (`{"region": "Ben_Tre_DBSCL", "delta_temp_c": 2, "delta_rain_pct": -20}`)
- Chứa `Kịch bản mô phỏng`: **Đúng** (`*Kịch bản mô phỏng:* Nhiệt độ thay đổi `+2.0 °C`, lượng mưa thay đổi `-20%`.`)
- Chứa emoji (`[\U0001F300-\U0001FAFF\u2600-\u27bf]`): **Không (0 emoji)**

---

### 14.4. Output `git diff --stat` của 3 commit (`befd8e9~1..c582d40`)

```text
 README.md             |  4 +--
 config/rotations.json |  2 ++
 core/advisor.py       |  6 ++--
 core/rotation.py      | 73 ++++++++++++++++++++++++++++++++++---------
 server.py             |  5 ++-
 tests/test_core.py    | 42 +++++++++++++++++++++++++
 web/app.js            | 85 +++++++++++++++++++--------------------------------
 web/index.html        | 48 ++++++++---------------------
 8 files changed, 154 insertions(+), 111 deletions(-)
```


---

## 15. Fix 8 (Gỡ số liệu chưa kiểm chứng trên web, báo cáo theo phương án luân canh, ghi rõ giới hạn dữ liệu)

### 15.1. Commit Hash của từng bước (Commit 1, Commit 2, Commit Docs & Report)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Commit 1** | `bf0426d` | `config+web: strategy notes from config, drop unverified WASI figures` | Thêm trường `"note"` vào S1, D1 và ghi chú ô lưới POWER cỡ 50 km vào `assumptions` của 2 vùng trong `config/rotations.json`; truyền `note` qua `core/rotation.py`; hiển thị `st.note` trên web, đổi badge `Thuận thiên` thành `Chưa tính vụ tôm`, bỏ ngưỡng 45% `isRecommended`; đổi tiêu đề biểu đồ thành mưa tổng 24 tháng gần nhất, đổi tiêu đề NDVI MODIS trung vị ô 3×3 km; lọc bỏ cây không tính được nước và thêm trạng thái `Chưa tính mặn` trong bảng đánh giá cây; dọn dẹp các CSS class không còn dùng trong `web/style.css`. |
| **Commit 2** | `1dbebd3` | `advise: list rotation strategies, drop score-based pick` | Endpoint `/api/advise` trong `server.py` gọi `evaluate_rotations` và truyền `rotations` vào `build_advice`; `core/advisor.py` bỏ chọn cây theo điểm, bảng cây bỏ 2 cột điểm và cấp rủi ro, mục 3 liệt kê phương án luân canh (`_rotation_actions`) kèm bù trừ nước so với hiện trạng, lịch và rủi ro/khoảng trống cần kiểm chứng; bổ sung 3 unit tests `test_fix8_1_web_khong_con_chu_chua_kiem_chung`, `test_fix8_2_ghi_chu_phuong_an_tu_config`, `test_fix8_3_bao_cao_theo_phuong_an`. |
| **Bước 4** | `b513687` | `docs: agent rules match real tests` | Cập nhật `DESIGN.md` và `AGENTS.md`: làm rõ quy ước ID/chuỗi kiểm thử, cập nhật số bài test pass và quy định câu chữ khoa học đọc từ `config/*.json`. |
| **Kết thúc** | *(commit hiện tại)* | `fix8 report` | Ghi báo cáo mục **15. Fix 8** vào `MORNING_REPORT.md`. |

---

### 15.2. Output `python -m pytest -q`

```text
..............................................                           [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
46 passed, 1 warning in 32.02s
```

---

### 15.3. Output 4 lệnh gọi API ở Bước 5 (kiểm tra trên dữ liệu thật)

#### 1. `POST /api/rotations` (`{"region": "Ben_Tre_DBSCL", "delta_temp_c": 0, "delta_rain_pct": 0}`)
- `annual_deficit_mm`:
  * `S0`: `1636.2`
  * `S1`: `680.5`
  * `S2`: `791.7`
  * `S3`: `786.6`
- `note` của S1: `"Vụ tôm dùng nước lợ mùa khô nên không tính vào nước ngọt; con số trên thẻ chưa tính giai đoạn nuôi tôm. 'Chỉ xuống giống lúa khi… độ mặn trong đất < 2‰' (Khuyến nông QG, sổ tay hạn mặn mùa khô 2026–2027, tr.10)."`

#### 2. `POST /api/rotations` (`{"region": "Dak_Lak_Tay_Nguyen", "delta_temp_c": 0, "delta_rain_pct": 0}`)
- `annual_deficit_mm`:
  * `D0`: `351.3`
  * `D1`: `418.5`
- `note` của D1: `"Theo FAO-56, cỏ phủ kín còn sống làm tăng nhu cầu nước, nên số liệu D1 là cận trên. Quy trình WASI (QĐ 26/QĐ-VNLT-KHKH, 2013): làm cỏ theo băng trên đất dốc, diệt cỏ quanh vườn đầu mùa khô để chống cháy, tủ gốc và ép xanh cuối mùa mưa. Chưa tìm thấy số đo tại Tây Nguyên cho thấy cây phủ làm giảm nước tưới."` (chứa `Chưa tìm thấy số đo`)

#### 3. `POST /api/advise` (`{"region": "Ben_Tre_DBSCL", "delta_temp_c": 2, "delta_rain_pct": -20}`)
- Chứa `Cân nhắc chuẩn bị đất và giống`: **Không (False)**
- Chứa `Mẫu: False`: **Không (False)**
- Mục 3 nguyên văn:
```markdown
#### 3. Việc nên làm trước vụ tới
Mùa mặn theo văn bản: tháng 2, 3, 4.
- **Lúa – tôm (lúa mùa mưa, tôm sú mùa khô)**: nước ngọt phải tưới thêm 7.468 m³/ha (−10.179 m³/ha so với hiện trạng). Lịch: Lúa mùa mưa 09-01 đến 12-14; Tôm sú (nước lợ) 03-01 đến 07-31. Chưa tính giai đoạn nuôi tôm. Cần kiểm chứng trước khi làm: Chưa có nguồn lịch lúa–tôm riêng cho Ba Tri; đang dùng lịch ở Bình Đại.; App chưa mô hình hóa nước và rủi ro của vụ tôm.; Chi phí đầu tư, dịch bệnh tôm, đầu ra: cần nông dân và cán bộ khuyến nông đánh giá.
- **Lúa Hè Thu + đậu tương thay vụ Đông Xuân**: nước ngọt phải tưới thêm 9.119 m³/ha (−8.528 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Đậu tương 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo đậu tương trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày.; Số đo cho đậu tương trên đất lúa nhiễm mặn ven biển: chưa có. Số đo đang dùng là của đậu xanh ở Tiền Giang (vùng ngọt).; Đầu ra và giá đậu tương tại địa phương.
- **Lúa Hè Thu + ngô thay vụ Đông Xuân**: nước ngọt phải tưới thêm 9.058 m³/ha (−8.589 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Ngô 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo ngô trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày.; Đầu ra và giá ngô tại địa phương.
- Đo độ mặn nước kênh bằng bút đo cầm tay trước mỗi lần lấy nước tưới.
```

#### 4. `POST /api/evaluate` cho Bến Tre (`Ben_Tre_DBSCL`)
- Các cây có `deficit_mm != None` (web sẽ hiển thị): `['rice', 'soybean', 'maize']` (chính xác).

---

### 15.4. Output `git diff --stat` của các commit Fix 8 (`bb93d9f..HEAD`)

```text
 AGENTS.md             |   4 +-
 DESIGN.md             |   2 +-
 config/rotations.json |   8 +++-
 core/advisor.py       | 106 ++++++++++++++++++++++++--------------------------
 core/rotation.py      |   1 +
 server.py             |   3 +-
 tests/test_core.py    |  44 +++++++++++++++++++++
 web/app.js            |  58 ++++++++++++---------------
 web/index.html        |  17 ++++----
 web/style.css         |  51 ++++++++++++------------
 10 files changed, 165 insertions(+), 129 deletions(-)
```


---

## 16. Fix 9 (Tính nước theo từng tháng, mưa hiệu quả FAO TM3 cho lúa, khoảng thấm 2–4 mm/ngày, lấy NASA POWER đúng điểm ruộng)

### 16.1. Commit Hash của từng bước (Commit Bước 1–5, Commit Bước 7 & Báo cáo)

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1–5** | `f6f2223` | `water balance: monthly deficit, FAO TM3 Pe for rice, presaturation, percolation range` | Cập nhật cấu hình: `rice` thêm `sat_mm: 200`, `peff_method: fao_tm3`, `percolation_mm_day_low: 2`, các cây cạn thêm `peff_method: usda_scs`; S0 Bến Tre vụ Đông Xuân thêm `presaturated: true`; bổ sung `calculate_monthly_peff_tm3` trong `core/water_balance.py`, tính thiếu hụt nước theo từng tháng không bù trừ tháng mưa dư, trừ `sat_mm` nếu `presaturated`; `core/rotation.py` tính thêm `deficit_low_mm` và `annual_deficit_low_mm`; `web/app.js` sửa lệch tháng NDVI và hiển thị khoảng độ nhạy thấm 2 mm/ngày; thêm 4 tests mới (`test_fix9_1` → `test_fix9_4`) và tái sinh `regression_baseline.json`. |
| **Bước 7** | `bf1e23d` | `data: fetch NASA POWER at field points` | Cập nhật tọa độ vùng trong `config/regions.json` về đúng tọa độ điểm ruộng Ba Tri (10.0992, 106.6040) và điểm vườn Cư M'gar (12.8314, 108.1282); `core/power_fetch.py` đọc tọa độ động từ `regions.json` và cập nhật trường `point` trong manifest; tải dữ liệu NASA POWER thật tại 2 điểm ruộng mới; cập nhật câu giả định ô lưới 50 km tại đúng tọa độ điểm trong `config/rotations.json`. |
| **Kết thúc** | *(commit hiện tại)* | `fix9 report` | Ghi báo cáo mục **16. Fix 9** vào `MORNING_REPORT.md`. |

---

### 16.2. Output Pytest ở Bước 5b (trước khi cập nhật fixture) và Output cuối cùng

- **Ở Bước 5b (chỉ đúng 1 test fail do đổi công thức tính nước):**
```text
FAILED tests/test_core.py::TestAeroAgriStep7::test_prep6_regression_baseline
1 failed, 49 passed, 1 warning in 15.12s
```

- **Output Pytest cuối cùng:**
```text
..................................................                       [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
50 passed, 1 warning in 13.54s
```

---

### 16.3. Bảng Trước / Sau của Fixture (`tests/fixtures/regression_baseline.json`) ở Kịch bản `0.0_0.0`

| Vùng | Cây trồng | `deficit_mm` (Trước) | `deficit_mm` (Sau) | `score` (Trước → Sau) | `water_vs_baseline_pct` (Trước → Sau) |
|---|---|---:|---:|---:|---:|
| `Ben_Tre_DBSCL` | `rice` | 926.5 | 892.3 | 35.8 → 35.8 | 0.0% → 0.0% |
| `Ben_Tre_DBSCL` | `soybean` | 67.3 | 191.0 | 83.3 → 76.3 | 92.7% → 78.6% |
| `Ben_Tre_DBSCL` | `maize` | 63.6 | 201.8 | 78.6 → 70.7 | 93.1% → 77.4% |
| `Ben_Tre_DBSCL` | `rice_shrimp` | null | null | null → null | null → null |
| `Dak_Lak_Tay_Nguyen` | `coffee` | 723.5 | 723.5 | 13.7 → 13.7 | 0.0% → 0.0% |
| `Dak_Lak_Tay_Nguyen` | `coffee_cover_crop` | 838.7 | 838.7 | 0.0 → 0.0 | -15.9% → -15.9% |

---

### 16.4. Output API ở Bước 6 và Bước 7

- **Tọa độ và độ cao ô lưới mà NASA POWER API phản hồi tại điểm ruộng mới:**
  * Bến Tre (Ba Tri): `geometry.coordinates = [106.604, 10.099, 0.28]` (kinh độ 106.604, vĩ độ 10.099, độ cao ô lưới 0.28 m).
  * Đắk Lắk (Cư M'gar): `geometry.coordinates = [108.128, 12.831, 397.95]` (kinh độ 108.128, vĩ độ 12.831, độ cao ô lưới 397.95 m).

- **Kiểm tra thứ hạng mưa Bến Tre trên dữ liệu POWER mới (2015–2025):**
  * Tháng 10: `297.9 mm/tháng` (Rank 1 toàn năm).
  * Tháng 9: `278.2 mm/tháng` (Rank 2 toàn năm).
  * Khẳng định tháng 9 và 10 thuộc top mưa lớn nhất năm, tiền bão hòa đất (presaturated) của vụ Đông Xuân 1/11 hoàn toàn vững chắc.

- **Bảng so sánh `/api/rotations` ở kịch bản `(0, 0)` giữa Bước 6 (tọa độ vùng cũ) và Bước 7 (tọa độ điểm ruộng mới):**

| Vùng | Chiến lược | Tiêu chí | Bước 6 (tọa độ vùng cũ) | Bước 7 (tọa độ điểm ruộng mới) | Chênh lệch (mm) |
|---|---|---|---:|---:|---:|
| `Ben_Tre_DBSCL` | **S0** (Hiện trạng: 2 vụ lúa) | `annual_deficit_mm` (thấm 4 mm/d) | 1406.1 | 1532.9 | +126.8 |
| `Ben_Tre_DBSCL` | **S0** (Hiện trạng: 2 vụ lúa) | `annual_deficit_low_mm` (thấm 2 mm/d) | 1044.5 | 1140.1 | +95.6 |
| `Ben_Tre_DBSCL` | **S1** (Lúa - tôm) | `annual_deficit_mm` | 598.9 | 661.3 | +62.4 |
| `Ben_Tre_DBSCL` | **S1** (Lúa - tôm) | `annual_deficit_low_mm` | 423.7 | 477.6 | +53.9 |
| `Ben_Tre_DBSCL` | **S2** (Lúa HT + Đậu tương ĐX) | `annual_deficit_mm` | 776.6 | 897.8 | +121.2 |
| `Ben_Tre_DBSCL` | **S2** (Lúa HT + Đậu tương ĐX) | `annual_deficit_low_mm` | 625.0 | 715.0 | +90.0 |
| `Ben_Tre_DBSCL` | **S3** (Lúa HT + Ngô ĐX) | `annual_deficit_mm` | 781.6 | 902.5 | +120.9 |
| `Ben_Tre_DBSCL` | **S3** (Lúa HT + Ngô ĐX) | `annual_deficit_low_mm` | 630.0 | 719.7 | +89.7 |
| `Dak_Lak_Tay_Nguyen` | **D0** (Cà phê đất trần) | `annual_deficit_mm` | 351.3 | 360.2 | +8.9 |
| `Dak_Lak_Tay_Nguyen` | **D0** (Cà phê đất trần) | `annual_deficit_low_mm` | 351.3 | 360.2 | +8.9 |
| `Dak_Lak_Tay_Nguyen` | **D1** (Cà phê có cây phủ) | `annual_deficit_mm` | 418.5 | 430.2 | +11.7 |
| `Dak_Lak_Tay_Nguyen` | **D1** (Cà phê có cây phủ) | `annual_deficit_low_mm` | 418.5 | 430.2 | +11.7 |

---

### 16.5. Output `git diff --stat` của các commit Fix 9 (`fc97ef5..HEAD`)

```text
 config/crops.json                       | 12 +++++-
 config/regions.json                     |  8 ++--
 config/rotations.json                   | 12 ++++--
 core/power_fetch.py                     | 20 +++++-----
 core/rotation.py                        | 28 +++++++++++++-
 core/water_balance.py                   | 65 +++++++++++++++++++++------------
 data/manifest.json                      | 18 +++++++--
 tests/fixtures/regression_baseline.json | 36 +++++++++---------
 tests/test_core.py                      | 53 ++++++++++++++++++++++++++-
 web/app.js                              |  9 +++--
 10 files changed, 194 insertions(+), 67 deletions(-)
```

---

## 17. Fix 10 (So sánh nhanh bằng thanh nước, biểu đồ khí hậu 12 tháng, màu thảm cỏ cà phê, tối ưu di động)

### 17.1. Commit Hash của từng bước

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1** | `fa77fc4` | `climate api: 12-month climatology` | `/api/climate` trong `server.py` tính và trả thêm trường `climatology` gồm 12 tháng trung bình (mưa và ETo); thêm test `test_fix10_1_climatology_12_thang` trong `tests/test_core.py`. |
| **Bước 2–5** | `af2886b` | `web: quick comparison bars, 12-month climate chart, cover-crop colour, mobile layout` | `web/index.html` bổ sung thẻ `#compareBars` và cập nhật tiêu đề biểu đồ; `web/app.js` bổ sung hàm `renderCompareBars`, `monthSpans`, cập nhật `cleanName`, hero risk badge, ẩn chữ ô cây 1 tháng trên lịch, vẽ biểu đồ 12 tháng trung bình; `web/style.css` thêm styles thanh so sánh và responsive cho màn hình <=640px; chụp 3 ảnh màn hình giao diện. |
| **Kết thúc** | *(commit hiện tại)* | `fix10 report` | Cập nhật báo cáo Fix 10 vào `MORNING_REPORT.md`. |

---

### 17.2. Output Pytest

```text
...................................................                      [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
51 passed, 1 warning in 13.20s
```

---

### 17.3. Đường dẫn 3 ảnh chụp màn hình & Đối chiếu kiểm tra Bước 5.5

- `docs/screens/fix10_bentre.png`:
  * Khối so sánh nằm trên 4 thẻ, có 4 dòng; mỗi thanh có phần đậm (thấm 2 mm/d) và phần nhạt (thấm 4 mm/d); có dòng chú giải dưới cùng: **ĐẠT**.
- `docs/screens/fix10_daklak.png`:
  * Khối so sánh có 2 dòng, không có dòng chú giải (vì không có khoảng thấm cà phê); tên viết hoa chữ đầu ("Cà phê vối đất trần"); thanh lịch "Cà phê + thảm cỏ" màu xanh lá, chữ trắng đọc rõ ràng: **ĐẠT**.
  * Biểu đồ khí hậu có trục T1–T12; hàng NDVI ô T1 không phải "–" (Bến Tre là 0,83; Đắk Lắk là 0,76): **ĐẠT**.
- `docs/screens/fix10_mobile.png`:
  * Không có chữ hay thanh nào bị cắt ở mép phải khung 375 px; 2 nút vùng nằm chung 1 hàng dưới logo; "Như hiện nay" nằm trên 1 dòng; hàng NDVI chia 2 hàng, mỗi hàng 6 ô: **ĐẠT**.

---

### 17.4. Số dòng của `web/style.css`

- Số dòng hiện tại: **221 dòng** (tuân thủ giới hạn dưới 500 dòng).

---

### 17.5. Output `git diff --stat` của các commit Fix 10 (`e0aed45..HEAD`)

```text
 docs/screens/fix10_bentre.png | Bin 0 -> 290734 bytes
 docs/screens/fix10_daklak.png | Bin 0 -> 168628 bytes
 docs/screens/fix10_mobile.png | Bin 0 -> 203185 bytes
 server.py                     |   8 +++
 tests/test_core.py            |  27 +++++++-
 web/app.js                    | 142 ++++++++++++++++++------------------------
 web/index.html                |   3 +-
 web/style.css                 |  43 +++++++++++++
 8 files changed, 141 insertions(+), 82 deletions(-)
```

---

## 18. Fix 11 (Dẫn đường 4 bước cho người mở trang lần đầu, hero insight, báo cáo theo từng phương án)

### Bảng tóm tắt toàn bộ ca làm việc (Fix 8, Fix 9, Fix 10, Fix 11)

| Fix | Commit cuối | Pytest | Các điểm phải dừng hoặc lệch (nếu có) |
|---|---|---|---|
| **Fix 8** | `fc97ef5` | 46 passed | Không có |
| **Fix 9** | `e0aed45` | 50 passed | Cập nhật fixture `regression_baseline.json` theo đúng bước 5b do đổi mô hình tính nước theo tháng và mưa hiệu quả FAO TM3; tải dữ liệu NASA POWER thật theo tọa độ điểm ruộng Ba Tri và Cư M'gar ở bước 7 |
| **Fix 10** | `d46ad8f` | 51 passed | Không có |
| **Fix 11** | *(commit hiện tại)* | 53 passed | Không có |

---

### 18.1. Commit Hash của từng bước

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 1–4** | `40d7667` | `web: 4-step guide, hero insight, per-strategy report` | `core/advisor.py` và `server.py` hỗ trợ `strategy_id` đưa phương án đang xem lên đầu kèm rủi ro; thêm test `test_fix11_1_bao_cao_theo_phuong_an_dang_xem` và `test_fix11_2_trang_co_4_buoc`; `web/index.html` thêm header 4 bước, nhãn bước 1–4, đổi tên kịch bản "Khô nóng" / "Rất khô nóng"; `web/app.js` thêm `heroInsight`, nút xem báo cáo trên thẻ, cập nhật context báo cáo; `web/style.css` thêm styles cho khối hướng dẫn và các bước; chụp 3 ảnh màn hình giao diện. |
| **Kết thúc** | *(commit hiện tại)* | `fix11 report` | Cập nhật báo cáo Fix 11 và bảng tổng kết 4 fix vào `MORNING_REPORT.md`. |

---

### 18.2. Output Pytest

```text
.....................................................                    [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
53 passed, 1 warning in 14.24s
```

---

### 18.3. Đường dẫn 3 ảnh màn hình & Đối chiếu kiểm tra Bước 5.4

- `docs/screens/fix11_bentre.png`:
  * Đầu trang có câu in đậm và 4 nút tròn đánh số 1–4: **ĐẠT**.
  * Mỗi khu vực có nhãn xanh "BƯỚC 1", "BƯỚC 2", "BƯỚC 3", "BƯỚC 4": **ĐẠT**.
  * Bến Tre: ô hiện trạng có dòng "Phương án ít nước ngọt nhất theo mô hình: Lúa Hè Thu + đậu tương thay vụ Đông Xuân, ít hơn hiện tại 6.351 m³/ha. Mô hình chưa tính chi phí, công lao động và đầu ra.": **ĐẠT**.
  * Mỗi thẻ phương án có nút "Xem báo cáo cho phương án này →" ở chân thẻ: **ĐẠT**.
- `docs/screens/fix11_daklak.png`:
  * Đắk Lắk: ô hiện trạng ghi "Theo mô hình, không phương án nào dùng ít nước ngọt hơn cách làm hiện tại. Xem từng thẻ để so các lợi ích khác, như che phủ đất.": **ĐẠT**.
  * Mỗi thẻ có nút "Xem báo cáo cho phương án này →" ở chân thẻ: **ĐẠT**.
- `docs/screens/fix11_mobile.png`:
  * Trên điện thoại (khung 375 px), 4 nút xếp 2 hàng, mỗi hàng 2 nút, chữ trong nút nằm trên 1 dòng: **ĐẠT**.
  * Không có chữ hay thanh nào tràn hoặc bị cắt mép phải: **ĐẠT**.

---

### 18.4. Mục 3 của báo cáo ở Bước 5.5 (`strategy_id: "S1"`)

```markdown
#### 3. Việc nên làm trước vụ tới
Phương án đang xem: **Lúa – tôm (lúa mùa mưa, tôm sú mùa khô)**.
Rủi ro cần cân nhắc: Trong vụ tôm, ESP đất 20,7–25,4: 'đất có thể đạt đến ngưỡng sodic hóa' (Nguyễn Mỹ Hoa và cs., 2016).; 'Chỉ xuống giống lúa khi… độ mặn trong đất < 2‰' (Khuyến nông QG, tr.10): mưa đến muộn thì vụ lúa dễ hỏng.; 'Tạm dừng mở rộng diện tích tại các khu vực chưa hoàn thiện hạ tầng thủy lợi nội đồng' (Khuyến nông QG, tr.10).
Mùa mặn theo văn bản: tháng 2, 3, 4.
- **Lúa – tôm (lúa mùa mưa, tôm sú mùa khô)**: nước ngọt phải tưới thêm 6.613 m³/ha (−8.716 m³/ha so với hiện trạng). Lịch: Lúa mùa mưa 09-01 đến 12-14; Tôm sú (nước lợ) 03-01 đến 07-31. Chưa tính giai đoạn nuôi tôm. Cần kiểm chứng trước khi làm: Chưa có nguồn lịch lúa–tôm riêng cho Ba Tri; đang dùng lịch ở Bình Đại.; App chưa mô hình hóa nước và rủi ro của vụ tôm.; Chi phí đầu tư, dịch bệnh tôm, đầu ra: cần nông dân và cán bộ khuyến nông đánh giá.
- **Lúa Hè Thu + đậu tương thay vụ Đông Xuân**: nước ngọt phải tưới thêm 8.978 m³/ha (−6.351 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Đậu tương 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo đậu tương trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày.; Số đo cho đậu tương trên đất lúa nhiễm mặn ven biển: chưa có. Số đo đang dùng là của đậu xanh ở Tiền Giang (vùng ngọt).; Đầu ra và giá đậu tương tại địa phương.
- **Lúa Hè Thu + ngô thay vụ Đông Xuân**: nước ngọt phải tưới thêm 9.025 m³/ha (−6.304 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Ngô 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo ngô trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày.; Đầu ra và giá ngô tại địa phương.
- Đo độ mặn nước kênh bằng bút đo cầm tay trước mỗi lần lấy nước tưới.
```

---

### 18.5. Output `git diff --stat` của các commit Fix 11 (`d46ad8f..HEAD`)

```text
 core/advisor.py               |  16 +++++++++--
 docs/screens/fix11_bentre.png | Bin 0 -> 299992 bytes
 docs/screens/fix11_daklak.png | Bin 0 -> 166360 bytes
 docs/screens/fix11_mobile.png | Bin 0 -> 216233 bytes
 server.py                     |   3 +-
 tests/test_core.py            |  33 ++++++++++++++++++++++
 web/app.js                    |  64 ++++++++++++++++++++++++++++++++++++++++--
 web/index.html                |  49 +++++++++++++++++++++++---------
 web/style.css                 |  25 +++++++++++++++++
 9 files changed, 169 insertions(+), 21 deletions(-)
```

---

## 19. Fix 12 (Báo cáo dùng cùng số với thẻ phương án, sửa dấu câu, lịch 12 tháng không đè chữ, chân thẻ gọn)

### 19.1. Hash của 2 commit ở Bước 2 và Bước 4

| Bước | Commit Hash | Commit Message | Nội dung chính |
|---|---|---|---|
| **Bước 2** | `3065148` | `report: whole-year rotation table, sentence joins` | Bổ sung hàm `_sentences` và `_rotation_table` trong `core/advisor.py`; cập nhật mục 2 báo cáo đồng nhất số liệu cả năm với thẻ ở Bước 2, loại bỏ tỷ lệ stress và so sánh theo cây; sửa dấu câu nối rủi ro và khoảng trống thông tin; thêm test `test_fix12_1_bao_cao_cung_so_voi_the` trong `tests/test_core.py`. |
| **Bước 4** | `dd4bd12` | `web: calendar labels fit, card footer stacked` | `web/app.js` chỉ in chữ cho ô lịch có độ rộng từ 3 tháng trở lên (`span >= 3`), ô 2 tháng giữ màu và tooltip `title`; `web/style.css` căn chỉnh grid 12 tháng không để chữ đẩy rộng cột (`minmax(0, 1fr)` và `min-width: 0`), xếp dọc nút xem báo cáo và `details` chân thẻ. |
| **Kết thúc** | *(commit hiện tại)* | `fix12 report` | Ghi báo cáo Fix 12 vào `MORNING_REPORT.md` kèm 2 ảnh chụp giao diện. |

---

### 19.2. Output `python -m pytest -q` cuối cùng

```text
......................................................                   [100%]
============================== warnings summary ===============================
C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14
  C:\Users\LucVuu\AppData\Local\Programs\Python\Python313\Lib\site-packages\anyio\pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
54 passed, 1 warning in 17.76s
```

---

### 19.3. Nguyên văn Mục 2, Mục 3 ở Bước 5.1 và dòng D1 của Đắk Lắk

#### Bến Tre (`Ben_Tre_DBSCL`, kịch bản `0.0 / 0.0`, `strategy_id: "S3"`):

**Mục 2:**
```markdown
#### 2. Bảng so sánh lượng nước ngọt cả năm theo phương án

| Phương án | Nước ngọt phải tưới (m³/ha/năm) | Nếu đất thấm ít (m³/ha/năm) | So với cách đang làm | Tháng đất trống |
| :--- | ---: | ---: | :--- | ---: |
| Hiện trạng: 2 vụ lúa (Hè Thu + Đông Xuân sớm) | 15.329 | 11.401 | Mốc so sánh | 6 |
| Lúa – tôm (lúa mùa mưa, tôm sú mùa khô) | 6.613 | 4.776 | −8.716 m³/ha, chưa tính vụ tôm | 4 |
| Lúa Hè Thu + đậu tương thay vụ Đông Xuân | 8.978 | 7.150 | −6.351 m³/ha (−41%) | 6 |
| Lúa Hè Thu + ngô thay vụ Đông Xuân | 9.025 | 7.197 | −6.304 m³/ha (−41%) | 6 |

Cột chính tính với nước thấm 4 mm/ngày, cột "Nếu đất thấm ít" tính với 2 mm/ngày; chỉ ruộng lúa có khác biệt. Số giống thẻ phương án ở Bước 2.
```

**Mục 3:**
```markdown
#### 3. Việc nên làm trước vụ tới
Phương án đang xem: **Lúa Hè Thu + ngô thay vụ Đông Xuân**.
Rủi ro cần cân nhắc: Ngô rất nhạy mặn: rủi ro cao nếu nước tưới nhiễm mặn cuối vụ. Không cố định đạm.
Mùa mặn theo văn bản: tháng 2, 3, 4.
- **Lúa Hè Thu + ngô thay vụ Đông Xuân**: nước ngọt phải tưới thêm 9.025 m³/ha (−6.304 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Ngô 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo ngô trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày. Đầu ra và giá ngô tại địa phương.
- **Lúa – tôm (lúa mùa mưa, tôm sú mùa khô)**: nước ngọt phải tưới thêm 6.613 m³/ha (−8.716 m³/ha so với hiện trạng). Lịch: Lúa mùa mưa 09-01 đến 12-14; Tôm sú (nước lợ) 03-01 đến 07-31. Chưa tính giai đoạn nuôi tôm. Cần kiểm chứng trước khi làm: Chưa có nguồn lịch lúa–tôm riêng cho Ba Tri; đang dùng lịch ở Bình Đại. App chưa mô hình hóa nước và rủi ro của vụ tôm. Chi phí đầu tư, dịch bệnh tôm, đầu ra: cần nông dân và cán bộ khuyến nông đánh giá.
- **Lúa Hè Thu + đậu tương thay vụ Đông Xuân**: nước ngọt phải tưới thêm 8.978 m³/ha (−6.351 m³/ha so với hiện trạng). Lịch: Lúa Hè Thu 05-25 đến 09-06; Đậu tương 11-01 đến 02-08. Cần kiểm chứng trước khi làm: Lịch gieo đậu tương trên đất lúa ven biển Bến Tre: chưa tìm thấy nguồn; app giả định 1/11, 100 ngày. Số đo cho đậu tương trên đất lúa nhiễm mặn ven biển: chưa có. Số đo đang dùng là của đậu xanh ở Tiền Giang (vùng ngọt). Đầu ra và giá đậu tương tại địa phương.
- Đo độ mặn nước kênh bằng bút đo cầm tay trước mỗi lần lấy nước tưới.
```

#### Đắk Lắk (`Dak_Lak_Tay_Nguyen`, kịch bản `delta_temp_c: 2`, `delta_rain_pct: -20`):

**Dòng phương án D1 (cà phê có cây phủ):**
```text
| Cà phê vối có cây che phủ đất / thảm cỏ | 4.708 | 4.708 | +735 m³/ha (+18%) | 0 |
```

---

### 19.4. Đường dẫn 2 ảnh và kết quả đối chiếu 3 ý ở Bước 5.2

- `docs/screens/fix12_bentre.png` (khung 1280 px, Bến Tre)
- `docs/screens/fix12_mobile.png` (khung 375 px, giao diện di động)

**Đối chiếu 3 tiêu chí:**
1. Trên lịch 12 tháng của cả 4 thẻ, không còn chữ đè nhau hay bị cắt kiểu "Đất trốngậu tươn". Ô 2 tháng để trống chữ: **ĐẠT**.
2. Chân mỗi thẻ: dòng trên là "Xem báo cáo cho phương án này →" nằm trên 1 dòng (ở khung 1280 px), dòng dưới là "Nguồn & Tính toán": **ĐẠT**.
3. Bấm mở "Nguồn & Tính toán" thì phần nội dung chiếm hết chiều ngang thẻ: **ĐẠT**.

---

### 19.5. Output `git diff --stat 4787d3e..HEAD`

```text
 core/advisor.py    | 72 ++++++++++++++++++++++++++++++++++++++++--------------
 tests/test_core.py | 25 +++++++++++++++++++
 web/app.js         |  4 +--
 web/style.css      |  7 ++++++
 4 files changed, 87 insertions(+), 21 deletions(-)
```
