"""
JARVIS Safety Manager
Enforces security guardrails, confirmation workflows for destructive/system actions,
and provides an emergency stop mechanism.
"""

import os
import secrets
import time
from typing import Dict, Any, Tuple, Optional

# Sensitive or destructive action categories
DANGEROUS_ACTIONS = {
    "shutdown": "Shut down the computer",
    "restart": "Restart the computer",
    "sleep": "Put the computer to sleep",
    "delete_file": "Permanently delete a file",
    "delete_folder": "Permanently delete a directory",
    "format": "Disk format operation",
    "kill_critical_process": "Terminate critical system process"
}

# Protected paths that should never be deleted or altered
PROTECTED_PATHS = [
    os.environ.get("SystemRoot", "C:\\Windows").lower(),
    os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "System32").lower(),
    os.environ.get("ProgramFiles", "C:\\Program Files").lower(),
    os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)").lower(),
]


class SafetyManager:
    def __init__(self):
        # Pending confirmations: token -> { action, params, expires_at }
        self._pending_confirmations: Dict[str, Dict[str, Any]] = {}
        self._emergency_halt = False

    def is_emergency_stopped(self) -> bool:
        return self._emergency_halt

    def trigger_emergency_stop(self) -> Dict[str, Any]:
        """Halts all background automation, active tasks, and clears pending requests."""
        self._emergency_halt = True
        self._pending_confirmations.clear()
        return {
            "status": "EMERGENCY_STOP_ACTIVE",
            "message": "Emergency stop triggered. All autonomous operations suspended."
        }

    def reset_emergency_stop(self) -> Dict[str, Any]:
        self._emergency_halt = False
        return {
            "status": "NORMAL",
            "message": "Emergency stop cleared. JARVIS operations resumed."
        }

    def check_safety(self, action: str, params: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates whether an action is safe to execute immediately.
        Returns: (is_allowed, confirmation_token, rejection_or_prompt_reason)
        """
        if self._emergency_halt and action != "reset_emergency":
            return False, None, "JARVIS is currently in EMERGENCY STOP state. Say 'resume operations' or click reset to continue."

        # Check path protection for file operations
        if action in ("delete_file", "delete_folder", "remove"):
            target_path = os.path.abspath(params.get("path", "")).lower()
            for protected in PROTECTED_PATHS:
                if target_path.startswith(protected):
                    return False, None, f"Access Denied: Protected system path '{target_path}' cannot be modified."

        # If action is dangerous, verify confirmation token
        if action in DANGEROUS_ACTIONS:
            provided_token = params.get("confirm_token")
            if provided_token and provided_token in self._pending_confirmations:
                pending = self._pending_confirmations[provided_token]
                if time.time() <= pending["expires_at"]:
                    # Valid token, consume and allow
                    del self._pending_confirmations[provided_token]
                    return True, None, None
                else:
                    del self._pending_confirmations[provided_token]
                    return False, None, "Confirmation token has expired. Please repeat the request."

            # Generate new confirmation request
            token = secrets.token_hex(4).upper()
            self._pending_confirmations[token] = {
                "action": action,
                "params": params,
                "expires_at": time.time() + 60.0  # 60s timeout
            }
            desc = DANGEROUS_ACTIONS[action]
            prompt = f"Confirmation required to {desc}. Please say 'confirm' or approve in interface."
            return False, token, prompt

        return True, None, None

    def approve_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validates and retrieves the pending action for a token."""
        token = token.strip().upper()
        if token in self._pending_confirmations:
            pending = self._pending_confirmations[token]
            if time.time() <= pending["expires_at"]:
                del self._pending_confirmations[token]
                return pending
            del self._pending_confirmations[token]
        return None

    def list_pending(self) -> Dict[str, Any]:
        now = time.time()
        # Clean expired
        expired = [k for k, v in self._pending_confirmations.items() if now > v["expires_at"]]
        for k in expired:
            del self._pending_confirmations[k]
        return self._pending_confirmations


safety = SafetyManager()

