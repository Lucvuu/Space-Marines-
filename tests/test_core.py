# -*- coding: utf-8 -*-
"""
AERO-AGRI Comprehensive Test Suite (Regression & Step Verification)
"""
import os
import re
import json
import tempfile
import unittest
import pandas as pd
import numpy as np

AERO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestAeroAgriStep1(unittest.TestCase):
    def test_step1_directory_structure(self):
        """Kiểm tra sự tồn tại của các thư mục bắt buộc."""
        required_dirs = [
            "config",
            "data/raw/power",
            "data/raw/ndvi",
            "data/raw/soil_moisture",
            "data/raw/salinity",
            "core",
            "scripts",
            "tests",
            "web/vendor/leaflet",
            "web/vendor/chartjs"
        ]
        for rel_dir in required_dirs:
            full_path = os.path.join(AERO_ROOT, rel_dir)
            self.assertTrue(os.path.isdir(full_path), f"Thư mục thiếu: {rel_dir}")

    def test_step1_vendor_assets(self):
        """Kiểm tra vendor assets offline đầy đủ và không rỗng."""
        assets = [
            "web/vendor/leaflet/leaflet.js",
            "web/vendor/leaflet/leaflet.css",
            "web/vendor/chartjs/chart.umd.js"
        ]
        for rel_file in assets:
            full_path = os.path.join(AERO_ROOT, rel_file)
            self.assertTrue(os.path.isfile(full_path), f"Asset thiếu: {rel_file}")
            self.assertGreater(os.path.getsize(full_path), 5000, f"Asset quá nhỏ hoặc rỗng: {rel_file}")

    def test_step1_manifest_and_gitkeeps(self):
        """Kiểm tra manifest.json hợp lệ và data/raw/* chỉ có .gitkeep."""
        manifest_path = os.path.join(AERO_ROOT, "data", "manifest.json")
        self.assertTrue(os.path.isfile(manifest_path), "Thiếu data/manifest.json")
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertIsInstance(manifest, dict)

        for sub in ["power", "ndvi", "soil_moisture", "salinity"]:
            dir_path = os.path.join(AERO_ROOT, "data", "raw", sub)
            files = [f for f in os.listdir(dir_path) if f != ".gitkeep"]
            self.assertEqual(len(files), 0, f"data/raw/{sub} phải rỗng (chỉ chứa .gitkeep)")

    def test_step1_git_initialized(self):
        """Kiểm tra git repo đã được khởi tạo trong aero-agri."""
        git_dir = os.path.join(AERO_ROOT, ".git")
        self.assertTrue(os.path.isdir(git_dir), "Chưa khởi tạo git trong aero-agri/")


