// Guided demo for judges ("happy case"). Active only with ?demo=1 in the URL; the normal app ignores this file.
// Press → / Space / PageDown (or a presenter clicker) for the next step, R to restart, H to hide the panel.
(function () {
    if (new URLSearchParams(location.search).get("demo") !== "1") return;

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const $ = sel => document.querySelector(sel);
    async function until(fn, ms = 10000) {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* not ready yet */ } await sleep(150); }
        return false;
    }
    const ready = () => document.querySelectorAll(".rot-card").length > 0 && document.querySelectorAll("#fieldRows .field-row").length > 0;
    const idle = () => !document.getElementById("rotationCardsGrid").classList.contains("loading");
    const vi = () => (typeof lang === "undefined" || lang === "vi");
    const change = el => el.dispatchEvent(new Event("change", { bubbles: true }));

    function highlight(selectors, focusSel) {
        document.querySelectorAll(".demo-hl").forEach(el => el.classList.remove("demo-hl"));
        const els = selectors.map(s => $(s)).filter(Boolean);
        els.forEach(el => el.classList.add("demo-hl"));
        const el = focusSel ? $(focusSel) : els[0];
        if (!el || getComputedStyle(el).position === "fixed" || el.closest("#drawer")) return;
        // Instant scroll: a smooth scroll can be cut off by the app's own step navigation
        setTimeout(() => {
            const tall = el.getBoundingClientRect().height > window.innerHeight * 0.75;
            const top = tall || !!focusSel;
            el.scrollIntoView({ behavior: "auto", block: top ? "start" : "center" });
            if (top) window.scrollBy(0, -90);
        }, 120);
    }
    async function region(id) {
        const tab = $(`.region-tab[data-region="${id}"]`);
        if (tab && tab.getAttribute("aria-pressed") !== "true") { tab.click(); await sleep(400); await until(() => ready() && idle(), 15000); }
    }
    async function recompute() { await sleep(400); await until(idle, 15000); await sleep(300); }

    // Each step: title (VI / EN) and the action that shows it.
    const STEPS = [
        { vi: "Bước 1 · Câu trả lời ngay màn hình đầu", en: "Step 1 · The answer on the first screen",
          run: async () => { await region("Ben_Tre_DBSCL"); goTo("#step1", true); await sleep(300); highlight(["#heroCard", ".roles"]); } },
        { vi: "Nhập đúng ruộng của mình: Lúa 15/6 + Ngô 1/12", en: "Enter your own field: rice 15 Jun + maize 1 Dec",
          run: async () => {
              const rows = document.querySelectorAll("#fieldRows .field-row");
              rows[0].querySelector(".field-date").value = "2026-06-15"; change(rows[0].querySelector(".field-date"));
              rows[1].querySelector(".field-crop").value = "maize"; change(rows[1].querySelector(".field-crop"));
              rows[1].querySelector(".field-date").value = "2026-12-01"; change(rows[1].querySelector(".field-date"));
              highlight(["#fieldCard"]);
          } },
        { vi: "Tính theo ruộng của tôi → kết quả đổi theo ruộng", en: "Use my field → the answer follows the field",
          run: async () => { $("#btnApplyField").click(); await recompute(); highlight(["#heroCard"]); } },
        { vi: "Thử năm khô nóng: +1,5 °C, mưa −20%", en: "Try a hot, dry year: +1.5 °C, −20% rain",
          run: async () => {
              $("#btnDefaultField").click(); await recompute();
              $('.preset-chip[data-temp="1.5"]').click(); await recompute();
              highlight([".scenario", "#heroCard"], "#heroCard");
          } },
        { vi: "Bà con chọn tháng kênh bị mặn: mặn sớm từ tháng 12", en: "Farmers mark the salty months: early salinity from December",
          run: async () => {
              $('.preset-chip[data-temp="0"]').click(); await recompute();
              ["12", "1"].forEach(m => { const b = $(`#saltMonths button[data-m="${m}"]`); if (b && !b.classList.contains("on")) b.click(); });
              await sleep(300); highlight(["#saltBox"], "#saltBox");
          } },
        { vi: "Bước 2 · So sánh các phương án", en: "Step 2 · Compare the options",
          run: async () => {
              $('.preset-chip[data-temp="0"]').click(); await recompute();
              goTo("#rotationsSection", true); await sleep(400);
              highlight([".rot-card:nth-child(3)"], ".rot-card:nth-child(3)");
          } },
        { vi: "Học từ 10 năm qua: chuẩn bị cho năm tới", en: "Lessons from 10 years: planning for next year",
          run: async () => { highlight(["#lessonsCard"], "#lessonsCard"); } },
        { vi: "Chi tiết phương án lúa + đậu tương", en: "Details of rice + soybean",
          run: async () => { const b = $(".rot-card:nth-child(3) .more-btn"); if (b) b.click(); await sleep(500); highlight(["#drawer .drawer-body"]); } },
        { vi: "Bước 3 · Vệ tinh kiểm tra mô hình (Bến Tre)", en: "Step 3 · Satellites check the model (Bến Tre)",
          run: async () => { closeDrawer(false); goTo("#evidenceSection", true); await sleep(400); highlight(["#sowingCheck", "#rainCheck"]); } },
        { vi: "Đắk Lắk · Độ ẩm đất SMAP, độ dốc và xói mòn", en: "Đắk Lắk · SMAP soil moisture, slope and erosion",
          run: async () => { await region("Dak_Lak_Tay_Nguyen"); goTo("#evidenceSection", true); await sleep(400); highlight(["#smapCard", "#erosionCheck"]); } },
        { vi: "Đắk Lắk · Bà con nhập cách mình đang tưới", en: "Đắk Lắk · Farmers enter how they irrigate",
          run: async () => { goTo("#step1", true); await sleep(400); highlight(["#pracBox"], "#pracBox"); } },
        { vi: "Bước 4 · Báo cáo, in, tải CSV", en: "Step 4 · Report, print, CSV",
          run: async () => {
              await region("Ben_Tre_DBSCL"); goTo("#reportSection", true); await sleep(300);
              $("#btnReport").click(); await until(() => typeof reportReady !== "undefined" && reportReady, 15000);
              highlight(["#btnReport", "#btnPrint", "#btnCsv"]);
          } },
        { vi: "Dữ liệu và cách tính cho nhà khoa học", en: "Data & method for scientists",
          run: async () => { goTo("#methodCard", true); await sleep(500); highlight(["#methodCard"]); } },
    ];

    // Panel and styles
    const css = document.createElement("style");
    css.textContent = `
      .demo-hl { outline: 4px solid #e11d48 !important; outline-offset: 6px; border-radius: 14px; animation: demoPulse 1.6s ease-in-out infinite; }
      @keyframes demoPulse { 0%,100% { outline-color: #e11d48; } 50% { outline-color: rgba(225,29,72,.35); } }
      #demoPanel { position: fixed; right: 18px; bottom: 18px; z-index: 9998; width: min(420px, calc(100vw - 36px)); background: #0b1324; color: #f4f7fb;
        border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.3); font: 14px/1.45 "Segoe UI", system-ui, sans-serif; padding: 14px 16px; }
      #demoPanel .dp-top { display: flex; justify-content: space-between; align-items: center; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #fbbf24; font-weight: 800; }
      #demoPanel .dp-title { font-size: 17px; font-weight: 800; margin: 6px 0 10px; }
      #demoPanel .dp-bar { height: 4px; background: rgba(255,255,255,.15); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
      #demoPanel .dp-bar span { display: block; height: 100%; background: #4ade80; transition: width .3s; }
      #demoPanel .dp-row { display: flex; gap: 8px; align-items: center; }
      #demoPanel button { font: inherit; font-weight: 800; border: 0; border-radius: 10px; padding: 9px 14px; cursor: pointer; }
      #demoPanel .dp-next { background: #4ade80; color: #052e16; flex: 1; }
      #demoPanel .dp-restart { background: rgba(255,255,255,.12); color: #fff; }
      #demoPanel .dp-keys { font-size: 11.5px; color: #9fb0c6; margin-top: 8px; }
      #demoPanel.busy .dp-next { opacity: .5; cursor: wait; }
      @media print { #demoPanel { display: none !important; } .demo-hl { outline: none !important; } }`;
    document.head.appendChild(css);

    const panel = document.createElement("div");
    panel.id = "demoPanel";
    panel.setAttribute("role", "status");
    panel.innerHTML = `<div class="dp-top"><span>Demo · AERO-AGRI</span><span class="dp-count"></span></div>
      <div class="dp-title"></div><div class="dp-bar"><span></span></div>
      <div class="dp-row"><button type="button" class="dp-next"></button><button type="button" class="dp-restart">↺</button></div>
      <div class="dp-keys"></div>`;

    let step = -1, busy = false;
    function paint(text) {
        const total = STEPS.length;
        panel.querySelector(".dp-count").textContent = step < 0 ? "" : `${step + 1} / ${total}`;
        panel.querySelector(".dp-title").textContent = text;
        panel.querySelector(".dp-bar span").style.width = `${Math.max(0, (step + 1) / total * 100)}%`;
        panel.querySelector(".dp-next").textContent = step >= total - 1 ? (vi() ? "Hết demo" : "Done") : (vi() ? "Bước tiếp →" : "Next step →");
        panel.querySelector(".dp-keys").textContent = vi()
            ? "Phím → / Space / PageDown: bước tiếp · R: chạy lại từ đầu · H: ẩn/hiện bảng này"
            : "→ / Space / PageDown: next · R: restart · H: hide/show this panel";
    }
    async function next() {
        if (busy || step >= STEPS.length - 1) return;
        busy = true; panel.classList.add("busy");
        step += 1;
        const s = STEPS[step];
        paint(vi() ? s.vi : s.en);
        try { await s.run(); } catch (e) { console.warn("demo step failed", e); }
        busy = false; panel.classList.remove("busy");
    }
    function restart() { location.href = location.pathname + "?lang=" + (vi() ? "vi" : "en") + "&demo=1#step1"; }

    panel.querySelector(".dp-next").addEventListener("click", next);
    panel.querySelector(".dp-restart").addEventListener("click", restart);
    document.addEventListener("keydown", e => {
        if (e.target && e.target.closest && e.target.closest("input, select, textarea")) return;
        if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
        else if (e.key === "r" || e.key === "R") restart();
        else if (e.key === "h" || e.key === "H") panel.hidden = !panel.hidden;
    });

    document.addEventListener("DOMContentLoaded", async () => {
        document.body.appendChild(panel);
        paint(vi() ? "Đang tải dữ liệu…" : "Loading data…");
        panel.classList.add("busy"); busy = true;
        await until(ready, 120000);
        busy = false; panel.classList.remove("busy");
        paint(vi() ? "Sẵn sàng. Bấm → để bắt đầu." : "Ready. Press → to start.");
    });
})();
