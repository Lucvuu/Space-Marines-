---
version: alpha
name: AERO-AGRI Swiss Editorial Agro-Climate
description: Minimalist, data-dense, anti-slop design system for NASA Space Apps agro-climate decision platform.
colors:
  bg: "#f7f7f5"
  surface: "#ffffff"
  surface-subtle: "#f9f9f8"
  border: "#e4e4df"
  border-focus: "#15803d"
  text: "#191c1a"
  muted: "#5e6560"
  muted-light: "#878f89"

  primary: "#15803d"
  primary-hover: "#166534"
  primary-light: "#f0fdf4"

  good: "#15803d"
  good-bg: "#f0fdf4"
  good-border: "#bbf7d0"

  warn: "#b45309"
  warn-bg: "#fffbeb"
  warn-border: "#fef3c7"

  bad: "#b91c1c"
  bad-bg: "#fef2f2"

  sal: "#be123c"
  sal-bg: "#fff1f2"
  heat: "#d97706"

  crop-rice: "#15803d"
  crop-shrimp: "#0284c7"
  crop-soybean: "#b45309"
  crop-maize: "#c2410c"
  crop-coffee: "#78350f"
  crop-cover: "#16a34a"
  crop-bare: "#e5e7eb"

typography:
  fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
  monoFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  title-page:
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.25
  title-section:
    fontSize: 18px
    fontWeight: 800
    letterSpacing: -0.3px
  title-card:
    fontSize: 15.5px
    fontWeight: 700
  metric-large:
    fontSize: 20px
    fontWeight: 800
    fontVariantNumeric: tabular-nums
  body-md:
    fontSize: 14.5px
    lineHeight: 1.55
  body-sm:
    fontSize: 13px
    lineHeight: 1.45
  caption:
    fontSize: 11.5px
    lineHeight: 1.4

rounded:
  xs: 3px
  sm: 4px
  md: 6px
  lg: 10px
  pill: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 20px
  xl: 32px

components:
  topbar:
    height: 56px
    background: "rgba(255, 255, 255, 0.92)"
    backdropFilter: "blur(10px)"
    borderBottom: "1px solid {colors.border}"
  rot-card:
    background: "{colors.surface}"
    border: "1px solid {colors.border}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.md}"
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
  ai-copilot:
    background: "{colors.surface}"
    border: "1px solid {colors.border}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.lg}"
---

# AERO-AGRI DESIGN SYSTEM (`DESIGN.md`)

> Định dạng chuẩn hóa hệ thống giao diện trực quan theo đặc tả **`google-labs-code/design.md`**.  
> Mọi AI Coding Agent, Developer và Designer làm việc trên repository này **bắt buộc phải đọc và tuân thủ các nguyên tắc dưới đây** trước khi thực hiện bất kỳ thay đổi nào liên quan tới thư mục `web/`.

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

AERO-AGRI là công cụ khoa học hỗ trợ nông dân và cán bộ khuyến nông Việt Nam đưa ra quyết định chuyển đổi cơ cấu mùa vụ ("Field Shift") dựa trên dữ liệu vệ tinh NASA (POWER & MODIS 2015–2025) và mô hình vật lý FAO-56.

Phong cách chủ đạo của dự án là **Swiss Editorial & Modern Data Product**:
- **Khắc khổ, tinh tế & tôn trọng dữ liệu**: Giao diện mang tinh thần của một bản tin khí hậu chuyên sâu (như *NYT Climate*, *Apple Weather*, *Linear*). Giao diện không dùng để giải trí mà dùng để hỗ trợ người dùng ra quyết định sinh kế hàng vụ.
- **Field-First & Space-Backed**: Mọi con số đều được kiểm chứng từ quỹ đạo vệ tinh và thực nghiệm đồng ruộng. Không có "hộp đen", không dùng AI sinh số ngẫu nhiên.
- **Anti-Slop Discipline**: Loại bỏ triệt để các hội chứng thiết kế cẩu thả của AI (nền gradient loè loẹt, viền dày `4px`, đổ bóng nặng, rừng huy hiệu pill soup, và hộp lồng hộp lùng bùng).

---

## 2. Quy Tắc Chống "AI Slop" (Negative Constraints & Don'ts)

Khi chỉnh sửa `web/style.css`, `web/index.html` hoặc `web/app.js`:

