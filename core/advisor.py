# -*- coding: utf-8 -*-
"""
AERO-AGRI Advisor & Recommendation Engine
Builds agricultural adaptation advice ONLY from transparent, computed figures.
Rules:
- Never invent numbers or unfounded conclusions
- Generate a 3-section Markdown report automatically
- call_llm() is a stub that returns None (TODO)
- When call_llm returns None -> fall back to the deterministic template
"""
import json

def call_llm(prompt):
    """
    LLM integration (Claude / Gemini / GPT).
    TODO: wire in the provider's API key and SDK for a production deployment.
    For now it returns None so the system uses the safe template fallback.
    """
    return None

def _fmt_int(v):
    """Format a number as an integer with English thousands separators (e.g. 15,329)."""
    return f"{v:,.0f}"


def _sentences(items):
    """Join sentences from config: each one ends with a full stop, separated by a single space."""
    out = []
    for t in items or []:
        t = t.strip()
        if t:
            out.append(t if t.endswith((".", "!", "?")) else t + ".")
    return " ".join(out)


def _rotation_table(rotations):
    """Report section 2: the same whole-year figures as the strategy cards in Step 2."""
    if not rotations or not rotations.get("available"):
        return "- No rotation strategy data for this region yet."
    strategies = rotations.get("strategies", [])
    base = next((s for s in strategies if s.get("is_existing")), None)
    b = base.get("annual_deficit_mm") if base else None
    rows = [
        "| Strategy | Supplemental fresh water (m³/ha/year) | If soil percolation is low (m³/ha/year) | Compared with current practice | Bare-soil months |",
        "| :--- | ---: | ---: | :--- | ---: |",
    ]
    for s in strategies:
        d = s.get("annual_deficit_mm")
        lo = s.get("annual_deficit_low_mm")
        name = s.get("name_vi", s.get("id"))
        if s.get("is_existing"):
            cmp = "Baseline"
        elif d is None or b is None:
            cmp = "Cannot compare"
        else:
            diff = (d - b) * 10
            cmp = f"{'+' if diff >= 0 else '−'}{_fmt_int(abs(diff))} m³/ha"
            if s.get("partial"):
                cmp += ", shrimp phase not modeled"
            elif b > 0:
                pct = round((d - b) / b * 100)
                cmp += f" ({'+' if pct >= 0 else '−'}{abs(pct)}%)"
        water = "Not computed" if d is None else _fmt_int(d * 10)
        low = "–" if lo is None else _fmt_int(lo * 10)
        rows.append(f"| {name} | {water} | {low} | {cmp} | {len(s.get('bare_months') or [])} |")
    rows.append("")
    rows.append("The main column uses percolation of 4 mm/day; the \"If soil percolation is low\" column uses 2 mm/day. Only rice fields differ. The numbers match the strategy cards in Step 2.")
    return "\n".join(rows)


def _rotation_actions(rotations, strategy_id=None):
    """Report section 3: list each alternative strategy, using only figures and wording already in rotations."""
    if not rotations or not rotations.get("available"):
        return "- No rotation strategy data for this region yet."
    strategies = rotations.get("strategies", [])
    base = next((s for s in strategies if s.get("is_existing")), None)
    base_def = base.get("annual_deficit_mm") if base else None
    lines = []
    picked = next((s for s in strategies if s.get("id") == strategy_id), None) if strategy_id else None
    if picked is not None:
        lines.append(f"Selected strategy: **{picked.get('name_vi', picked.get('id'))}**.")
        if picked.get("is_existing"):
            lines.append("This is current practice. The alternative strategies:")
        else:
            risks = _sentences(picked.get("risks"))
            if risks:
                lines.append(f"Risks to weigh: {risks}")
            strategies = [picked] + [s for s in strategies if s is not picked]
    sal = rotations.get("salinity_months") or []
    if sal:
        lines.append(f"Salinity season according to published documents: months {', '.join(str(m) for m in sal)}.")
    for s in strategies:
        if s.get("is_existing"):
            continue
        d = s.get("annual_deficit_mm")
        if d is None:
            water = "water not computed"
        elif base_def is None:
            water = f"supplemental fresh water {_fmt_int(d * 10)} m³/ha"
        else:
            diff = (d - base_def) * 10
            sign = "+" if diff >= 0 else "−"
            water = f"supplemental fresh water {_fmt_int(d * 10)} m³/ha ({sign}{_fmt_int(abs(diff))} m³/ha vs. current practice)"
        windows = "; ".join(
            f"{p['label']} {p['window']['start']} to {p['window']['end']}"
            for p in s.get("phases", [])
            if p.get("window") and p["window"].get("start")
        )
        partial = " Shrimp phase not modeled." if s.get("partial") else ""
        gaps = _sentences(s.get("info_gaps"))
        lines.append(f"- **{s.get('name_vi', s.get('id'))}**: {water}. Calendar: {windows}.{partial} To verify before adopting: {gaps}")
    if sal:
        lines.append("- Measure canal water salinity with a handheld meter before each irrigation intake.")
    return "\n".join(lines)