class TestAeroAgriStep2(unittest.TestCase):
    def test_step2_static_analysis_no_random(self):
        """Ràng buộc cứng 1.1: grep 'random' trong core/, server.py, run.py, web/ phải RỖNG."""
        check_paths = [
            os.path.join(AERO_ROOT, "core"),
            os.path.join(AERO_ROOT, "server.py"),
            os.path.join(AERO_ROOT, "run.py"),
            os.path.join(AERO_ROOT, "web")
        ]
        violations = []
        for p in check_paths:
            if not os.path.exists(p):
                continue
            if os.path.isfile(p):
                files = [p]
            else:
                files = []
                for root, _, fnames in os.walk(p):
                    if "vendor" in root:
                        continue
                    for fn in fnames:
                        if fn.endswith((".py", ".js")):
                            files.append(os.path.join(root, fn))

            for fpath in files:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if re.search(r"\b(np\.random|random\.)", content):
                        violations.append(fpath)

        self.assertEqual(len(violations), 0, f"Phát hiện vi phạm sử dụng random tại: {violations}")

    def test_step2_static_analysis_no_cdn(self):
        """Ràng buộc cứng 1.5: grep cdn/unpkg/jsdelivr/tailwind trong web/ (trừ web/vendor/) phải RỖNG."""
        web_dir = os.path.join(AERO_ROOT, "web")
        violations = []
        if os.path.isdir(web_dir):
            for root, _, files in os.walk(web_dir):
                if "vendor" in root:
                    continue
                for fn in files:
                    if fn.endswith((".html", ".js", ".css")):
                        fpath = os.path.join(root, fn)
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if re.search(r"(cdn\.|unpkg|jsdelivr|tailwindcss)", content, re.IGNORECASE):
                                violations.append(fpath)

        self.assertEqual(len(violations), 0, f"Phát hiện vi phạm nhúng CDN tại: {violations}")

    def test_step2_loaders_missing_file_handling(self):
        """Kiểm tra xử lý khi thiếu file: trả về None, available=False, không crash."""
        from core.loaders import load_csv, get_data_status
        df, meta = load_csv("power", "Non_Existent_Region")
        self.assertIsNone(df)
        self.assertFalse(meta["available"])

        status = get_data_status("Non_Existent_Region")
        self.assertIn("power", status)
        self.assertFalse(status["power"]["available"])

    def test_step2_loaders_schema_validation(self):
        """Kiểm tra bắt lỗi thiếu cột và chuyển -999 thành NaN."""
        from core.loaders import load_csv

        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                # 1. Tạo file thiếu cột
                power_dir = os.path.join(tmp_dir, "raw", "power")
                os.makedirs(power_dir, exist_ok=True)
                bad_csv = os.path.join(power_dir, "Test_Region.csv")
                with open(bad_csv, "w", encoding="utf-8") as f:
                    f.write("date,T2M_MAX,T2M_MIN\n2024-01-01,30.0,20.0\n")

                with self.assertRaises(ValueError) as ctx:
                    load_csv("power", "Test_Region")
                self.assertIn("thiếu các cột bắt buộc", str(ctx.exception))

                # 2. Tạo file hợp lệ có -999
                good_csv = os.path.join(power_dir, "Test_Good.csv")
                with open(good_csv, "w", encoding="utf-8") as f:
                    f.write("date,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR\n")
                    f.write("2024-01-01,32.5,22.0,75.0,2.5,-999.0,0.0\n")

                df, meta = load_csv("power", "Test_Good")
                self.assertIsNotNone(df)
                self.assertTrue(meta["available"])
                self.assertTrue(np.isnan(df.loc[0, "ALLSKY_SFC_SW_DWN"]))
                self.assertEqual(df.loc[0, "T2M_MAX"], 32.5)

            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

    def test_step2_make_demo_data_isolated(self):
        """Kiểm tra make_demo_data chạy trong thư mục tạm, không chạm vào data/raw thật."""
        from scripts.make_demo_data import generate_demo_dataset

        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                generate_demo_dataset()

                # Kiểm tra các file đã sinh
                manifest_file = os.path.join(tmp_dir, "manifest.json")
                self.assertTrue(os.path.isfile(manifest_file))
                with open(manifest_file, "r", encoding="utf-8") as f:
                    manifest = json.load(f)

                # Bến Tre có đủ 4 nguồn
                for stype in ["power", "ndvi", "soil_moisture", "salinity"]:
                    key = f"{stype}/Ben_Tre_DBSCL.csv"
                    self.assertIn(key, manifest)
                    self.assertTrue(manifest[key]["is_synthetic"])

                # Đắk Lắk KHÔNG có salinity
                self.assertNotIn("salinity/Dak_Lak_Tay_Nguyen.csv", manifest)

            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

        # Đảm bảo data/raw thật của aero-agri vẫn rỗng (chỉ chứa .gitkeep)
        for sub in ["power", "ndvi", "soil_moisture", "salinity"]:
            dir_path = os.path.join(AERO_ROOT, "data", "raw", sub)
            files = [f for f in os.listdir(dir_path) if f != ".gitkeep"]
            self.assertEqual(len(files), 0, f"Dữ liệu test bị rò rỉ vào data/raw/{sub}")