- ❌ **CẤM Gradient màu mè**: Không sử dụng `linear-gradient` trên nền thẻ, nút bấm hay callout. Ngoại lệ duy nhất là hoa văn sọc chéo `45deg` biểu thị pha nuôi tôm nước lợ trên thanh lịch.
- ❌ **CẤM Viền trái dày (`border-left: 4px solid`)**: Không dùng viền dày để gây chú ý. Mọi phân cách đều dùng viền mảnh `1px solid var(--border)` (hoặc viền `1.5px solid var(--primary)` cho thẻ được khuyến nghị tốt nhất).
- ❌ **CẤM Đổ bóng đậm**: Không dùng `box-shadow` dày hoặc mờ đục. Chỉ dùng bóng siêu nhẹ `0 1px 2px rgba(0,0,0,0.02)`.
- ❌ **CẤM "Pill Soup"**: Mỗi thẻ phương án chỉ có **tối đa 1 badge trạng thái** ở góc trên (`Hiện tại`, `Tiết kiệm 52% nước`, `Thuận thiên`). Không nhồi 4–5 pill xanh đỏ.
- ❌ **CẤM Chấm nhấp nháy (`@keyframes pulse`) và icon rác**: Không thêm hiệu ứng chớp tắt gây mất tập trung.
- ❌ **CẤM Hộp lồng hộp (Box-in-Box)**: Bên trong một thẻ không tạo 3–4 hộp có viền và nền riêng biệt. Dùng đường kẻ ngang mảnh `1px solid #f1f5f9` để phân tách tự nhiên.
- ❌ **CẤM Vượt quá 500 dòng CSS**: Giữ `web/style.css` dưới **500 dòng CSS** sạch, tập trung, dễ bảo trì.
- ❌ **CẤM Thư viện CDN ngoài**: Hệ thống phải chạy Offline-First 100%. Không nhúng Google Fonts, Tailwind CDN, FontAwesome CDN.

---

## 3. Hệ Thống Token Màu Sắc & Ngữ Nghĩa (Semantic Palette)

```yaml
colors:
  bg: '#f7f7f5' # Nền trang màu giấy đá vôi ấm, dịu mắt hơn trắng tinh khiết
  surface: '#ffffff' # Bề mặt thẻ trắng sáng
  surface-subtle: '#f9f9f8' # Nền phụ siêu nhẹ cho code, input
  border: '#e4e4df' # Đường kẻ mảnh hairline
  text: '#191c1a' # Mực in sẫm cho chữ đọc
  muted: '#5e6560' # Xám ghi cho nhãn phụ và chú thích
  primary: '#15803d' # Xanh nông nghiệp trầm (Emerald Deep)
```

### Bảng màu Mùa vụ & Cây trồng:
- **Lúa nước (`rice`)**: `#15803d` — Xanh lá lúa truyền thống.
- **Tôm sú nước lợ (`shrimp`)**: `#0284c7` kèm hoa văn sọc chéo `repeating-linear-gradient(45deg, #0284c7, #0284c7 4px, #0369a1 4px, #0369a1 8px)`.
- **Đậu tương (`soybean`)**: `#b45309` — Vàng hổ phách / đất họ đậu.
- **Ngô (`maize`)**: `#c2410c` — Cam đất sinh khối.
- **Cà phê vối (`coffee`)**: `#78350f` — Nâu đất bazan Tây Nguyên.
- **Thảm cỏ che phủ đất (`cover_crop`)**: `#16a34a` — Xanh ngọc thực nghiệm WASI.
- **Đất trống (`bare`)**: `#e5e7eb` — Xám sáng biểu thị đất nghỉ.
- **Xâm nhập mặn (`sal`)**: Chữ `#be123c`, vạch đỏ mảnh trên lịch.
- **Cảnh báo nắng nóng quá ngưỡng (`heat`)**: Chấm tròn cam `#d97706`.

---

## 4. Kỷ Luật Typography & Số Liệu Thủy Văn

```yaml
typography:
  fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
  metrics:
    fontVariantNumeric: tabular-nums
```

- **Quy tắc Tabular Nums bắt buộc**: Mọi vùng hiển thị số liệu đo đạc (`m³/ha`, `mm`, `ETo`, `ETc`, `NDVI`, nhiệt độ, lượng mưa, bảng đánh giá cây trồng) **BẮT BUỘC** phải có `font-variant-numeric: tabular-nums`. Điều này ngăn hiện tượng co giãn giao diện khi người dùng kéo thanh trượt kịch bản thời tiết.
- **Tỷ lệ kích thước chữ khiêm tốn**: Tiêu đề trang `20px`, tiêu đề thẻ `15.5px`, số liệu lớn `19px–22px`. Không dùng font quá khổ gây tốn diện tích hiển thị.

---

## 5. Đặc Tả Thành Phần Giao Diện (Component Specifications)

