# -*- coding: utf-8 -*-
"""
AERO-AGRI Advisor & Recommendation Engine
Sinh khuyến nghị nông nghiệp thích ứng dựa CHỈ trên số liệu tính toán minh bạch.
Tuân thủ:
- Không bịa số liệu hay câu kết luận vô căn cứ
- Tự động sinh Markdown 3 phần
- Hàm call_llm() để rỗng trả None (TODO)
- Khi call_llm trả None -> dùng template toán học
"""
import json

def call_llm(prompt):
    """
    Giao tiếp LLM (Claude / Gemini / GPT).
    TODO: Tích hợp API key và SDK của nhà cung cấp LLM khi triển khai production.
    Hiện tại trả về None để hệ thống dùng fallback template an toàn.
    """
    return None

def build_advice(region_id, eval_results, question=""):
    """
    Sinh khuyến nghị markdown 3 phần hoàn toàn từ số liệu trong eval_results.
    """
    if not eval_results or not eval_results.get("available"):
        err_msg = eval_results.get("error", "chưa có đủ dữ liệu để đánh giá")
        return {
            "markdown": f"### Chưa thể đưa ra khuyến nghị\n\nLý do: **{err_msg}**.\n\nHướng dẫn: Vui lòng nạp tệp dữ liệu NASA POWER cho vùng vào thư mục `data/raw/power/{region_id}.csv`.",
            "used_llm": False
        }

    reg_name = eval_results.get("region_name", region_id)
    crops = eval_results.get("crops", [])
    sim = eval_results.get("simulation", {})
    is_synthetic = eval_results.get("is_synthetic", False)

    # 1. Chuẩn bị prompt cho LLM
    prompt = f"""Bạn là cố vấn nông nghiệp AERO-AGRI. Hãy trả lời câu hỏi: "{question}" cho vùng {reg_name}.
QUY TẮC CỐT LÕI: Chỉ dùng số liệu trong JSON sau, không bịa bất kỳ thông tin nào ngoài dữ liệu đã cung cấp.
DỮ LIỆU JSON ĐÁNH GIÁ:
{json.dumps(eval_results, ensure_ascii=False, indent=2)}
"""

    llm_resp = call_llm(prompt)
    if llm_resp:
        return {"markdown": llm_resp, "used_llm": True}

    # 2. Sinh văn bản từ template số liệu chuẩn xác
    # Phần 1: Hiện trạng số liệu
    synth_banner = "\n> **CẢNH BÁO:** Dữ liệu tính toán dựa trên **DỮ LIỆU MẪU (SYNTHETIC DEMO)**. Cần nạp dữ liệu quan sát thực tế trước khi áp dụng thực địa.\n" if is_synthetic else ""

    sim_note = ""
    d_temp = sim.get("delta_temp_c", 0.0)
    d_rain = sim.get("delta_rain_pct", 0.0)
    if d_temp != 0.0 or d_rain != 0.0:
        sim_note = f"\n*Kịch bản mô phỏng:* Nhiệt độ thay đổi `{d_temp:+.1f} °C`, lượng mưa thay đổi `{d_rain:+.0f}%`.\n"

    # Tìm cây có điểm cao nhất
    valid_crops = [c for c in crops if c.get("score") is not None]
    valid_crops.sort(key=lambda x: x["score"], reverse=True)
    best_crop = valid_crops[0] if valid_crops else None

    # Lập bảng so sánh cây trồng
    rows_md = []
    for c in crops:
        c_name = c["crop_name"]
        sc = f"{c['score']}/100" if c['score'] is not None else "Chưa đủ dữ liệu để chấm"
        rk = c["risk_level"]
        comp = c["components"]
        w_val = comp.get("irrigation_share", comp.get("water_stress"))
        w_stress = f"{w_val:.2f}" if w_val is not None else "N/A"
        def_mm = f"{c['deficit_mm']} mm" if c['deficit_mm'] is not None else "N/A"
        vs_val = c.get("water_vs_baseline_pct")
        vs_base = "N/A" if vs_val is None else (f"{vs_val:+.1f}%" if vs_val != 0.0 else "Baseline")
        rows_md.append(f"| **{c_name}** | {sc} | `{rk}` | {def_mm} | {w_stress} | {vs_base} |")

    table_md = "\n".join(rows_md)

    # Phần 3: Việc nên làm 7 ngày tới
    baseline_name = crops[0]["crop_name"] if crops else "cây hiện trạng"
    actions = []
    if best_crop and best_crop["score"] is not None:
        vs_pct = best_crop.get("water_vs_baseline_pct")
        if vs_pct is not None and vs_pct > 0:
            actions.append(
                f"Cân nhắc chuẩn bị đất và giống cho **{best_crop['crop_name']}** "
                f"(nhu cầu tưới {best_crop['deficit_mm']} mm, ít hơn {baseline_name} {abs(vs_pct):.1f}%)."
            )
        elif vs_pct is not None and vs_pct < 0:
            actions.append(
                f"Theo dõi sát nguồn nước nếu chọn **{best_crop['crop_name']}** "
                f"(nhu cầu tưới {best_crop['deficit_mm']} mm, nhiều hơn {baseline_name} {abs(vs_pct):.1f}%)."
            )
        else:
            actions.append(
                f"Theo dõi sát nguồn nước nếu tiếp tục duy trì **{best_crop['crop_name']}** "
                f"(nhu cầu tưới {best_crop['deficit_mm']} mm)."
            )

    # Kiểm tra rủi ro nhiệt
    high_heat_crops = [c for c in crops if c["components"]["heat_ratio"] and c["components"]["heat_ratio"] > 0.15]
    if high_heat_crops:
        heat_details = ", ".join(
            f"{c['crop_name']} ({round(c['components']['heat_ratio'] * 100, 1)}% số ngày vượt ngưỡng nhiệt)"
            for c in high_heat_crops
        )
        actions.append(f"Lên phương án tưới dặm buổi sáng cho: {heat_details}.")

    # Kiểm tra mặn
    high_sal_crops = [c for c in crops if c["components"]["salinity_exceed"] and c["components"]["salinity_exceed"] > 0.20]
    if high_sal_crops:
        names = ", ".join(c["crop_name"] for c in high_sal_crops)
        actions.append(f"Đo độ mặn nguồn nước kênh mương bằng bút đo cầm tay trước khi lấy nước tưới cho ({names}).")

    if not actions:
        actions.append("Kiểm tra hệ thống tưới tiêu và kết nối hợp tác xã để cập nhật diễn biến nguồn nước.")

    actions_md = "\n".join(f"{i+1}. {act}" for i, act in enumerate(actions))

    # Ghi chú nguồn dữ liệu
    src_lines = []
    for d in eval_results.get("data_used", []):
        src_lines.append(f"- File `{d.get('file', 'N/A')}`: {d.get('source', 'nguồn chưa khai báo')} (Mẫu: {d.get('is_synthetic', False)})")
    sources_block = "\n".join(src_lines)

    markdown = f"""### Báo cáo tư vấn chuyển đổi mùa vụ AERO-AGRI
**Khu vực phân tích:** {reg_name}  
**Câu hỏi của người dùng:** *"{question if question else 'Đánh giá thích nghi mùa khô'}"*
{synth_banner}{sim_note}
---

#### 1. Hiện trạng số liệu mùa khô
- Số cây trồng đánh giá: **{len(crops)} cây**.
- Cây trồng có chỉ số thích nghi cao nhất: **{best_crop['crop_name'] if best_crop else 'Chưa có'}** (Điểm: `{best_crop['score'] if best_crop else 'N/A'}`).
- Nguồn dữ liệu đã nạp:
{sources_block}

---

#### 2. Bảng so sánh rủi ro & hiệu quả sử dụng nước

| Cây trồng | Điểm so sánh với hiện trạng | Cấp rủi ro | Thiếu hụt nước (ETc - Peff) | Tỷ lệ tưới (0–1) | So với Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: |
{table_md}

---

#### 3. Việc nên làm trong 7 ngày tới
{actions_md}

---
*Ghi chú minh bạch: Khuyến nghị được tính toán tự động từ mô hình Penman-Monteith và dữ liệu khí tượng bề mặt, không thay thế kinh nghiệm thực địa của bà con.*
"""

    return {
        "markdown": markdown.strip(),
        "used_llm": False
    }
