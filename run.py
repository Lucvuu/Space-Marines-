# -*- coding: utf-8 -*-
"""
AERO-AGRI One-Command Runner
One command: check data status -> start the server on :8050 -> open the browser.
"""
import os
import sys
for s in (sys.stdout, sys.stderr):
    if hasattr(s, "reconfigure"):
        s.reconfigure(encoding="utf-8", errors="replace")
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
    print(f"[AERO-AGRI] Opening the browser at {url} ...")
    webbrowser.open(url)

def main():
    print("=" * 60)
    print("STARTING AERO-AGRI (NASA SPACE APPS 2026)")
    print("=" * 60)

    # 1. Check data status
    print("\n[STEP 1/2] Checking the status of available data sources:")
    check_all_data()

    # 2. Open the browser after 1.2 s in a background thread
    threading.Thread(target=open_browser, daemon=True).start()

    # 3. Start the server on port 8050
    port = 8050
    print(f"\n[STEP 2/2] Starting the HTTP server at http://127.0.0.1:{port}")
    print("Press Ctrl + C to stop the server.\n")
    server = create_server("127.0.0.1", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Shutting down the AERO-AGRI server...")
        server.server_close()

if __name__ == "__main__":
    main()

