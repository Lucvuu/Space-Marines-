import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"


def generate_sources_markdown() -> str:
    rotations_path = CONFIG_DIR / "rotations.json"
    crops_path = CONFIG_DIR / "crops.json"

    with open(rotations_path, "r", encoding="utf-8") as f:
        rotations = json.load(f)

    with open(crops_path, "r", encoding="utf-8") as f:
        crops = json.load(f)

    lines = []
    # Bảng 1: | Region | Strategy | Evidence | Source | Verified |
    lines.append("| Region | Strategy | Evidence | Source | Verified |")
    lines.append("|---|---|---|---|---|")

    for region_id, reg_data in rotations.items():
        if region_id.startswith("_") or not isinstance(reg_data, dict):
            continue
        for strat in reg_data.get("strategies", []):
            strat_col = f"{strat['id']}: {strat['name_vi']}"
            for ev in strat.get("evidence", []):
                text_str = str(ev.get("text", "")).replace("|", "\\|")
                src_str = str(ev.get("source", "")).replace("|", "\\|")
                ver_str = str(ev.get("verified", ""))
                lines.append(f"| `{region_id}` | {strat_col} | {text_str} | {src_str} | `{ver_str}` |")

    lines.append("")
    # Bảng 2: | Crop | Kc source | Salinity source | Heat threshold (°C) | Heat source | Water extra source | verified_params |
    lines.append("| Crop | Kc source | Salinity source | Heat threshold (°C) | Heat source | Water extra source | verified_params |")
    lines.append("|---|---|---|---|---|---|---|")

    for crop_id, c_data in crops.items():
        if crop_id.startswith("_") or not isinstance(c_data, dict):
            continue
        src = c_data.get("source", {})
        kc_src = str(src.get("kc", "")).replace("|", "\\|")
        sal_src = str(src.get("salinity", "")).replace("|", "\\|")
        heat_thr = c_data.get("heat_threshold_c")
        heat_thr_str = "null" if heat_thr is None else str(heat_thr)
        heat_src = str(src.get("heat", "")).replace("|", "\\|")
        w_extra_src = str(src.get("water_extra", "")).replace("|", "\\|")
        v_params = json.dumps(c_data.get("verified_params", []), ensure_ascii=False)
        lines.append(
            f"| `{crop_id}` | {kc_src} | {sal_src} | `{heat_thr_str}` | {heat_src} | {w_extra_src} | `{v_params}` |"
        )

    return "\n".join(lines)


if __name__ == "__main__":
    print(generate_sources_markdown())

