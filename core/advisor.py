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

def _vn_int(v):
    return f"{v:,.0f}".replace(",", ".")


def _rotation_actions(rotations):
    """Mục 3 của báo cáo: liệt kê từng phương án thay thế, chỉ dùng số liệu và câu chữ có sẵn trong rotations."""
    if not rotations or not rotations.get("available"):
        return "- Chưa có dữ liệu phương án luân canh cho vùng này."
    strategies = rotations.get("strategies", [])
    base = next((s for s in strategies if s.get("is_existing")), None)
    base_def = base.get("annual_deficit_mm") if base else None
    lines = []
    sal = rotations.get("salinity_months") or []
    if sal:
        lines.append(f"Mùa mặn theo văn bản: tháng {', '.join(str(m) for m in sal)}.")
    for s in strategies:
        if s.get("is_existing"):
            continue
        d = s.get("annual_deficit_mm")
        if d is None:
            water = "chưa tính được nước"
        elif base_def is None:
            water = f"nước ngọt phải tưới thêm {_vn_int(d * 10)} m³/ha"
        else:
            diff = (d - base_def) * 10
            sign = "+" if diff >= 0 else "−"
            water = f"nước ngọt phải tưới thêm {_vn_int(d * 10)} m³/ha ({sign}{_vn_int(abs(diff))} m³/ha so với hiện trạng)"
        windows = "; ".join(
            f"{p['label']} {p['window']['start']} đến {p['window']['end']}"
            for p in s.get("phases", [])
            if p.get("window") and p["window"].get("start")
        )
        partial = " Chưa tính giai đoạn nuôi tôm." if s.get("partial") else ""
        gaps = "; ".join(s.get("info_gaps", []))
        lines.append(f"- **{s.get('name_vi', s.get('id'))}**: {water}. Lịch: {windows}.{partial} Cần kiểm chứng trước khi làm: {gaps}")
    if sal:
        lines.append("- Đo độ mặn nước kênh bằng bút đo cầm tay trước mỗi lần lấy nước tưới.")
    return "\n".join(lines)


def build_advice(region_id, eval_results, question="", rotations=None):
    """
    Sinh khuyến nghị markdown 3 phần hoàn toàn từ số liệu trong eval_results và rotations.
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

    # Lập bảng so sánh cây trồng
    rows_md = []
    for c in crops:
        c_name = c["crop_name"]
        comp = c["components"]
        w_val = comp.get("irrigation_share", comp.get("water_stress"))
        w_stress = f"{w_val:.2f}" if w_val is not None else "N/A"
        def_mm = f"{c['deficit_mm']} mm" if c['deficit_mm'] is not None else "N/A"
        vs_val = c.get("water_vs_baseline_pct")
        vs_base = "N/A" if vs_val is None else (f"{vs_val:+.1f}%" if vs_val != 0.0 else "Baseline")
        rows_md.append(f"| **{c_name}** | {def_mm} | {w_stress} | {vs_base} |")

    table_md = "\n".join(rows_md)

    # Phần 3: Việc nên làm trước vụ tới
    actions_md = _rotation_actions(rotations)

    # Ghi chú nguồn dữ liệu
    src_lines = []
    for d in eval_results.get("data_used", []):
        src_lines.append(f"- File `{d.get('file', 'N/A')}`: {d.get('source', 'nguồn chưa khai báo')} ({'dữ liệu mẫu' if d.get('is_synthetic') else 'dữ liệu đo thật'})")
    sources_block = "\n".join(src_lines)

    markdown = f"""### Báo cáo tư vấn chuyển đổi mùa vụ AERO-AGRI
**Khu vực phân tích:** {reg_name}  
**Câu hỏi của người dùng:** *"{question if question else 'Đánh giá thích nghi mùa khô'}"*
{synth_banner}{sim_note}
---

#### 1. Hiện trạng số liệu mùa khô
- Số cây trồng đánh giá: **{len(crops)} cây**.
- Nguồn dữ liệu đã nạp:
{sources_block}

---

#### 2. Bảng so sánh rủi ro & hiệu quả sử dụng nước

| Cây trồng | Thiếu hụt nước (mm) | Tỷ lệ phải tưới (0–1) | So với cây đầu |
| :--- | :---: | :---: | :---: |
{table_md}

---

#### 3. Việc nên làm trước vụ tới
{actions_md}

---
*Ghi chú: Báo cáo được ghép tự động từ mô hình FAO-56 Penman-Monteith và dữ liệu NASA POWER theo ô lưới cỡ 50 km. Không thay thế kinh nghiệm thực địa và hướng dẫn của khuyến nông địa phương.*
"""

    return {
        "markdown": markdown.strip(),
        "used_llm": False
    }