### A. Compact Sticky Header (`.topbar`)
- Chiều cao cố định `56px`, nền trắng mờ `backdrop-filter: blur(10px)`.
- Logo `AERO-AGRI` đi kèm nhãn nhỏ `NASA Space Apps`.
- Nút chuyển vùng dạng **Segmented Control** (`Bến Tre • ĐBSCL` | `Đắk Lắk • Tây Nguyên`).
- Nút liên kết nhanh tới Agro-AI Copilot ở góc phải.

### B. Compact Simulator Bento (`.scenario`)
- Tích hợp gọn trong dải Intro cùng `#heroCard`.
- 3 nút kịch bản 1-chạm (`Mặc định`, `El Niño`, `Khắc nghiệt`).
- 2 thanh trượt mượt mà cho Nhiệt độ và Lượng mưa, hiển thị nhãn `+X °C` và `+Y%` rõ ràng.

### C. Thẻ Phương Án Luân Canh Chuẩn Spec-Sheet (`.rot-card`)
- Hiển thị theo lưới ngang (`strategy-grid-horizontal`): 4 cột đối với Bến Tre, 2 cột đối xứng đối với Đắk Lắk.
- Mỗi thẻ gồm 5 tầng:
  1. **Đầu thẻ**: Tên phương án + 1 badge trạng thái duy nhất.
  2. **Mô tả ngắn**: 1–2 dòng nêu lý do (`why`).
  3. **2 Chỉ số Lớn nằm ngang**: Nước tưới ngọt phải bù (`m³/ha` kèm delta kịch bản) và Số tháng đất trống (`tháng/năm`).
  4. **Gantt Bar 12 Tháng**: Liền mạch cao `24px–26px`, vạch đỏ tháng mặn phía trên, chấm cam nóng phía trong.
  5. **Lưu ý Khoa học & Hành động**: Khối chú thích thực nghiệm WASI (`D1`) hoặc thuận thiên mặn (`S1`); 2–3 gạch đầu dòng ngắn gọn; chân thẻ có `<details>` xem nguồn và nút **`Hỏi AI về phương án này →`**.

### D. Trợ Lý Khuyến Nông Thông Minh (Agro-AI Copilot `#aiSection`)
- Giao diện dạng Copilot sạch sẽ như *Perplexity / Claude*.
- Thanh ngữ cảnh hiển thị rõ trạm dữ liệu và kịch bản khí hậu mà AI đang phân tích.
- 3 chip câu hỏi gợi ý nhanh cho nông dân.
- Khung trả lời `#chatOutput` tự động format rõ ràng, làm đậm các con số và giải pháp.
- Nút Floating AI Pill (`#floatingAiBtn`) ở góc dưới bên phải màn hình giúp người dùng mở khung chat từ mọi vị trí.

---

## 6. Danh Mục 28 DOM IDs & Chuỗi Bất Biến (Test Invariants)

Bất kỳ AI Agent nào can thiệp vào `web/index.html` và `web/app.js` **TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA HOẶC THAY ĐỔI** danh sách sau để đảm bảo toàn bộ 40 bài kiểm thử `pytest` luôn PASS 100%:

### 28 DOM IDs Bắt Buộc trong `web/index.html`:
```text
1. rotationsSection         11. valTemp                21. chip-sal
2. rotationCardsGrid        12. valRain                22. climateChart
3. rotationLegend           13. btnReset               23. ndviStrip
4. rotationAssumptionsBox   14. chatInput              24. ndviNote
5. heroCard                 15. btnAsk                 25. cropTableWrapper
6. heroPlace                16. chatOutput             26. cropTableBody
7. heroTitle                17. statusBar              27. waterOnlyScoreNote
8. heroBody                 18. chip-power             28. evaluateEmpty
9. sliderTemp               19. chip-ndvi
10. sliderRain              20. chip-sm
```

### Chuỗi Văn Bản Bắt Buộc trong `web/app.js`:
- `"11-01"` (Cửa sổ vụ khô Bến Tre).
- `"04-30"` (Mùa khô Đắk Lắk).
- `"chưa tính giai đoạn nuôi tôm"` (Cờ `partial` vụ tôm nước lợ).
- `"loại đất giả định"` (Giả định thấm và làm đất lúa).
- `"chưa kiểm chứng"` (Bằng chứng chưa nghiệm thu).

---

## 7. Tài Liệu Tham Khảo (References)
- Đặc tả gốc: [`docs/design-md-spec/spec.md`](docs/design-md-spec/spec.md) (Google Labs `design.md` alpha format).
- Triết lý gốc: [`docs/design-md-spec/PHILOSOPHY.md`](docs/design-md-spec/PHILOSOPHY.md).

