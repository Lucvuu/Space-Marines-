# AERO-AGRI: Khung Ra Quyết Định Chuyển Đổi Canh Tác Thích Ứng Khí Hậu
*NASA International Space Apps Challenge 2026 - Challenge: Field Shift (Adapting Farms with NASA Data)*

## 1. Giới thiệu
AERO-AGRI là công cụ hỗ trợ ra quyết định dành cho nông dân và hợp tác xã tại 2 vùng trọng điểm:
- **Bến Tre (ĐBSCL):** Vùng trũng ven biển chịu rủi ro hạn mặn mùa khô (tháng 1–4).
- **Đắk Lắk (Tây Nguyên):** Vùng cao nguyên bazan chịu rủi ro khô hạn và sụt giảm nguồn nước ngầm (tháng 1–4).

Hệ thống tính toán nhu cầu nước cây trồng ($ET_c$) dựa trên chuẩn FAO-56 Penman-Monteith, lượng mưa hiệu quả USDA-SCS, và đưa ra khuyến nghị chuyển đổi mùa vụ minh bạch từ số liệu.

## 2. Hướng dẫn sử dụng nhanh (5 dòng)
1. Cài đặt thư viện: `pip install -r requirements.txt`
2. Tải dữ liệu thật từ NASA POWER: `python core/power_fetch.py` (hoặc tạo dữ liệu thử nghiệm: `python scripts/make_demo_data.py`).
3. Khai báo nguồn trong `data/manifest.json` (tự động cập nhật khi chạy fetch hoặc make_demo_data).
4. Khởi chạy ứng dụng: `python run.py` (hệ thống tự mở trình duyệt tại `http://localhost:8050`).
5. Chạy kiểm thử: `python -m pytest -q` hoặc `python tests/test_core.py`.

## 3. Giả định kỹ thuật (Assumptions)
- **Cấu trúc thư mục dữ liệu:** Thư mục dữ liệu đọc qua biến môi trường `AERO_DATA_DIR`, mặc định là `data/`.
- **Thành phần nước tương đối ($water\_component$):** Tính tương đối theo công thức:
  $$\text{water\_component} = \text{clip}\left(\frac{\text{deficit\_mm}}{\text{baseline\_deficit\_mm}}, 0, 1\right)$$
  với baseline là cây đầu tiên trong danh sách `candidate_crops` của vùng.
- **Tỷ lệ tưới ($irrigation\_share$):** Tỷ lệ giữa lượng nước thiếu hụt trên tổng nhu cầu nước của cây ($\text{deficit} / ET_c$, tương đương `water_stress` cũ).
- **Dữ liệu tham gia tính điểm (data_used):** `data_used` trong kết quả đánh giá chỉ liệt kê các nguồn dữ liệu thực sự tham gia vào phép tính điểm thích nghi (NASA POWER cho bốc thoát hơi nước/nhiệt và Độ mặn quan trắc). Dữ liệu viễn thám NDVI (MODIS) và Độ ẩm đất (SMAP) hiện tại chỉ phục vụ hiển thị chu kỳ khí hậu và quan sát trực quan, chưa tham gia trực tiếp vào công thức tính điểm.
- **Kc cây lâu năm:** Với cây cà phê và cà phê xen cây phủ đất (`perennial: true`), giai đoạn mùa khô (tháng 1–4) sử dụng hệ số $K_c = kc\_mid$ cố định do cây đã trưởng thành và duy trì tán lá ổn định.
- **Mô hình Lúa - Tôm:** Do tôm không có hệ số bốc thoát hơi nước thực vật $K_c$, tham số $K_c$ đặt là `null` ("TODO"). Thành phần thiếu nước được bỏ qua và trọng số được phân bổ lại theo quy tắc chuẩn.
- **Khí quyển và bức xạ:** Độ dài bước sóng ngắn mặt trời sử dụng trực tiếp từ biến `ALLSKY_SFC_SW_DWN` của NASA POWER (MJ/m²/ngày). Tỉ số $R_s / R_{so}$ được chặn trên tối đa là $1.0$ khi tính bức xạ sóng dài ròng $R_{nl}$.
- **Đất trống phơi nhiễm (Bare-field):** Được xác định khi $NDVI < 0.22$ trong mùa khô.
