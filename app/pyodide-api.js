// Static hosting (GitHub Pages): run the project's own Python server code in the browser with Pyodide.
// Calls to /api/... are answered by server.py's handlers, using the same core/ code, config and NASA data files.
// The local app (python run.py) does not load this file.
(function () {
    const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
    const banner = document.createElement("div");
    banner.id = "pyBanner";
    banner.setAttribute("role", "status");
    banner.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#14532d;color:#fff;padding:10px 16px;border-radius:12px;font:600 14px/1.4 'Segoe UI',system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:92vw;text-align:center";
    banner.textContent = "Loading the model in your browser (first visit about 20–40 s)… · Đang tải mô hình trong trình duyệt…";
    const addBanner = () => document.body && document.body.appendChild(banner);
    if (document.body) addBanner(); else document.addEventListener("DOMContentLoaded", addBanner);

    const loadScript = src => new Promise((ok, fail) => {
        const s = document.createElement("script");
        s.src = src; s.onload = ok; s.onerror = () => fail(new Error("cannot load " + src));
        document.head.appendChild(s);
    });

    const BOOT = `
import sys, io, json, os
sys.path.insert(0, "/aero")
os.chdir("/aero")
import server
server.is_osm_reachable = lambda: False

class _Handler(server.AeroAgriAPIHandler):
    def __init__(self):
        pass
    def send_json(self, status_code, payload):
        self._out = (status_code, json.dumps(payload, ensure_ascii=False))

def handle(method, path, body):
    h = _Handler()
    h._out = (500, json.dumps({"error": "no response"}))
    data = (body or "").encode("utf-8")
    h.path = path
    h.headers = {"Content-Length": str(len(data))}
    h.rfile = io.BytesIO(data)
    (h.do_POST if method == "POST" else h.do_GET)()
    return [h._out[0], h._out[1]]
`;

    const ready = (async () => {
        await loadScript(PYODIDE + "pyodide.js");
        const py = await loadPyodide({ indexURL: PYODIDE });
        await py.loadPackage(["numpy", "pandas"]);
        const files = await (await fetch("py/files.json")).json();
        for (const f of files) {
            const buf = new Uint8Array(await (await fetch("py/" + f)).arrayBuffer());
            const dir = "/aero/" + f.split("/").slice(0, -1).join("/");
            py.FS.mkdirTree(dir);
            py.FS.writeFile("/aero/" + f, buf);
        }
        py.runPython(BOOT);
        banner.remove();
        return py;
    })().catch(err => {
        banner.style.background = "#b91c1c";
        banner.textContent = "Could not start the in-browser model: " + err.message + " · Run locally with: python run.py";
        throw err;
    });

    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, opts = {}) => {
        const url = new URL(typeof input === "string" ? input : input.url, location.href);
        const i = url.pathname.indexOf("/api/");
        if (i < 0) return realFetch(input, opts);
        const py = await ready;
        const method = (opts.method || "GET").toUpperCase();
        const res = py.globals.get("handle")(method, url.pathname.slice(i) + url.search, typeof opts.body === "string" ? opts.body : "");
        const [status, text] = res.toJs();
        res.destroy();
        return new Response(text, { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
    };
})();
