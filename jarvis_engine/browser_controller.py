"""
JARVIS Browser Controller
Handles browser navigation, web search, URL launching, and website automation.
"""

import webbrowser
import urllib.parse
from typing import Dict, Any, Optional
from .memory_manager import memory


class BrowserController:
    COMMON_SITES = {
        "google": "https://www.google.com",
        "youtube": "https://www.youtube.com",
        "github": "https://www.github.com",
        "chatgpt": "https://chatgpt.com",
        "gmail": "https://mail.google.com",
        "twitter": "https://www.twitter.com",
        "x": "https://www.x.com",
        "reddit": "https://www.reddit.com",
        "linkedin": "https://www.linkedin.com",
        "wikipedia": "https://www.wikipedia.org",
        "facebook": "https://www.facebook.com",
        "instagram": "https://www.instagram.com",
        "netflix": "https://www.netflix.com",
        "amazon": "https://www.amazon.com",
        "whatsapp": "https://web.whatsapp.com"
    }

    def __init__(self):
        pass

    def open_url(self, url: str) -> Dict[str, Any]:
        """Opens any arbitrary URL in the default browser."""
        target = url.strip()
        if not target.startswith("http://") and not target.startswith("https://"):
            target = f"https://{target}"
        try:
            webbrowser.open(target)
            return {"success": True, "url": target, "message": f"Opened {target}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_website(self, site_name: str) -> Dict[str, Any]:
        """Opens a well-known site or resolves name."""
        norm = site_name.strip().lower()
        memory.record_usage("website", norm)

        if norm in self.COMMON_SITES:
            return self.open_url(self.COMMON_SITES[norm])

        # If it looks like a domain name (e.g. example.com)
        if "." in norm and not " " in norm:
            return self.open_url(norm)

        # Fallback to Google search
        return self.search_web(site_name)

    def search_web(self, query: str) -> Dict[str, Any]:
        """Searches Google for the given query."""
        clean = query.strip()
        search_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(clean)}"
        try:
            webbrowser.open(search_url)
            return {"success": True, "query": clean, "url": search_url, "message": f"Searching Google for '{clean}'"}
        except Exception as e:
            return {"success": False, "error": str(e)}


browser = BrowserController()

