# -*- coding: utf-8 -*-
"""
AERO-AGRI HTTP Server & REST API
Phục vụ API theo mục 6 và các tệp tĩnh web/ tại cổng 8050.
Tuân thủ:
- stdlib http.server
- Trả lỗi dạng JSON {"error": "..."} với mã 400/404/500, không traceback
- Đọc data qua get_data_dir() / AERO_DATA_DIR
"""
import os
import sys
import json
import socket
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

AERO_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AERO_ROOT)

from core.loaders import get_data_status, load_csv
from core.water_balance import load_config
from core.eto import calculate_eto_series
from core.scoring import evaluate_crop_suitability
from core.advisor import build_advice

WEB_DIR = os.path.join(AERO_ROOT, "web")

def is_osm_reachable():
    """Kiểm tra kết nối tới OSM tile server để tránh lỗi console khi chạy offline."""
    try:
        socket.create_connection(("tile.openstreetmap.org", 80), timeout=0.5)
        return True
    except OSError:
        return False

class AeroAgriAPIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status_code, message):
        self.send_json(status_code, {"error": str(message)})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        try:
            # 1. GET /api/status
            if path == "/api/status":
                regions_cfg = load_config("regions")
                status = {}
                for reg_id in regions_cfg:
                    status[reg_id] = get_data_status(reg_id)
                status["_osm_online"] = is_osm_reachable()
                self.send_json(200, status)
                return

            # 2. GET /api/regions
            elif path == "/api/regions":
                regions_cfg = load_config("regions")
                self.send_json(200, regions_cfg)
                return

            # 3. GET /api/climate?region=
            elif path == "/api/climate":
                reg_id = query.get("region", [None])[0]
                if not reg_id:
                    self.send_error_json(400, "Thiếu tham số query 'region'")
                    return

                power_df, power_meta = load_csv("power", reg_id)
                if power_df is None or len(power_df) == 0:
                    self.send_error_json(404, f"chưa có dữ liệu POWER cho vùng {reg_id}")
                    return

                regions_cfg = load_config("regions")
                reg_info = regions_cfg.get(reg_id, {"lat": 10.0, "elevation_m": 0.0})

                df = power_df.copy()
                df["ETo_mm"] = calculate_eto_series(df, reg_info["lat"], reg_info["elevation_m"])
                df["year_month"] = df["date"].dt.strftime("%Y-%m")

                # Thử đọc thêm ndvi và soil_moisture
                ndvi_df, _ = load_csv("ndvi", reg_id)
                if ndvi_df is not None:
                    ndvi_df["year_month"] = ndvi_df["date"].dt.strftime("%Y-%m")
                    m_ndvi = ndvi_df.groupby("year_month")["ndvi"].mean().to_dict()
                else:
                    m_ndvi = {}

                sm_df, _ = load_csv("soil_moisture", reg_id)
                if sm_df is not None:
                    sm_df["year_month"] = sm_df["date"].dt.strftime("%Y-%m")
                    m_sm = sm_df.groupby("year_month")["sm_rootzone"].mean().to_dict()
                else:
                    m_sm = {}

                monthly = df.groupby("year_month").agg({
                    "T2M_MAX": "mean",
                    "T2M_MIN": "mean",
                    "PRECTOTCORR": "sum",
                    "ETo_mm": "sum"
                }).reset_index()

                records = []
                for _, row in monthly.iterrows():
                    ym = row["year_month"]
                    records.append({
                        "month": ym,
                        "tmax_mean": round(float(row["T2M_MAX"]), 2),
                        "tmin_mean": round(float(row["T2M_MIN"]), 2),
                        "rain_sum_mm": round(float(row["PRECTOTCORR"]), 2),
                        "eto_sum_mm": round(float(row["ETo_mm"]), 2),
                        "ndvi_mean": round(float(m_ndvi[ym]), 3) if ym in m_ndvi else None,
                        "sm_rootzone_mean": round(float(m_sm[ym]), 3) if ym in m_sm else None
                    })

                self.send_json(200, {
                    "region": reg_id,
                    "months_count": len(records),
                    "monthly_series": records,
                    "is_synthetic": power_meta.get("is_synthetic", False)
                })
                return

        except Exception as e:
            self.send_error_json(500, f"Lỗi máy chủ nội bộ: {str(e)}")
            return

        # Phục vụ file tĩnh web/
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            body = json.loads(raw_body) if raw_body else {}
        except Exception:
            self.send_error_json(400, "Định dạng JSON trong body không hợp lệ")
            return

        try:
            # 4. POST /api/evaluate
            if path == "/api/evaluate":
                reg_id = body.get("region")
                if not reg_id:
                    self.send_error_json(400, "Thiếu tham số 'region' trong body")
                    return

                d_temp = float(body.get("delta_temp_c", 0.0))
                d_rain = float(body.get("delta_rain_pct", 0.0))

                res = evaluate_crop_suitability(reg_id, delta_temp_c=d_temp, delta_rain_pct=d_rain)
                if not res.get("available"):
                    self.send_error_json(404, res.get("error", f"chưa có dữ liệu POWER cho vùng {reg_id}"))
                    return

                self.send_json(200, res)
                return

            # 5. POST /api/advise
            elif path == "/api/advise":
                reg_id = body.get("region")
                if not reg_id:
                    self.send_error_json(400, "Thiếu tham số 'region' trong body")
                    return

                question = body.get("question", "")
                eval_res = evaluate_crop_suitability(reg_id)
                advice = build_advice(reg_id, eval_res, question=question)
                self.send_json(200, advice)
                return

            else:
                self.send_error_json(404, "API endpoint không tồn tại")
                return

        except Exception as e:
            self.send_error_json(500, f"Lỗi máy chủ nội bộ: {str(e)}")
            return

def create_server(host="127.0.0.1", port=8050):
    return ThreadingHTTPServer((host, port), AeroAgriAPIHandler)

if __name__ == "__main__":
    port = 8050
    server = create_server("127.0.0.1", port)
    print(f"[AERO-AGRI] Server đang chạy tại http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[AERO-AGRI] Đã dừng server.")
        server.server_close()
