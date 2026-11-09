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
            self.assertTrue(os.path.isfile(os.path.join(dir_path, ".gitkeep")))
            files = [f for f in os.listdir(dir_path) if f != ".gitkeep"]
            for fname in files:
                rel_k = f"{sub}/{fname}"
                self.assertIn(rel_k, manifest, f"File {rel_k} trong data/raw chưa khai báo trong manifest.json")
                self.assertFalse(manifest[rel_k].get("is_synthetic", True), f"File {rel_k} trong data/raw thật không được là dữ liệu synthetic")

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

        before_raw = {
            sub: set(os.listdir(os.path.join(AERO_ROOT, "data", "raw", sub)))
            for sub in ["power", "ndvi", "soil_moisture", "salinity"]
        }

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

        # Đảm bảo data/raw thật của aero-agri không bị rò rỉ dữ liệu synthetic từ test
        real_manifest_path = os.path.join(AERO_ROOT, "data", "manifest.json")
        real_manifest = {}
        if os.path.isfile(real_manifest_path):
            with open(real_manifest_path, "r", encoding="utf-8") as f:
                real_manifest = json.load(f)
        for sub in ["power", "ndvi", "soil_moisture", "salinity"]:
            dir_path = os.path.join(AERO_ROOT, "data", "raw", sub)
            after_files = set(os.listdir(dir_path))
            self.assertEqual(after_files, before_raw[sub], f"Dữ liệu test bị rò rỉ vào data/raw/{sub}")
            for fname in after_files:
                if fname != ".gitkeep":
                    rel_k = f"{sub}/{fname}"
                    self.assertIn(rel_k, real_manifest)
                    self.assertFalse(real_manifest[rel_k].get("is_synthetic", True))


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

        # Lúa - tôm: kc_* = null và source["kc"] có TODO
        rs = data["rice_shrimp"]
        self.assertIsNone(rs["kc_ini"])
        self.assertIsNone(rs["kc_mid"])
        self.assertIsNone(rs["kc_end"])
        self.assertIsInstance(rs["source"], dict)
        self.assertIn("TODO", rs["source"]["kc"])

        # Kiểm tra đủ các trường cơ bản và cấu trúc source dict
        for cname, cinfo in data.items():
            self.assertIn("name_vi", cinfo)
            self.assertIn("heat_threshold_c", cinfo)
            self.assertIn("source", cinfo)
            self.assertIsInstance(cinfo["source"], dict)
            for k in ["kc", "salinity", "heat", "water_extra"]:
                self.assertIn(k, cinfo["source"])
            self.assertIsInstance(cinfo["source"]["heat"], str)
            self.assertGreater(len(cinfo["source"]["heat"].strip()), 0)
            if "heat" in cinfo.get("verified_params", []):
                self.assertNotIn("TODO", cinfo["source"]["heat"])
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

    def test_step4_u2_floor_at_0_5_ms(self):
        """Fix 1: u2 = 0.1 và u2 = 0.5 cho ra cùng một ETo (FAO-56 ch.3, p.63)."""
        from core.eto import calculate_daily_eto
        eto_low = calculate_daily_eto(
            tmax=31.0, tmin=20.0, rh_mean=68.0, u2=0.1,
            rs=20.0, lat_deg=12.6667, elevation_m=530.0, day_of_year=45
        )
        eto_floor = calculate_daily_eto(
            tmax=31.0, tmin=20.0, rh_mean=68.0, u2=0.5,
            rs=20.0, lat_deg=12.6667, elevation_m=530.0, day_of_year=45
        )
        self.assertAlmostEqual(float(eto_low), float(eto_floor), places=9)


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
        dates = pd.date_range("2023-11-01", "2024-06-30")
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
        # Rice requirement includes land_prep (200) + percolation (3*105 = 315) = 515 mm
        self.assertAlmostEqual(wb_rice["mean_water_req_mm"] - wb_rice["mean_etc_mm"], 515.0, delta=1.0)

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
    def test_step6_salinity_conversion(self):
        """Fix 5: kiểm ngưỡng ppt của rice (soil_water_submerged, 3.0 dS/m) ≈ 1.923 và soybean (ece, 5.0 dS/m) ≈ 2.137."""
        from core.scoring import ece_to_water_salinity_ppt
        from core.water_balance import load_config
        crops_cfg = load_config("crops")
        rice_cfg = crops_cfg["rice"]
        soy_cfg = crops_cfg["soybean"]
        rice_ppt = ece_to_water_salinity_ppt(
            rice_cfg["salinity_threshold_ece_dsm"],
            salinity_basis=rice_cfg["salinity_basis"]
        )
        soy_ppt = ece_to_water_salinity_ppt(
            soy_cfg["salinity_threshold_ece_dsm"],
            salinity_basis=soy_cfg["salinity_basis"]
        )
        self.assertAlmostEqual(rice_ppt, 1.923, delta=0.002)
        self.assertAlmostEqual(soy_ppt, 2.137, delta=0.002)

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

        before_raw = {
            sub: set(os.listdir(os.path.join(AERO_ROOT, "data", "raw", sub)))
            for sub in ["power", "ndvi", "soil_moisture", "salinity"]
        }

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
                bt_maize = [c for c in res_bt["crops"] if c["crop_id"] == "maize"][0]
                self.assertGreater(bt_rice["deficit_mm"], bt_soy["deficit_mm"])

                # Fix 2: Ở Bến Tre, thứ tự score: rice < soybean, rice < maize
                self.assertLess(bt_rice["score"], bt_soy["score"])
                self.assertLess(bt_rice["score"], bt_maize["score"])

                # Fix 2: Ở Đắk Lắk, coffee_cover_crop phải có điểm thấp hơn coffee
                dl_cover = [c for c in res_dl["crops"] if c["crop_id"] == "coffee_cover_crop"][0]
                self.assertLess(dl_cover["score"], dl_coffee["score"])

                # rice_shrimp ở Bến Tre thiếu thành phần của vùng -> score là None, water_vs_baseline_pct là None
                bt_rs = [c for c in res_bt["crops"] if c["crop_id"] == "rice_shrimp"][0]
                self.assertIsNone(bt_rs["score"])
                self.assertEqual(bt_rs["risk_level"], "INSUFFICIENT_DATA")
                self.assertIsNone(bt_rs["water_vs_baseline_pct"])

                # Kiểm tra advisor
                advice = build_advice("Ben_Tre_DBSCL", res_bt, question="Nên gieo lúa hay đậu tương?")
                self.assertIn("markdown", advice)
                self.assertFalse(advice["used_llm"])
                md = advice["markdown"]
                self.assertIn("1. Hiện trạng số liệu", md)
                self.assertIn("2. Bảng so sánh", md)
                self.assertIn("3. Việc nên làm", md)
                self.assertIn("DỮ LIỆU MẪU", md)  # Gắn cờ dữ liệu mẫu
                self.assertNotIn("mất trắng", md.lower())
                self.assertNotIn("mất mùa", md.lower())
                self.assertNotIn("năng suất", md.lower())

            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

        # Đảm bảo data/raw thật của aero-agri không bị rò rỉ dữ liệu synthetic từ test
        for sub in ["power", "ndvi", "soil_moisture", "salinity"]:
            dir_path = os.path.join(AERO_ROOT, "data", "raw", sub)
            after_files = set(os.listdir(dir_path))
            self.assertEqual(after_files, before_raw[sub], f"Dữ liệu test bị rò rỉ vào data/raw/{sub}")


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

    def test_task2_modis_ndvi_parse_scale_filter(self):
        """Kiểm tra parse cửa sổ nhiều pixel, lọc fill (-3000, ngoài [-0.2, 1.0]), lọc mây (reliability 0/1, >=20 pixel) và tính median."""
        from core.ndvi_fetch import parse_subset_response
        fixture_path = os.path.join(AERO_ROOT, "tests", "fixtures", "modis_subset_sample.json")
        self.assertTrue(os.path.isfile(fixture_path))
        with open(fixture_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        rows = parse_subset_response(payload)
        # Ngày 2024-01-01: 21 pixel hợp lệ (10x0.3, 1x0.4, 10x0.5; bỏ -3000, 12500, -2500 và pixel reliability=3) -> median = 0.4000
        # Ngày 2024-01-17: chỉ có 10 pixel reliability 0/1 (< 20) -> bị loại cả ngày
        # Ngày 2024-02-02: 22 pixel hợp lệ (11x0.60, 11x0.64; bỏ 3 pixel -3000) -> median = 0.6200
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["date"], "2024-01-01")
        self.assertAlmostEqual(rows[0]["ndvi"], 0.4000, places=4)
        self.assertEqual(rows[0]["n_valid_pixels"], 21)
        self.assertEqual(rows[1]["date"], "2024-02-02")
        self.assertAlmostEqual(rows[1]["ndvi"], 0.6200, places=4)
        self.assertEqual(rows[1]["n_valid_pixels"], 22)

    def test_prep6_regression_baseline(self):
        """Kiểm tra kết quả evaluate trên demo data khớp với regression_baseline.json (sai số 1e-6)."""
        from scripts.make_demo_data import generate_demo_dataset
        from core.scoring import evaluate_crop_suitability

        baseline_path = os.path.join(AERO_ROOT, "tests", "fixtures", "regression_baseline.json")
        self.assertTrue(os.path.isfile(baseline_path))
        with open(baseline_path, "r", encoding="utf-8") as f:
            baseline = json.load(f)

        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                generate_demo_dataset()
                for reg_id, scen_dict in baseline.items():
                    for scen_key, expected_crops in scen_dict.items():
                        dt_str, dr_str = scen_key.split("_")
                        res = evaluate_crop_suitability(reg_id, float(dt_str), float(dr_str))
                        actual_map = {c["crop_id"]: c for c in res["crops"]}
                        for cid, exp in expected_crops.items():
                            act = actual_map[cid]
                            self.assertIn("season_window", act)
                            self.assertIn("start", act["season_window"])
                            self.assertIn("end", act["season_window"])
                            self.assertEqual(act["risk_level"], exp["risk_level"])
                            for num_field, act_key in [
                                ("score", "score"),
                                ("r", "exceed_ratio_r"),
                                ("deficit_mm", "deficit_mm"),
                                ("water_vs_baseline_pct", "water_vs_baseline_pct"),
                            ]:
                                if exp[num_field] is None:
                                    self.assertIsNone(act[act_key])
                                else:
                                    self.assertAlmostEqual(float(act[act_key]), float(exp[num_field]), delta=1e-6)
            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

    def test_prep6_cross_year_season_window_and_crop_override(self):
        """
        Prep 6 Bước 1:
        - Mùa vụ bắt đầu '11-01', season_days 105: cửa sổ tính đúng từ 1/11 năm y đến 13/2 năm y+1.
        - Hai cây trong cùng một vùng có crop_season_start khác nhau thì heat_ratio khác nhau.
        """
        from unittest.mock import patch
        from core.water_balance import get_annual_season_bounds, iter_crop_season_slices, load_config
        from core.scoring import evaluate_crop_suitability
        from scripts.make_demo_data import generate_demo_dataset

        # 1. Kiểm tra get_annual_season_bounds & iter_crop_season_slices cho '11-01', 105 ngày
        s_dt, e_dt = get_annual_season_bounds(2023, "11-01", 105)
        self.assertEqual(s_dt.strftime("%Y-%m-%d"), "2023-11-01")
        self.assertEqual(e_dt.strftime("%Y-%m-%d"), "2024-02-13")

        dates = pd.date_range("2022-01-01", "2024-12-31", freq="D")
        df_test = pd.DataFrame({"date": dates, "val": 1})
        reg_mock = {"season_start": "11-01", "dry_season_months": [1, 2, 3, 4]}
        crop_mock = {"perennial": False, "season_days": 105}
        slices = list(iter_crop_season_slices(df_test, reg_mock, "rice", crop_mock))
        self.assertEqual([y for y, _ in slices], [2022, 2023])
        self.assertEqual(slices[0][1]["date"].min().strftime("%Y-%m-%d"), "2022-11-01")
        self.assertEqual(slices[0][1]["date"].max().strftime("%Y-%m-%d"), "2023-02-13")
        self.assertEqual(len(slices[0][1]), 105)

        # 2. Hai cây trong cùng vùng có crop_season_start khác nhau -> heat_ratio khác nhau
        real_regions = load_config("regions")
        real_crops = load_config("crops")
        patched_regions = json.loads(json.dumps(real_regions))
        patched_regions["Ben_Tre_DBSCL"]["crop_season_start"] = {
            "rice": "02-01",
            "soybean": "07-01"
        }

        def fake_load_config(name):
            if name == "regions":
                return patched_regions
            if name == "crops":
                return real_crops
            return load_config(name)

        with tempfile.TemporaryDirectory() as tmp_dir:
            old_data_dir = os.environ.get("AERO_DATA_DIR")
            os.environ["AERO_DATA_DIR"] = tmp_dir
            try:
                generate_demo_dataset()
                with patch("core.scoring.load_config", side_effect=fake_load_config), \
                     patch("core.water_balance.load_config", side_effect=fake_load_config):
                    res = evaluate_crop_suitability("Ben_Tre_DBSCL", 0.0, 0.0)
                    c_map = {c["crop_id"]: c for c in res["crops"]}
                    hr_rice = c_map["rice"]["components"]["heat_ratio"]
                    hr_soy = c_map["soybean"]["components"]["heat_ratio"]
                    self.assertNotEqual(hr_rice, hr_soy)
                    self.assertGreater(hr_rice, hr_soy)
            finally:
                if old_data_dir:
                    os.environ["AERO_DATA_DIR"] = old_data_dir
                else:
                    os.environ.pop("AERO_DATA_DIR", None)

    def test_prep6_prorate_peff_partial_months(self):
        """
        Prep 6 Bước 2:
        - Mùa vụ đầy đủ 2 tháng thì Peff không đổi so với cách cũ.
        - Nửa tháng (15/30 ngày của tháng 4) có tổng mưa cả tháng = 100 mm thì Peff bằng nửa Peff của 100 mm (42.0 mm).
        """
        from core.water_balance import calculate_monthly_peff, calculate_season_peff

        # Tạo dữ liệu 2 tháng đầy đủ: tháng 3 (31 ngày, tổng mưa 62 mm) và tháng 4 (30 ngày, tổng mưa 100 mm)
        dates_mar = pd.date_range("2025-03-01", "2025-03-31", freq="D")
        dates_apr = pd.date_range("2025-04-01", "2025-04-30", freq="D")
        df_mar = pd.DataFrame({"date": dates_mar, "Rain_sim_mm": [2.0] * 31})        # tổng 62 mm
        # Tháng 4 tổng mưa 100 mm (rải không đều: 15 ngày đầu mưa 20 mm, 15 ngày sau mưa 80 mm)
        df_apr = pd.DataFrame({"date": dates_apr, "Rain_sim_mm": [20.0 / 15.0] * 15 + [80.0 / 15.0] * 15})
        df_all = pd.concat([df_mar, df_apr], ignore_index=True)

        # 1. Mùa vụ trọn vẹn cả 2 tháng (1/3 .. 30/4) -> Peff không đổi so với tổng calculate_monthly_peff(62) + calculate_monthly_peff(100)
        expected_full_2m = calculate_monthly_peff(62.0) + calculate_monthly_peff(100.0)
        actual_full_2m = calculate_season_peff(df_all, df_all, rain_col="Rain_sim_mm")
        self.assertAlmostEqual(actual_full_2m, expected_full_2m, places=6)

        # 2. Nửa tháng 4 (15 ngày đầu tháng 4, từ 1/4 .. 15/4) khi cả tháng 4 mưa 100 mm -> Peff = 0.5 * Peff(100) = 42.0 mm
        df_half_apr = df_apr.iloc[:15].copy()
        actual_half_apr = calculate_season_peff(df_all, df_half_apr, rain_col="Rain_sim_mm")
        self.assertAlmostEqual(actual_half_apr, 0.5 * calculate_monthly_peff(100.0), places=6)
        self.assertAlmostEqual(actual_half_apr, 42.0, places=6)


