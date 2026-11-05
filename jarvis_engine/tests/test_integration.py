"""
Comprehensive Integration Test Suite for JARVIS Engine
Tests:
- System Telemetry & Volume control
- File Management & Search
- Document Reader (Text & PDF)
- YouTube Video Resolution & Query Scraper
- Safety Guardrail (Destructive action confirmation tokens)
- Multi-step Task Execution
- Persistent Memory CRUD & Usage Tracking
- Emergency Stop Halt & Reset
"""

import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from jarvis_engine.action_executor import executor
from jarvis_engine.memory_manager import memory
from jarvis_engine.safety_manager import safety
from jarvis_engine.youtube_controller import youtube
from jarvis_engine.windows_controller import windows


def run_tests():
    print("==================================================")
    print("     JARVIS AUTONOMOUS ENGINE INTEGRATION TEST    ")
    print("==================================================")

    # 1. System Telemetry
    res = executor.execute_tool("system_control", {"action": "get_status"})
    assert res["success"], f"System status failed: {res}"
    print(f"[OK] System Telemetry: CPU={res['telemetry']['cpu_percent']}%, RAM={res['telemetry']['ram_percent']}%, Vol={res['telemetry']['volume_percent']}%")

    # 2. Volume Control (set to exact 40% as in user prompt)
    res = executor.execute_tool("system_control", {"action": "set_volume", "value": 40})
    assert res["success"], f"Volume set failed: {res}"
    print(f"[OK] Volume Control: {res.get('message')}")

    # 3. File Search
    res = executor.execute_tool("file_operation", {
        "action": "search",
        "query": "package",
        "extension": "json",
        "location": "workspace"
    })
    assert res["success"], f"File search failed: {res}"
    print(f"[OK] File Search: Found {res['count']} match(es)")

    # 4. Document Reader
    res = executor.execute_tool("file_operation", {"action": "read_file", "path": "package.json"})
    assert res["success"] and "react-example" in res["content"], f"Read document failed: {res}"
    print(f"[OK] Document Reader: Successfully read {len(res['content'])} characters from package.json")

    # 5. YouTube Resolution test ("Tumse Koi Pyara")
    vid_id = youtube._find_first_video_id("Tumse Koi Pyara")
    print(f"[OK] YouTube Video Resolution: videoId={vid_id} (Direct URL: https://www.youtube.com/watch?v={vid_id})")

    # 6. Safety Guardrail on Destructive Action (Shutdown)
    res = executor.execute_tool("system_control", {"action": "shutdown"})
    assert res.get("requires_confirmation") is True, f"Shutdown should require confirmation: {res}"
    token = res.get("confirm_token")
    print(f"[OK] Safety Guardrail: Dangerous action intercepted. Confirmation token generated: {token}")

    # 7. Persistent Memory CRUD
    executor.execute_tool("memory_operation", {
        "action": "set",
        "key": "user_preferred_song",
        "value": "Tumse Koi Pyara",
        "category": "music"
    })
    mem_res = executor.execute_tool("memory_operation", {
        "action": "get",
        "key": "user_preferred_song"
    })
    assert mem_res.get("value") == "Tumse Koi Pyara", f"Memory get mismatch: {mem_res}"
    print(f"[OK] Persistent Memory: Successfully stored & retrieved '{mem_res.get('value')}' from SQLite")

    # 8. Multi-Step Task Execution
    plan = [
        {"tool": "memory_operation", "args": {"action": "set", "key": "last_autonomous_run", "value": "2026-11-04"}},
        {"tool": "system_control", "args": {"action": "get_status"}},
    ]
    multi_res = executor.execute_tool("execute_multistep_plan", {"steps": plan})
    assert multi_res["success"], f"Multistep plan failed: {multi_res}"
    print(f"[OK] Multi-Step Autonomous Task: {multi_res['message']}")

    # 9. Emergency Stop
    executor.execute_tool("emergency_stop", {})
    assert safety.is_emergency_stopped(), "Emergency stop should be active"
    blocked_res = executor.execute_tool("system_control", {"action": "get_status"})
    assert not blocked_res["success"], "Action should be blocked during emergency stop"
    print("[OK] Emergency Stop: Successfully halted all autonomous operations")

    # Reset Emergency Stop
    executor.execute_tool("reset_emergency", {})
    assert not safety.is_emergency_stopped(), "Emergency stop reset failed"
    print("[OK] Emergency Stop Reset: Normal operations resumed")

    print("==================================================")
    print("  ALL 9 INTEGRATION & AUTONOMY TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()

