"""
Test HTTP microservice endpoints of jarvis_engine/server.py
"""

import urllib.request
import json
import time
import subprocess
import sys
import os

def test_server():
    print("Testing JARVIS HTTP Server...")
    # Start server as subprocess
    proc = subprocess.Popen([sys.executable, "jarvis_engine/server.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # Wait for server to come online
    for _ in range(15):
        time.sleep(0.5)
        try:
            with urllib.request.urlopen("http://127.0.0.1:3001/api/status", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            pass

    try:
        # Test 1: GET /api/status
        req = urllib.request.Request("http://127.0.0.1:3001/api/status")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            assert data["status"] == "ONLINE", f"Unexpected status: {data}"
            print("[OK] HTTP GET /api/status ->", data)

        # Test 2: GET /api/system_status
        req = urllib.request.Request("http://127.0.0.1:3001/api/system_status")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            assert "cpu_percent" in data, f"Missing cpu_percent: {data}"
            print(f"[OK] HTTP GET /api/system_status -> CPU: {data['cpu_percent']}%, RAM: {data['ram_percent']}%, Vol: {data['volume_percent']}%")

        # Test 3: POST /api/action (set volume to 50%)
        action_payload = json.dumps({
            "tool": "system_control",
            "args": {"action": "set_volume", "value": 50}
        }).encode("utf-8")
        req = urllib.request.Request("http://127.0.0.1:3001/api/action", data=action_payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            assert data.get("success") is True, f"Action execution failed: {data}"
            print("[OK] HTTP POST /api/action (set_volume) ->", data)

        print("HTTP SERVER ENDPOINTS VERIFIED SUCCESSFULLY!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except:
            proc.kill()

if __name__ == "__main__":
    test_server()