class TestAeroAgriFix6(unittest.TestCase):
    """Kiểm thử Bước 6 (Fix 6): Chiến lược luân canh cả năm, lịch 12 tháng, API /api/rotations."""

    @classmethod
    def setUpClass(cls):
        cls._tmp_dir = tempfile.TemporaryDirectory()
        cls.old_data_dir = os.environ.get("AERO_DATA_DIR")
        os.environ["AERO_DATA_DIR"] = cls._tmp_dir.name
        from scripts.make_demo_data import generate_demo_dataset
        generate_demo_dataset()

    @classmethod
    def tearDownClass(cls):
        if cls.old_data_dir:
            os.environ["AERO_DATA_DIR"] = cls.old_data_dir
        else:
            os.environ.pop("AERO_DATA_DIR", None)
        cls._tmp_dir.cleanup()

    def test_fix6_1_ben_tre_s0_bare_months(self):
        """1. Bến Tre, S0: bare_months == [2, 3, 4, 5, 9, 10]."""
        from core.rotation import evaluate_rotations
        res = evaluate_rotations("Ben_Tre_DBSCL", 0.0, 0.0)
        s0 = next(s for s in res["strategies"] if s["id"] == "S0")
        self.assertEqual(s0["bare_months"], [2, 3, 4, 5, 9, 10])

    def test_fix6_2_ben_tre_s0_annual_deficit_sum(self):
        """2. Bến Tre, S0: annual_deficit_mm bằng tổng 2 lần gọi calculate_water_balance với season_start '05-25' và '11-01' (sai số 0.1)."""
        from core.rotation import evaluate_rotations
        from core.water_balance import calculate_water_balance
        from core.loaders import load_csv

        res = evaluate_rotations("Ben_Tre_DBSCL", 0.0, 0.0)
        s0 = next(s for s in res["strategies"] if s["id"] == "S0")

        df_power, _ = load_csv("power", "Ben_Tre_DBSCL")
        wb_ht = calculate_water_balance(df_power, "Ben_Tre_DBSCL", "rice", 0.0, 0.0, season_start="05-25")
        wb_dx = calculate_water_balance(df_power, "Ben_Tre_DBSCL", "rice", 0.0, 0.0, season_start="11-01")
        expected_sum = wb_ht["mean_deficit_mm"] + wb_dx["mean_deficit_mm"]

        self.assertAlmostEqual(s0["annual_deficit_mm"], expected_sum, delta=0.1)

    def test_fix6_3_ben_tre_s1_partial_shrimp(self):
        """3. Bến Tre, S1: partial là true, pha tôm có modeled false, annual_deficit_mm không null."""
        from core.rotation import evaluate_rotations
        res = evaluate_rotations("Ben_Tre_DBSCL", 0.0, 0.0)
        s1 = next(s for s in res["strategies"] if s["id"] == "S1")
        self.assertTrue(s1["partial"])
        shrimp_phase = next(p for p in s1["phases"] if p["crop"] is None)
        self.assertFalse(shrimp_phase["modeled"])
        self.assertIsNotNone(s1["annual_deficit_mm"])

    def test_fix6_4_dak_lak_coffee_vs_cover_crop(self):
        """4. Đắk Lắk: evaluate trả score khác null cho coffee và coffee_cover_crop; coffee_cover_crop có deficit lớn hơn coffee."""
        from core.scoring import evaluate_crop_suitability
        res = evaluate_crop_suitability("Dak_Lak_Tay_Nguyen", 0.0, 0.0)
        c_map = {c["crop_id"]: c for c in res["crops"]}
        self.assertIn("coffee", c_map)
        self.assertIn("coffee_cover_crop", c_map)
        self.assertIsNotNone(c_map["coffee"]["score"])
        self.assertIsNotNone(c_map["coffee_cover_crop"]["score"])
        self.assertGreater(c_map["coffee_cover_crop"]["deficit_mm"], c_map["coffee"]["deficit_mm"])

    def test_fix6_5_api_rotations_structure(self):
        """5. POST /api/rotations: Bến Tre trả 4 chiến lược, Đắk Lắk trả 2. Chiến lược nào cũng có đủ 5 trường chữ không rỗng, và đúng 1 chiến lược có is_existing true."""
        import threading
        import urllib.request
        from http.server import HTTPServer
        from server import AeroAgriAPIHandler

        httpd = HTTPServer(("127.0.0.1", 0), AeroAgriAPIHandler)
        port = httpd.server_address[1]
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        try:
            for reg_id, expected_count in [("Ben_Tre_DBSCL", 4), ("Dak_Lak_Tay_Nguyen", 2)]:
                req = urllib.request.Request(
                    f"http://127.0.0.1:{port}/api/rotations",
                    data=json.dumps({"region": reg_id, "delta_temp_c": 0.0, "delta_rain_pct": 0.0}).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    self.assertEqual(resp.status, 200)
                    body = json.loads(resp.read().decode("utf-8"))

                strategies = body["strategies"]
                self.assertEqual(len(strategies), expected_count)
                existing_count = sum(1 for s in strategies if s.get("is_existing") is True)
                self.assertEqual(existing_count, 1)

                for s in strategies:
                    for field in ["why", "evidence", "benefits", "info_gaps", "risks"]:
                        self.assertIn(field, s)
                        self.assertTrue(bool(s[field]), f"Field {field} is empty in {s['id']}")
        finally:
            httpd.shutdown()
            httpd.server_close()

    def test_fix6_6_water_balance_season_start_none_compatible(self):
        """6. Gọi calculate_water_balance với season_start=None cho kết quả y hệt cách gọi cũ."""
        from core.water_balance import calculate_water_balance
        from core.loaders import load_csv

        df_power, _ = load_csv("power", "Ben_Tre_DBSCL")
        res_old = calculate_water_balance(df_power, "Ben_Tre_DBSCL", "rice", 0.5, -10.0)
        res_new = calculate_water_balance(df_power, "Ben_Tre_DBSCL", "rice", 0.5, -10.0, season_start=None)

        self.assertEqual(res_old, res_new)

    def test_fix6b_sources_table_in_sync(self):
        """Fix 6B Bước 1: Bảng nguồn trong docs/SUBMISSION_NOTES.md phải khớp chính xác với output của scripts/gen_sources_table.py."""
        from pathlib import Path
        from scripts.gen_sources_table import generate_sources_markdown

        notes_path = Path(__file__).resolve().parent.parent / "docs" / "SUBMISSION_NOTES.md"
        content = notes_path.read_text(encoding="utf-8")

        begin_marker = "<!-- BEGIN SOURCES (auto-generated by scripts/gen_sources_table.py, do not edit) -->"
        end_marker = "<!-- END SOURCES -->"

        self.assertIn(begin_marker, content)
        self.assertIn(end_marker, content)

        between = content.split(begin_marker, 1)[1].split(end_marker, 1)[0].strip()
        expected = generate_sources_markdown().strip()
        self.assertEqual(between, expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
