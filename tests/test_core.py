# -*- coding: utf-8 -*-
"""
AERO-AGRI Comprehensive Test Suite (Regression & Step Verification)
"""
import os
import json
import unittest

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

if __name__ == "__main__":
    unittest.main(verbosity=2)
