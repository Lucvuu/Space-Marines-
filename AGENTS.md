# AI AGENT INSTRUCTIONS FOR AERO-AGRI

## ⚠️ MANDATORY RULE: READ `DESIGN.md` BEFORE TOUCHING `web/`
If you are an AI assistant, coding agent, or developer asked to modify, redesign, or debug files in `web/` (`web/index.html`, `web/style.css`, `web/app.js`):

1. **You MUST read [`DESIGN.md`](./DESIGN.md)**.
2. All visual styling, typography, spacing, and interaction patterns must strictly adhere to the **Swiss Editorial & Modern Data Product** design system specified in `DESIGN.md` (based on `google-labs-code/design.md`).
3. **STRICT ANTI-SLOP RULES (Violation will break automated audits)**:
   - NO background gradients (`linear-gradient`) on cards, buttons, or callouts (only exception is diagonal striping for saline shrimp on the calendar).
   - NO heavy drop shadows or `border-left: 4px solid` accents. Use subtle `1px solid var(--border)` hairlines.
   - NO "Pill Soup" — maximum 1 status badge per strategy card.
   - NO pulsing animations (`@keyframes pulse`) or decorative emojis.
   - NO nested box-in-box cards. Use subtle dividing hairlines.
   - Keep `web/style.css` **under 500 lines**.
4. **INVARIANT TESTS CHECKLIST (40/40 pytest MUST pass)**:
   - Preserve all **28 DOM IDs** listed in `DESIGN.md` section 6 in `web/index.html`.
   - Preserve all required text strings in `web/app.js`: `"11-01"`, `"04-30"`, `"chưa tính giai đoạn nuôi tôm"`, `"loại đất giả định"`, `"chưa kiểm chứng"`.
   - 100% Offline-First: Never inject external CDNs.

