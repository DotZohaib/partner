"""
JARVIS Action Execution Engine
Central interpretation and dispatch engine for single and multi-step autonomous tasks.
Enforces safety validation, verifies execution outcomes, records action history,
and coordinates YouTube, Windows, Browser, File, and System automation.
"""

import time
import json
from typing import Dict, Any, List, Optional
from .windows_controller import windows
from .youtube_controller import youtube
from .browser_controller import browser
from .file_manager import file_manager
from .memory_manager import memory
from .safety_manager import safety


class ActionExecutor:
    def __init__(self):
        pass

    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a tool call, validating safety guardrails, verifying outcomes,
        and logging execution history.
        """
        # Check emergency halt state
        if safety.is_emergency_stopped() and tool_name not in ("emergency_stop", "reset_emergency"):
            return {
                "success": False,
                "action": tool_name,
                "error": "Emergency stop is active. Operations halted."
            }

        start_time = time.time()
        result: Dict[str, Any] = {}

        try:
            # 1. YouTube & Media Controller Tools
            if tool_name == "play_youtube":
                query = args.get("query", "")
                cat = args.get("category", "music")
                result = youtube.play(query, category=cat)

            elif tool_name == "play_artist":
                artist = args.get("artist", "")
                result = youtube.play_artist(artist)

            elif tool_name == "play_playlist":
                name = args.get("playlist_name", "")
                result = youtube.play_playlist(name)

            elif tool_name == "media_control":
                action = args.get("action", "").lower()
                val = args.get("value")
                if action in ("pause", "toggle"):
                    result = youtube.pause()
                elif action == "resume":
                    result = youtube.resume()
                elif action == "stop":
                    result = youtube.stop()
                elif action in ("next", "skip"):
                    result = youtube.next_song()
                elif action in ("prev", "previous"):
                    result = youtube.previous_song()
                elif action == "fullscreen":
                    result = youtube.toggle_fullscreen()
                elif action == "volume_set" and val is not None:
                    result = windows.set_volume(int(val))
                elif action == "volume_up":
                    result = windows.change_volume_by(int(val or 10))
                elif action == "volume_down":
                    result = windows.change_volume_by(-int(val or 10))
                elif action == "mute":
                    result = windows.set_mute(True)
                elif action == "unmute":
                    result = windows.set_mute(False)
                else:
                    result = {"success": False, "error": f"Unknown media action '{action}'"}

            elif tool_name == "search_movie":
                title = args.get("title", "")
                platform = args.get("platform")
                result = youtube.search_movie(title, platform=platform)

            # 2. Windows Application & System Tools
            elif tool_name == "launch_application":
                app_name = args.get("app_name", "")
                launch_args = args.get("args")
                result = windows.launch_app(app_name, launch_args)

            elif tool_name == "close_application":
                app_name = args.get("app_name", "")
                result = windows.close_app(app_name)

            elif tool_name == "manage_window":
                action = args.get("action", "focus")
                title = args.get("window_title")
                if action == "focus":
                    result = windows.focus_window(title or "")
                elif action == "minimize":
                    result = windows.minimize_window(title)
                elif action == "maximize":
                    result = windows.maximize_window(title)
                elif action == "list":
                    wins = windows.list_windows()
                    result = {"success": True, "windows": wins, "count": len(wins)}
                else:
                    result = {"success": False, "error": f"Unknown window action '{action}'"}

            elif tool_name == "system_control":
                action = args.get("action", "")
                val = args.get("value")

                # Safety check for power events
                if action in ("shutdown", "restart", "sleep"):
                    allowed, token, prompt = safety.check_safety(action, args)
                    if not allowed:
                        return {
                            "success": False,
                            "requires_confirmation": True,
                            "confirm_token": token,
                            "message": prompt,
                            "action": action
                        }

                if action == "set_volume":
                    result = windows.set_volume(int(val or 50))
                elif action == "volume_up":
                    result = windows.change_volume_by(int(val or 10))
                elif action == "volume_down":
                    result = windows.change_volume_by(-int(val or 10))
                elif action == "mute":
                    result = windows.set_mute(True)
                elif action == "unmute":
                    result = windows.set_mute(False)
                elif action == "screenshot":
                    result = windows.take_screenshot()
                elif action == "get_status":
                    status = windows.get_system_status()
                    result = {"success": True, "telemetry": status, "message": "System status retrieved"}
                elif action == "lock":
                    result = windows.lock_pc()
                elif action == "sleep":
                    result = windows.sleep_pc()
                elif action == "shutdown":
                    result = windows.shutdown_pc(restart=False)
                elif action == "restart":
                    result = windows.shutdown_pc(restart=True)
                else:
                    result = {"success": False, "error": f"Unknown system action '{action}'"}

            # 3. File Operations
            elif tool_name == "file_operation":
                action = args.get("action", "search")
                if action == "search":
                    query = args.get("query", "")
                    ext = args.get("extension")
                    loc = args.get("location")
                    max_res = int(args.get("max_results", 10))
                    result = file_manager.search_files(query, extension=ext, location=loc, max_results=max_res)
                elif action == "open":
                    target = args.get("target") or args.get("path", "")
                    result = file_manager.open_path(target)
                elif action == "create_folder":
                    folder = args.get("path") or args.get("folder_name", "")
                    result = file_manager.create_folder(folder)
                elif action == "rename":
                    old_path = args.get("source") or args.get("old_path", "")
                    new_name = args.get("new_name", "")
                    result = file_manager.rename_file(old_path, new_name)
                elif action == "move":
                    src = args.get("source", "")
                    dst = args.get("destination", "")
                    result = file_manager.move_file(src, dst)
                elif action == "copy":
                    src = args.get("source", "")
                    dst = args.get("destination", "")
                    result = file_manager.copy_file(src, dst)
                elif action == "organize_downloads":
                    result = file_manager.organize_downloads()
                elif action == "read_file":
                    path = args.get("path") or args.get("target", "")
                    result = file_manager.read_document(path)
                else:
                    result = {"success": False, "error": f"Unknown file action '{action}'"}

            # 4. Keyboard & Mouse Actions
            elif tool_name == "desktop_action":
                action = args.get("action", "")
                if action == "type":
                    text = args.get("text", "")
                    result = windows.type_text(text)
                elif action == "press_keys":
                    keys = args.get("keys", [])
                    if isinstance(keys, str):
                        keys = [k.strip() for k in keys.split("+")]
                    result = windows.press_hotkey(keys)
                elif action == "click":
                    x = args.get("x")
                    y = args.get("y")
                    dbl = bool(args.get("double", False))
                    rt = bool(args.get("right", False))
                    result = windows.mouse_click(x=x, y=y, double=dbl, right=rt)
                elif action == "scroll":
                    amt = int(args.get("amount", -500))
                    result = windows.scroll(amt)
                elif action == "get_clipboard":
                    result = windows.get_clipboard()
                elif action == "set_clipboard":
                    text = args.get("text", "")
                    result = windows.set_clipboard(text)
                else:
                    result = {"success": False, "error": f"Unknown desktop action '{action}'"}

            # 5. Browser Navigation
            elif tool_name == "browser_action":
                action = args.get("action", "open_site")
                if action == "open_url":
                    result = browser.open_url(args.get("url", ""))
                elif action == "open_site":
                    result = browser.open_website(args.get("site", ""))
                elif action == "search":
                    result = browser.search_web(args.get("query", ""))
                else:
                    result = {"success": False, "error": f"Unknown browser action '{action}'"}

            # 6. Persistent Memory Operations
            elif tool_name == "memory_operation":
                action = args.get("action", "get")
                key = args.get("key", "")
                val = args.get("value")
                cat = args.get("category", "general")
                if action == "get":
                    val_found = memory.get_preference(key)
                    result = {"success": True, "key": key, "value": val_found}
                elif action == "set":
                    memory.set_preference(key, str(val), category=cat)
                    result = {"success": True, "key": key, "value": val, "message": f"Saved preference '{key}'"}
                elif action == "delete":
                    deleted = memory.delete_preference(key)
                    result = {"success": deleted, "key": key, "message": "Deleted preference" if deleted else "Key not found"}
                elif action == "list":
                    prefs = memory.list_preferences(category=cat if cat != "general" else None)
                    result = {"success": True, "preferences": prefs}
                else:
                    result = {"success": False, "error": f"Unknown memory action '{action}'"}

            # 7. Multi-Step Task Coordinator
            elif tool_name == "execute_multistep_plan":
                steps = args.get("steps", [])
                result = self.execute_multistep_task(steps)

            # 8. Emergency Controls
            elif tool_name == "emergency_stop":
                result = safety.trigger_emergency_stop()
                youtube.pause()

            elif tool_name == "reset_emergency":
                result = safety.reset_emergency_stop()

            else:
                result = {"success": False, "error": f"Tool '{tool_name}' not implemented"}

        except Exception as e:
            result = {"success": False, "error": str(e)}

        duration_ms = round((time.time() - start_time) * 1000, 1)
        result["duration_ms"] = duration_ms
        result["action"] = tool_name

        # Log action to SQLite
        status_str = "SUCCESS" if result.get("success", False) else "FAILED"
        memory.log_action(tool_name, args, status_str, result)

        return result

    def execute_multistep_task(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Executes an array of sequential steps with status tracking and error handling.
        Example step: { "tool": "launch_application", "args": { "app_name": "Chrome" } }
        """
        completed = []
        failed_step = None

        for idx, step in enumerate(steps):
            if safety.is_emergency_stopped():
                return {
                    "success": False,
                    "completed_steps": completed,
                    "error": "Task execution halted by Emergency Stop."
                }

            tool = step.get("tool") or step.get("action")
            args = step.get("args") or {}

            step_res = self.execute_tool(tool, args)
            completed.append({
                "step_index": idx + 1,
                "tool": tool,
                "result": step_res
            })

            # Small pacing pause between physical automation steps
            time.sleep(0.35)

            if not step_res.get("success", False):
                failed_step = {
                    "step_index": idx + 1,
                    "tool": tool,
                    "error": step_res.get("error", "Step failed")
                }
                break

        overall_success = failed_step is None
        return {
            "success": overall_success,
            "total_steps": len(steps),
            "executed_count": len(completed),
            "steps": completed,
            "failed_step": failed_step,
            "message": f"Completed {len(completed)} of {len(steps)} steps successfully." if overall_success else f"Failed at step {failed_step['step_index']}: {failed_step['error']}"
        }


executor = ActionExecutor()

