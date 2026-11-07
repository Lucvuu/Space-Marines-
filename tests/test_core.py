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


if __name__ == "__main__":
    unittest.main(verbosity=2)
