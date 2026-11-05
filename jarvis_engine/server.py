"""
JARVIS Engine HTTP Daemon Server
Runs on http://127.0.0.1:3001
Provides REST API endpoints for Node.js server.ts and frontend UI:
- POST /api/action: Executes an automation tool or multi-step plan
- GET  /api/system_status: Real-time CPU, RAM, Battery, Volume telemetry
- GET  /api/memory/preferences: Returns saved user preferences
- POST /api/memory/preferences: Sets or updates preference
- DELETE /api/memory/preferences: Removes a preference
- GET  /api/history: Returns recent executed actions log
- POST /api/emergency_stop: Immediately triggers emergency halt
- POST /api/reset_emergency: Clears emergency stop
"""

import sys
import os
import json
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any

# Ensure parent directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from jarvis_engine.action_executor import executor
from jarvis_engine.windows_controller import windows
from jarvis_engine.memory_manager import memory
from jarvis_engine.safety_manager import safety

PORT = 3001


class JarvisRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json_response(self, status_code: int, data: Dict[str, Any]):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        body = json.dumps(data).encode("utf-8")
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/status" or path == "/":
            self._send_json_response(200, {
                "status": "ONLINE",
                "service": "JARVIS Automation Engine",
                "emergency_stopped": safety.is_emergency_stopped()
            })
            return

        elif path == "/api/system_status":
            telemetry = windows.get_system_status()
            telemetry["emergency_stopped"] = safety.is_emergency_stopped()
            self._send_json_response(200, telemetry)
            return

        elif path == "/api/memory/preferences":
            cat = query.get("category", [None])[0]
            prefs = memory.list_preferences(category=cat)
            self._send_json_response(200, {"success": True, "preferences": prefs})
            return

        elif path == "/api/history":
            try:
                limit = int(query.get("limit", [20])[0])
            except (ValueError, TypeError):
                limit = 20
            logs = memory.get_recent_actions(limit=limit)
            self._send_json_response(200, {"success": True, "actions": logs})
            return

        elif path == "/api/safety/pending":
            pending = safety.list_pending()
            self._send_json_response(200, {"success": True, "pending": pending})
            return

        self._send_json_response(404, {"error": "Endpoint not found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            body = json.loads(post_data) if post_data else {}
        except Exception:
            self._send_json_response(400, {"error": "Invalid JSON payload"})
            return

        if path == "/api/action":
            tool_name = body.get("tool") or body.get("action")
            args = body.get("args") or body.get("params") or {}
            if not tool_name:
                self._send_json_response(400, {"error": "Missing 'tool' parameter"})
                return

            res = executor.execute_tool(tool_name, args)
            self._send_json_response(200, res)
            return

        elif path == "/api/emergency_stop":
            res = executor.execute_tool("emergency_stop", {})
            self._send_json_response(200, res)
            return

        elif path == "/api/reset_emergency":
            res = executor.execute_tool("reset_emergency", {})
            self._send_json_response(200, res)
            return

        elif path == "/api/memory/preferences":
            key = body.get("key")
            val = body.get("value")
            cat = body.get("category", "general")
            if not key:
                self._send_json_response(400, {"error": "Missing 'key' parameter"})
                return
            memory.set_preference(key, str(val), category=cat)
            self._send_json_response(200, {"success": True, "key": key, "value": val})
            return

        elif path == "/api/safety/confirm":
            token = body.get("token", "")
            pending = safety.approve_token(token)
            if pending:
                res = executor.execute_tool(pending["action"], pending["params"])
                self._send_json_response(200, {"success": True, "approved": True, "result": res})
            else:
                self._send_json_response(400, {"success": False, "error": "Invalid or expired confirmation token"})
            return

        self._send_json_response(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/memory/preferences":
            key = query.get("key", [""])[0]
            if not key:
                self._send_json_response(400, {"error": "Missing 'key' query parameter"})
                return
            deleted = memory.delete_preference(key)
            self._send_json_response(200, {"success": deleted, "key": key})
            return

        self._send_json_response(404, {"error": "Endpoint not found"})

    def log_message(self, format, *args):
        # Mute normal HTTP logging for clean terminal
        pass


def run_engine_server():
    server_address = ("127.0.0.1", PORT)
    httpd = ThreadingHTTPServer(server_address, JarvisRequestHandler)
    print(f"JARVIS Python Action Engine listening on http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down JARVIS Python Engine.")
        httpd.server_close()


if __name__ == "__main__":
    run_engine_server()