class TestAeroAgriStep3(unittest.TestCase):
    def test_step3_config_regions(self):
        """Kiểm tra cấu hình regions.json."""
        path = os.path.join(AERO_ROOT, "config", "regions.json")
        self.assertTrue(os.path.isfile(path))
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIn("Ben_Tre_DBSCL", data)
        self.assertIn("Dak_Lak_Tay_Nguyen", data)

        bt = data["Ben_Tre_DBSCL"]
        self.assertEqual(bt["dry_season_months"], [1, 2, 3, 4])
        self.assertIn("rice", bt["candidate_crops"])
        self.assertIn("rice_shrimp", bt["candidate_crops"])
        self.assertIn("source", bt)
        self.assertIn("verified", bt)

        dl = data["Dak_Lak_Tay_Nguyen"]
        self.assertEqual(dl["dry_season_months"], [1, 2, 3, 4])
        self.assertIn("coffee", dl["candidate_crops"])
        self.assertIn("coffee_cover_crop", dl["candidate_crops"])

    def test_step3_config_crops(self):
        """Kiểm tra cấu hình crops.json và cây đặc biệt (perennial, rice_shrimp null kc)."""
        path = os.path.join(AERO_ROOT, "config", "crops.json")
        self.assertTrue(os.path.isfile(path))
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Cây lâu năm
        self.assertTrue(data["coffee"]["perennial"])
        self.assertTrue(data["coffee_cover_crop"]["perennial"])
        self.assertFalse(data["rice"]["perennial"])

        # Lúa - tôm: kc_* = null và source có TODO
        rs = data["rice_shrimp"]
        self.assertIsNone(rs["kc_ini"])
        self.assertIsNone(rs["kc_mid"])
        self.assertIsNone(rs["kc_end"])
        self.assertIn("TODO", rs["source"])

        # Kiểm tra đủ các trường cơ bản
        for cname, cinfo in data.items():
            self.assertIn("name_vi", cinfo)
            self.assertIn("heat_threshold_c", cinfo)
            self.assertIn("source", cinfo)
            self.assertIn("verified", cinfo)

    def test_step3_config_scoring(self):
        """Kiểm tra cấu hình scoring.json: tổng trọng số bằng 1.0 và đủ các ngưỡng."""
        path = os.path.join(AERO_ROOT, "config", "scoring.json")
        self.assertTrue(os.path.isfile(path))
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        w = data["weights"]
        total_w = w["w_water"] + w["w_salinity"] + w["w_heat"]
        self.assertAlmostEqual(total_w, 1.0, places=5)
        self.assertIn("LOW", data["risk_thresholds"])
        self.assertIn("CRITICAL", data["risk_thresholds"])


class TestAeroAgriStep4(unittest.TestCase):
    def test_step4_fao56_example8_ra(self):
        """FAO-56 Example 8 (lat -20°, 3/9, J=246) -> Ra ≈ 32.2 (±0.3)."""
        from core.eto import calculate_extraterrestrial_radiation
        ra = calculate_extraterrestrial_radiation(lat_deg=-20.0, day_of_year=246)
        self.assertAlmostEqual(ra, 32.2, delta=0.3)

    def test_step4_fao56_example18_eto(self):
        """FAO-56 Example 18 (lat 50.8°N, elev 100m, 6/7, Tmax 21.5, Tmin 12.3, RH 73.5, u2 2.078, Rs 22.07) -> ETo ≈ 3.9 (±0.3)."""
        from core.eto import calculate_daily_eto
        eto = calculate_daily_eto(
            tmax=21.5,
            tmin=12.3,
            rh_mean=73.5,
            u2=2.078,
            rs=22.07,
            lat_deg=50.8,
            elevation_m=100.0,
            day_of_year=187
        )
        self.assertAlmostEqual(eto, 3.9, delta=0.3)

    def test_step4_rs_rso_ratio_capped_at_one(self):
        """Ràng buộc kỹ thuật #6: tỉ số Rs/Rso bị chặn không vượt quá 1.0."""
        from core.eto import calculate_daily_eto
        eto = calculate_daily_eto(
            tmax=30.0,
            tmin=20.0,
            rh_mean=70.0,
            u2=2.0,
            rs=100.0,
            lat_deg=10.0,
            elevation_m=10.0,
            day_of_year=100
        )
        self.assertGreater(eto, 0.0)

    def test_step4_eto_series_simulation(self):
        """Kiểm tra calculate_eto_series với delta_temp_c."""
        from core.eto import calculate_eto_series
        dates = pd.date_range("2024-01-01", "2024-01-10")
        df = pd.DataFrame({
            "date": dates,
            "T2M_MAX": [32.0] * 10,
            "T2M_MIN": [22.0] * 10,
            "RH2M": [75.0] * 10,
            "WS2M": [2.5] * 10,
            "ALLSKY_SFC_SW_DWN": [20.0] * 10
        })
        eto_base = calculate_eto_series(df, lat_deg=10.24, elevation_m=2.0, delta_temp_c=0.0)
        eto_warm = calculate_eto_series(df, lat_deg=10.24, elevation_m=2.0, delta_temp_c=2.0)
        self.assertEqual(len(eto_base), 10)
        self.assertGreater(eto_warm.mean(), eto_base.mean())