def build_advice(region_id, eval_results, question="", rotations=None, strategy_id=None):
    """
    Build the 3-section Markdown advice entirely from the figures in eval_results and rotations.
    """
    if not eval_results or not eval_results.get("available"):
        err_msg = eval_results.get("error", "not enough data to evaluate")
        return {
            "markdown": f"### No recommendation yet\n\nReason: **{err_msg}**.\n\nWhat to do: add the NASA POWER data file for this region at `data/raw/power/{region_id}.csv`.",
            "used_llm": False
        }

    reg_name = eval_results.get("region_name", region_id)
    crops = eval_results.get("crops", [])
    sim = eval_results.get("simulation", {})
    is_synthetic = eval_results.get("is_synthetic", False)

    # 1. Prepare the LLM prompt
    prompt = f"""You are the AERO-AGRI agricultural advisor. Answer the question: "{question}" for the region {reg_name}.
CORE RULE: Use only the figures in the JSON below; do not invent any information beyond the data provided.
EVALUATION JSON DATA:
{json.dumps(eval_results, ensure_ascii=False, indent=2)}
"""

    llm_resp = call_llm(prompt)
    if llm_resp:
        return {"markdown": llm_resp, "used_llm": True}

    # 2. Build the text from the deterministic numeric template
    # Section 1: data status
    synth_banner = "\n> **WARNING:** These results are computed from **SYNTHETIC DEMO DATA**. Load real observed data before using them in the field.\n" if is_synthetic else ""

    sim_note = ""
    d_temp = sim.get("delta_temp_c", 0.0)
    d_rain = sim.get("delta_rain_pct", 0.0)
    if d_temp != 0.0 or d_rain != 0.0:
        sim_note = f"\n*Simulated scenario:* temperature change `{d_temp:+.1f} °C`, rainfall change `{d_rain:+.0f}%`.\n"

    # Section 2: whole-year comparison table by rotation strategy
    table_md = _rotation_table(rotations)
    n_strat = len(rotations.get("strategies", [])) if rotations and rotations.get("available") else 0
    count_line = f"- Strategies compared: **{n_strat}** (including current practice)." if n_strat else f"- Crops evaluated: **{len(crops)}**."

    # Section 3: what to do before the next season
    actions_md = _rotation_actions(rotations, strategy_id)

    # Data source notes
    src_lines = []
    for d in eval_results.get("data_used", []):
        src_lines.append(f"- File `{d.get('file', 'N/A')}`: {d.get('source', 'source not declared')} ({'synthetic demo data' if d.get('is_synthetic') else 'real observed data'})")
    sources_block = "\n".join(src_lines)

    markdown = f"""### AERO-AGRI crop transition advisory report
**Region analysed:** {reg_name}
**User question:** *"{question if question else 'Dry-season adaptation assessment'}"*
{synth_banner}{sim_note}
---

#### 1. Dry-season data status
{count_line}
- Data sources loaded:
{sources_block}

---

#### 2. Whole-year fresh water comparison by strategy

{table_md}

---

#### 3. What to do before the next season
{actions_md}

---
*Note: This report is assembled automatically from the FAO-56 Penman-Monteith model and NASA POWER data on a grid of roughly 50 km cells. It does not replace field experience or guidance from local agricultural extension officers.*
"""

    return {
        "markdown": markdown.strip(),
        "used_llm": False
    }
