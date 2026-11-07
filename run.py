# -*- coding: utf-8 -*-
"""
AERO-AGRI One-Command Runner
1 lệnh duy nhất: kiểm tra trạng thái data -> start server :8050 -> mở trình duyệt.
"""
import os
import sys
import time
import threading
import webbrowser

AERO_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AERO_ROOT)

from scripts.check_data import check_all_data
from server import create_server

def open_browser():
    time.sleep(1.2)
    url = "http://127.0.0.1:8050"
    print(f"[AERO-AGRI] Đang tự động mở trình duyệt tới {url} ...")
    webbrowser.open(url)

def main():
    print("=" * 60)
    print("🚀 KHỞI ĐỘNG HỆ THỐNG AERO-AGRI (NASA SPACE APPS 2026)")
    print("=" * 60)

    # 1. Kiểm tra trạng thái dữ liệu
    print("\n[BƯỚC 1/2] Kiểm tra trạng thái nguồn dữ liệu hiện có:")
    check_all_data()

    # 2. Mở trình duyệt sau 1.2s trong luồng nền
    threading.Thread(target=open_browser, daemon=True).start()

    # 3. Khởi động máy chủ cổng 8050
    port = 8050
    print(f"\n[BƯỚC 2/2] Khởi động máy chủ HTTP tại http://127.0.0.1:{port}")
    print("Nhấn Ctrl + C để dừng máy chủ.\n")
    server = create_server("127.0.0.1", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Đang tắt máy chủ AERO-AGRI...")
        server.server_close()

if __name__ == "__main__":
    main()