class TestAeroAgriStep5(unittest.TestCase):
    def test_step5_usda_scs_peff(self):
        """Spec 8: Peff: P = 100 -> 84.0; P = 300 -> 155.0."""
        from core.water_balance import calculate_monthly_peff
        self.assertAlmostEqual(calculate_monthly_peff(100.0), 84.0, places=2)
        self.assertAlmostEqual(calculate_monthly_peff(300.0), 155.0, places=2)

    def test_step5_kc_interpolation(self):
        """Kiểm tra nội suy Kc theo stages."""
        from core.water_balance import build_daily_kc
        stages = {"ini": 20, "dev": 25, "mid": 35, "late": 20}
        kc = build_daily_kc(stages, kc_ini=0.40, kc_mid=1.15, kc_end=0.50, season_days=100)
        self.assertEqual(len(kc), 100)
        # Ngày 10 thuộc stage ini -> 0.40
        self.assertAlmostEqual(kc[9], 0.40, places=3)
        # Ngày 60 thuộc stage mid -> 1.15
        self.assertAlmostEqual(kc[59], 1.15, places=3)
        # Ngày 99 thuộc stage late -> gần 0.50
        self.assertAlmostEqual(kc[99], 0.50, places=2)

    def test_step5_water_balance_rice_vs_soybean(self):
        """Spec 8: lúa có deficit_mm lớn hơn đậu tương."""
        from core.water_balance import calculate_water_balance
        # Tạo chuỗi dữ liệu 1 năm mùa khô giả lập
        dates = pd.date_range("2024-01-01", "2024-06-30")
        df = pd.DataFrame({
            "date": dates,
            "T2M_MAX": [33.0] * len(dates),
            "T2M_MIN": [24.0] * len(dates),
            "RH2M": [70.0] * len(dates),
            "WS2M": [3.0] * len(dates),
            "ALLSKY_SFC_SW_DWN": [20.0] * len(dates),
            "PRECTOTCORR": [1.0] * len(dates)
        })
        wb_rice = calculate_water_balance(df, "Ben_Tre_DBSCL", "rice")
        wb_soy = calculate_water_balance(df, "Ben_Tre_DBSCL", "soybean")
        self.assertTrue(wb_rice["available"])
        self.assertTrue(wb_soy["available"])
        self.assertGreater(wb_rice["mean_deficit_mm"], wb_soy["mean_deficit_mm"])

    def test_step5_special_crops(self):
        """Cây đặc biệt: rice_shrimp trả available=False; coffee perennial chạy được."""
        from core.water_balance import calculate_water_balance
        dates = pd.date_range("2024-01-01", "2024-06-30")
        df = pd.DataFrame({
            "date": dates,
            "T2M_MAX": [30.0] * len(dates),
            "T2M_MIN": [18.0] * len(dates),
            "RH2M": [60.0] * len(dates),
            "WS2M": [3.5] * len(dates),
            "ALLSKY_SFC_SW_DWN": [22.0] * len(dates),
            "PRECTOTCORR": [0.5] * len(dates)
        })
        wb_rs = calculate_water_balance(df, "Ben_Tre_DBSCL", "rice_shrimp")
        self.assertFalse(wb_rs["available"])
        self.assertIsNone(wb_rs["mean_deficit_mm"])

        wb_coffee = calculate_water_balance(df, "Dak_Lak_Tay_Nguyen", "coffee")
        self.assertTrue(wb_coffee["available"])
        self.assertGreater(wb_coffee["mean_deficit_mm"], 0.0)


