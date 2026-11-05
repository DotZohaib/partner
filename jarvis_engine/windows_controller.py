"""
JARVIS Windows Controller
Provides complete Windows PC automation:
- Application launcher & process management
- System volume control via pycaw
- Global media key controls (Play, Pause, Next, Prev, Stop)
- Window management (focus, minimize, maximize)
- Screenshot capture
- Clipboard read/write
- Battery, CPU, RAM, Disk hardware telemetry
- Power management (Lock, Sleep, Shutdown, Restart)
- Keyboard and mouse inputs
"""

import os
import sys
import time
import ctypes
import shutil
import subprocess
import datetime
from typing import Dict, Any, List, Optional
import psutil
import pyperclip

# Virtual Key Codes for Windows Media & System Events
VK_MEDIA_NEXT_TRACK = 0xB0
VK_MEDIA_PREV_TRACK = 0xB1
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF

# Try importing pycaw and pywin32 safely
try:
    from pycaw.pycaw import AudioUtilities
    import comtypes
    HAS_PYCAW = True
except Exception:
    HAS_PYCAW = False

def ensure_com():
    """Initializes COM for current thread if not already initialized."""
    try:
        import comtypes
        comtypes.CoInitialize()
    except Exception:
        pass

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    HAS_PYAUTOGUI = True
except Exception:
    HAS_PYAUTOGUI = False

try:
    import win32gui
    import win32con
    import win32process
    HAS_WIN32 = True
except Exception:
    HAS_WIN32 = False


def press_vk(vk_code: int):
    """Sends a single virtual key down and up event via Win32 API."""
    ctypes.windll.user32.keybd_event(vk_code, 0, 0, 0)
    time.sleep(0.05)
    ctypes.windll.user32.keybd_event(vk_code, 0, 2, 0)  # KEYEVENTF_KEYUP = 2


