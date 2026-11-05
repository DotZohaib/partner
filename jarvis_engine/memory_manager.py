"""
JARVIS Memory Manager
Handles persistent SQLite memory for preferences, user habits, command logs, and contextual knowledge.
"""

import sqlite3
import json
import os
import datetime
from typing import Dict, Any, List, Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "jarvis_memory.db")


class MemoryManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Preferences table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Action logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS action_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action TEXT NOT NULL,
                    params TEXT,
                    status TEXT NOT NULL,
                    result TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Frequent items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS frequent_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_type TEXT NOT NULL,
                    item_name TEXT NOT NULL,
                    count INTEGER DEFAULT 1,
                    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(item_type, item_name)
                )
            """)

            # Default initial preferences
            defaults = [
                ("user_title", "Sir", "general"),
                ("preferred_language", "English and Urdu", "language"),
                ("preferred_music_genre", "Romantic / Pop", "music"),
                ("default_browser", "Chrome", "system"),
                ("response_style", "Concise, respectful, composed", "persona")
            ]
            for key, val, cat in defaults:
                cursor.execute("""
                    INSERT OR IGNORE INTO preferences (key, value, category)
                    VALUES (?, ?, ?)
                """, (key, val, cat))
            conn.commit()

    def get_preference(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM preferences WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_preference(self, key: str, value: str, category: str = "general") -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO preferences (key, value, category, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    category = excluded.category,
                    updated_at = CURRENT_TIMESTAMP
            """, (key, str(value), category))
            conn.commit()
            return True

    def delete_preference(self, key: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM preferences WHERE key = ?", (key,))
            conn.commit()
            return cursor.rowcount > 0

    def list_preferences(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute("SELECT key, value, category, updated_at FROM preferences WHERE category = ? ORDER BY key", (category,))
            else:
                cursor.execute("SELECT key, value, category, updated_at FROM preferences ORDER BY category, key")
            return [dict(r) for r in cursor.fetchall()]

    def log_action(self, action: str, params: Any, status: str, result: Any) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            params_str = json.dumps(params) if not isinstance(params, str) else params
            result_str = json.dumps(result) if not isinstance(result, str) else result
            cursor.execute("""
                INSERT INTO action_logs (action, params, status, result)
                VALUES (?, ?, ?, ?)
            """, (action, params_str, status, result_str))
            conn.commit()
            return cursor.lastrowid

    def get_recent_actions(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, action, params, status, result, timestamp
                FROM action_logs
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def record_usage(self, item_type: str, item_name: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO frequent_items (item_type, item_name, count, last_used)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(item_type, item_name) DO UPDATE SET
                    count = count + 1,
                    last_used = CURRENT_TIMESTAMP
            """, (item_type, item_name))
            conn.commit()

    def get_top_items(self, item_type: str, limit: int = 5) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT item_name, count, last_used
                FROM frequent_items
                WHERE item_type = ?
                ORDER BY count DESC, last_used DESC
                LIMIT ?
            """, (item_type, limit))
            return [dict(r) for r in cursor.fetchall()]


# Global singleton instance
memory = MemoryManager()