class TestAeroAgriStep6(unittest.TestCase):
    def test_step6_scoring_missing_power(self):
        """Khi chưa có file POWER: trả available=False, không crash."""
        from core.scoring import evaluate_crop_suitability
        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                res = evaluate_crop_suitability("Ben_Tre_DBSCL")
                self.assertFalse(res["available"])
                self.assertIn("chưa có dữ liệu POWER", res["error"])
            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

    def test_step6_scoring_and_advisor_with_demo_data(self):
        """Với dữ liệu demo: score Bến Tre khác Đắk Lắk; advisor sinh markdown 3 phần."""
        from scripts.make_demo_data import generate_demo_dataset
        from core.scoring import evaluate_crop_suitability
        from core.advisor import build_advice

        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                generate_demo_dataset()

                res_bt = evaluate_crop_suitability("Ben_Tre_DBSCL")
                res_dl = evaluate_crop_suitability("Dak_Lak_Tay_Nguyen")

                self.assertTrue(res_bt["available"])
                self.assertTrue(res_dl["available"])

                # Cây lúa ở Bến Tre vs Ngô/Cà phê ở Đắk Lắk có score khác nhau
                bt_rice = [c for c in res_bt["crops"] if c["crop_id"] == "rice"][0]
                dl_coffee = [c for c in res_dl["crops"] if c["crop_id"] == "coffee"][0]
                self.assertIsNotNone(bt_rice["score"])
                self.assertIsNotNone(dl_coffee["score"])
                self.assertNotEqual(bt_rice["score"], dl_coffee["score"])

                # Lúa có deficit lớn hơn đậu tương
                bt_soy = [c for c in res_bt["crops"] if c["crop_id"] == "soybean"][0]
                self.assertGreater(bt_rice["deficit_mm"], bt_soy["deficit_mm"])

                # Kiểm tra advisor
                advice = build_advice("Ben_Tre_DBSCL", res_bt, question="Nên gieo lúa hay đậu tương?")
                self.assertIn("markdown", advice)
                self.assertFalse(advice["used_llm"])
                md = advice["markdown"]
                self.assertIn("1. Hiện trạng số liệu", md)
                self.assertIn("2. Bảng so sánh", md)
                self.assertIn("3. Việc nên làm", md)
                self.assertIn("DỮ LIỆU MẪU", md)  # Gắn cờ dữ liệu mẫu

            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

        # Đảm bảo data/raw thật của aero-agri vẫn chỉ chứa .gitkeep
        for sub in ["power", "ndvi", "soil_moisture", "salinity"]:
            dir_path = os.path.join(AERO_ROOT, "data", "raw", sub)
            files = [f for f in os.listdir(dir_path) if f != ".gitkeep"]
            self.assertEqual(len(files), 0, f"Dữ liệu test bị rò rỉ vào data/raw/{sub}")


class TestAeroAgriStep7(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import threading
        from server import create_server
        # Dùng cổng 0 để OS tự cấp cổng rảnh
        cls.server = create_server("127.0.0.1", 0)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_step7_static_files(self):
        """User Mod #7: Test GET / trả 200 và GET /vendor/chartjs/chart.umd.js trả 200."""
        import requests
        r_root = requests.get(f"{self.base_url}/")
        self.assertEqual(r_root.status_code, 200)

        r_vendor = requests.get(f"{self.base_url}/vendor/chartjs/chart.umd.js")
        self.assertEqual(r_vendor.status_code, 200)
        self.assertGreater(len(r_vendor.content), 10000)

    def test_step7_api_status_and_regions(self):
        """Kiểm tra GET /api/status và GET /api/regions."""
        import requests
        r_status = requests.get(f"{self.base_url}/api/status")
        self.assertEqual(r_status.status_code, 200)
        data_status = r_status.json()
        self.assertIn("Ben_Tre_DBSCL", data_status)
        self.assertIn("Dak_Lak_Tay_Nguyen", data_status)

        r_reg = requests.get(f"{self.base_url}/api/regions")
        self.assertEqual(r_reg.status_code, 200)
        self.assertIn("Ben_Tre_DBSCL", r_reg.json())

    def test_step7_evaluate_missing_data_404(self):
        """Spec 8: Không có data -> /api/evaluate trả lỗi 404, không crash."""
        import requests
        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                payload = {"region": "Ben_Tre_DBSCL", "delta_temp_c": 0.0, "delta_rain_pct": 0.0}
                r = requests.post(f"{self.base_url}/api/evaluate", json=payload)
                self.assertEqual(r.status_code, 404)
                self.assertIn("error", r.json())
            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

    def test_step7_evaluate_bad_request_400(self):
        """Kiểm tra bắt lỗi 400 khi thiếu tham số."""
        import requests
        r = requests.post(f"{self.base_url}/api/evaluate", json={})
        self.assertEqual(r.status_code, 400)
        self.assertIn("error", r.json())


if __name__ == "__main__":
    unittest.main(verbosity=2)