class WindowsController:
    # Common application mapping
    APP_ALIASES = {
        "chrome": ["chrome.exe", "google chrome"],
        "google chrome": ["chrome.exe"],
        "edge": ["msedge.exe", "microsoft edge"],
        "microsoft edge": ["msedge.exe"],
        "firefox": ["firefox.exe", "mozilla firefox"],
        "notepad": ["notepad.exe"],
        "calculator": ["calc.exe"],
        "calc": ["calc.exe"],
        "vs code": ["code.cmd", "code.exe"],
        "vscode": ["code.cmd", "code.exe"],
        "code": ["code.cmd", "code.exe"],
        "explorer": ["explorer.exe"],
        "file explorer": ["explorer.exe"],
        "files": ["explorer.exe"],
        "cmd": ["cmd.exe"],
        "terminal": ["wt.exe", "powershell.exe"],
        "powershell": ["powershell.exe"],
        "task manager": ["taskmgr.exe"],
        "taskmgr": ["taskmgr.exe"],
        "spotify": ["spotify.exe"],
        "settings": ["ms-settings:"],
        "word": ["winword.exe"],
        "excel": ["excel.exe"],
        "powerpoint": ["powerpnt.exe"],
        "paint": ["mspaint.exe"]
    }

    def __init__(self):
        pass

    # -------------------------------------------------------------
    # VOLUME & AUDIO CONTROLS
    # -------------------------------------------------------------
    def get_volume(self) -> Dict[str, Any]:
        """Returns current volume percentage (0-100) and mute status."""
        ensure_com()
        if HAS_PYCAW:
            try:
                speakers = AudioUtilities.GetSpeakers()
                if speakers:
                    vol_pct = round(speakers.volume_percent)
                    is_muted = bool(speakers.EndpointVolume.GetMute())
                    return {"volume": vol_pct, "muted": is_muted, "success": True}
            except Exception as e:
                pass
        return {"volume": 50, "muted": False, "success": False, "note": "pycaw unavailable"}

    def set_volume(self, target_percent: int) -> Dict[str, Any]:
        """Sets master volume to an exact percentage (0 to 100)."""
        ensure_com()
        target = max(0, min(100, int(target_percent)))
        if HAS_PYCAW:
            try:
                speakers = AudioUtilities.GetSpeakers()
                if speakers:
                    scalar = target / 100.0
                    speakers.EndpointVolume.SetMasterVolumeLevelScalar(scalar, None)
                    return {"volume": target, "success": True, "message": f"Volume set to {target}%"}
            except Exception as e:
                return {"error": str(e), "success": False}
        return {"error": "Volume control unavailable", "success": False}

    def change_volume_by(self, delta_percent: int) -> Dict[str, Any]:
        """Increases or decreases volume by delta."""
        current = self.get_volume().get("volume", 50)
        target = current + delta_percent
        return self.set_volume(target)

    def set_mute(self, mute: bool) -> Dict[str, Any]:
        """Mutes or unmutes master audio."""
        ensure_com()
        if HAS_PYCAW:
            try:
                speakers = AudioUtilities.GetSpeakers()
                if speakers:
                    speakers.EndpointVolume.SetMute(1 if mute else 0, None)
                    return {"muted": mute, "success": True, "message": "Muted" if mute else "Unmuted"}
            except Exception as e:
                return {"error": str(e), "success": False}
        # Fallback to key event
        press_vk(VK_VOLUME_MUTE)
        return {"success": True, "message": "Toggled mute via media key"}

    # -------------------------------------------------------------
    # MEDIA PLAYBACK CONTROLS
    # -------------------------------------------------------------
    def media_play_pause(self) -> Dict[str, Any]:
        """Global toggle for media play/pause."""
        press_vk(VK_MEDIA_PLAY_PAUSE)
        return {"action": "play_pause", "success": True, "message": "Play/Pause toggled."}

    def media_next(self) -> Dict[str, Any]:
        """Global skip to next media track."""
        press_vk(VK_MEDIA_NEXT_TRACK)
        return {"action": "next_track", "success": True, "message": "Skipped to next track."}

    def media_previous(self) -> Dict[str, Any]:
        """Global go to previous media track."""
        press_vk(VK_MEDIA_PREV_TRACK)
        return {"action": "prev_track", "success": True, "message": "Rewound to previous track."}

    def media_stop(self) -> Dict[str, Any]:
        """Global stop media playback."""
        press_vk(VK_MEDIA_STOP)
        return {"action": "stop", "success": True, "message": "Media playback stopped."}

    # -------------------------------------------------------------
    # APPLICATION MANAGEMENT
    # -------------------------------------------------------------
    def launch_app(self, app_name: str, args: Optional[str] = None) -> Dict[str, Any]:
        """Launches an application by friendly name or path."""
        norm = app_name.strip().lower()
        candidates = self.APP_ALIASES.get(norm, [app_name])

        for target in candidates:
            # Handle protocol or direct execution
            try:
                if target.startswith("ms-"):
                    os.startfile(target)
                    return {"app": app_name, "success": True, "message": f"Opened {app_name}"}

                # Try shutil.which
                full_path = shutil.which(target)
                if full_path:
                    cmd = [full_path] + ([args] if args else [])
                    subprocess.Popen(cmd, shell=False)
                    return {"app": app_name, "path": full_path, "success": True, "message": f"Launched {app_name}"}

                # Try os.startfile fallback
                os.startfile(target)
                return {"app": app_name, "success": True, "message": f"Launched {app_name}"}
            except Exception:
                continue

        # Final fallback: start via cmd
        try:
            cmd = f'start "" "{app_name}"'
            subprocess.Popen(cmd, shell=True)
            return {"app": app_name, "success": True, "message": f"Started {app_name}"}
        except Exception as e:
            return {"app": app_name, "success": False, "error": str(e)}

    def close_app(self, app_name: str) -> Dict[str, Any]:
        """Terminates processes matching app_name."""
        norm = app_name.strip().lower()
        targets = self.APP_ALIASES.get(norm, [app_name])
        target_names = [t.lower() for t in targets]
        if not any(t.endswith(".exe") for t in target_names):
            target_names.append(f"{norm}.exe")

        closed = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                p_name = proc.info['name'].lower()
                for t in target_names:
                    if t == p_name or (not t.endswith('.exe') and t in p_name):
                        proc.terminate()
                        closed.append(proc.info['name'])
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        if closed:
            return {"success": True, "message": f"Closed {len(closed)} instance(s) of {app_name}", "processes": closed}
        return {"success": False, "message": f"No active process found for '{app_name}'"}

    # -------------------------------------------------------------
    # WINDOW MANAGEMENT
    # -------------------------------------------------------------
    def list_windows(self) -> List[Dict[str, Any]]:
        """Lists active top-level visible desktop windows."""
        results = []
        if HAS_WIN32:
            def enum_proc(hwnd, _):
                if win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd).strip()
                    if title:
                        results.append({"hwnd": hwnd, "title": title})
            win32gui.EnumWindows(enum_proc, None)
        return results

    def focus_window(self, window_title_query: str) -> Dict[str, Any]:
        """Brings a window matching query into foreground."""
        query = window_title_query.lower()
        if HAS_WIN32:
            windows = self.list_windows()
            for w in windows:
                if query in w["title"].lower():
                    hwnd = w["hwnd"]
                    try:
                        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                        win32gui.SetForegroundWindow(hwnd)
                        return {"success": True, "title": w["title"], "message": f"Switched to {w['title']}"}
                    except Exception as e:
                        return {"success": False, "error": str(e)}
        return {"success": False, "message": f"Window matching '{window_title_query}' not found."}

    def minimize_window(self, window_title_query: Optional[str] = None) -> Dict[str, Any]:
        """Minimizes specified window or active window."""
        if HAS_WIN32:
            if window_title_query:
                for w in self.list_windows():
                    if window_title_query.lower() in w["title"].lower():
                        win32gui.ShowWindow(w["hwnd"], win32con.SW_MINIMIZE)
                        return {"success": True, "message": f"Minimized {w['title']}"}
            else:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
                    return {"success": True, "message": "Minimized active window"}
        return {"success": False, "message": "Window not found or win32 unavailable."}

    def maximize_window(self, window_title_query: Optional[str] = None) -> Dict[str, Any]:
        """Maximizes specified window or active window."""
        if HAS_WIN32:
            if window_title_query:
                for w in self.list_windows():
                    if window_title_query.lower() in w["title"].lower():
                        win32gui.ShowWindow(w["hwnd"], win32con.SW_MAXIMIZE)
                        return {"success": True, "message": f"Maximized {w['title']}"}
            else:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
                    return {"success": True, "message": "Maximized active window"}
        return {"success": False, "message": "Window not found or win32 unavailable."}

    # -------------------------------------------------------------
    # SYSTEM TELEMETRY & STATUS
    # -------------------------------------------------------------
    def get_system_status(self) -> Dict[str, Any]:
        """Returns CPU, RAM, Battery, and Disk usage."""
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory()
        sys_drive = os.environ.get("SystemDrive", "C:") + "\\"
        try:
            disk = psutil.disk_usage(sys_drive)
        except Exception:
            disk = psutil.disk_usage(os.path.abspath(os.sep))
        battery = psutil.sensors_battery()

        vol = self.get_volume()

        return {
            "cpu_percent": cpu,
            "ram_percent": ram.percent,
            "ram_used_gb": round((ram.total - ram.available) / (1024**3), 2),
            "ram_total_gb": round(ram.total / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 1),
            "disk_percent": disk.percent,
            "battery_percent": battery.percent if battery else None,
            "power_plugged": battery.power_plugged if battery else True,
            "volume_percent": vol.get("volume", 50),
            "is_muted": vol.get("muted", False),
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    # -------------------------------------------------------------
    # SCREENSHOT & CLIPBOARD
    # -------------------------------------------------------------
    def take_screenshot(self, save_dir: Optional[str] = None) -> Dict[str, Any]:
        """Captures a full desktop screenshot and saves to file."""
        if not HAS_PYAUTOGUI:
            return {"success": False, "error": "PyAutoGUI not installed"}

        target_dir = save_dir or os.path.join(os.path.expanduser("~"), "Pictures", "Jarvis_Screenshots")
        os.makedirs(target_dir, exist_ok=True)
        filename = f"screenshot_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(target_dir, filename)

        try:
            img = pyautogui.screenshot()
            img.save(filepath)
            return {"success": True, "path": filepath, "message": f"Screenshot saved to {filepath}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_clipboard(self) -> Dict[str, Any]:
        """Retrieves text from clipboard."""
        try:
            text = pyperclip.paste()
            return {"success": True, "content": text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def set_clipboard(self, text: str) -> Dict[str, Any]:
        """Copies text to clipboard."""
        try:
            pyperclip.copy(text)
            return {"success": True, "message": "Text copied to clipboard"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -------------------------------------------------------------
    # KEYBOARD & MOUSE AUTOMATION
    # -------------------------------------------------------------
    def type_text(self, text: str) -> Dict[str, Any]:
        """Types text safely, utilizing clipboard paste for Unicode/Urdu support."""
        if not HAS_PYAUTOGUI:
            return {"success": False, "error": "PyAutoGUI not available"}
        try:
            # Preserving previous clipboard
            old_clip = pyperclip.paste()
            pyperclip.copy(text)
            pyautogui.hotkey('ctrl', 'v')
            time.sleep(0.1)
            pyperclip.copy(old_clip)
            return {"success": True, "message": f"Typed '{text}'"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def press_hotkey(self, keys: List[str]) -> Dict[str, Any]:
        """Presses a keyboard combination, e.g. ['ctrl', 'c'] or ['alt', 'tab']."""
        if not HAS_PYAUTOGUI:
            return {"success": False, "error": "PyAutoGUI not available"}
        try:
            pyautogui.hotkey(*keys)
            return {"success": True, "message": f"Pressed hotkey: {' + '.join(keys)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def mouse_click(self, x: Optional[int] = None, y: Optional[int] = None, double: bool = False, right: bool = False) -> Dict[str, Any]:
        """Performs a mouse click at current or specified coordinates."""
        if not HAS_PYAUTOGUI:
            return {"success": False, "error": "PyAutoGUI not available"}
        try:
            btn = 'right' if right else 'left'
            clicks = 2 if double else 1
            if x is not None and y is not None:
                pyautogui.click(x=x, y=y, clicks=clicks, button=btn)
            else:
                pyautogui.click(clicks=clicks, button=btn)
            return {"success": True, "message": f"Clicked {'right' if right else 'left'} button"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def scroll(self, amount: int = -500) -> Dict[str, Any]:
        """Scrolls vertically (negative = down, positive = up)."""
        if not HAS_PYAUTOGUI:
            return {"success": False, "error": "PyAutoGUI not available"}
        try:
            pyautogui.scroll(amount)
            return {"success": True, "message": f"Scrolled {'down' if amount < 0 else 'up'}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -------------------------------------------------------------
    # POWER CONTROLS (Protected)
    # -------------------------------------------------------------
    def lock_pc(self) -> Dict[str, Any]:
        """Locks the Windows computer."""
        try:
            ctypes.windll.user32.LockWorkStation()
            return {"success": True, "message": "Computer locked."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def sleep_pc(self) -> Dict[str, Any]:
        """Puts computer to sleep."""
        try:
            os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
            return {"success": True, "message": "Entering sleep mode."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def shutdown_pc(self, restart: bool = False) -> Dict[str, Any]:
        """Initiates system shutdown or restart (15s abort timer)."""
        flag = "/r" if restart else "/s"
        try:
            subprocess.run(f"shutdown {flag} /t 15", shell=True, check=True)
            action_name = "Restart" if restart else "Shutdown"
            return {"success": True, "message": f"{action_name} initiated. Abort with 'shutdown /a' if needed."}
        except Exception as e:
            return {"success": False, "error": str(e)}


windows = WindowsController()
