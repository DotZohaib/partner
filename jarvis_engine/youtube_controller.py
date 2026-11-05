"""
JARVIS YouTube & Media Controller
Handles complete YouTube music & video automation:
- Play song by name or artist
- Search movies and videos
- Autoplay first relevant result or playlist
- Global playback controls (Play, Pause, Resume, Stop, Next, Prev)
- Volume adjustments
- Fullscreen toggling
- Streaming services search (Netflix, Prime, Disney+, etc.)
"""

import re
import urllib.request
import urllib.parse
import webbrowser
import time
from typing import Dict, Any, Optional
from .windows_controller import windows, press_vk, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PREV_TRACK, VK_MEDIA_STOP
from .memory_manager import memory

class YouTubeController:
    STREAMING_PLATFORMS = {
        "netflix": "https://www.netflix.com/search?q=",
        "prime": "https://www.amazon.com/s?k=",
        "amazon prime": "https://www.amazon.com/s?k=",
        "disney": "https://www.disneyplus.com/search?q=",
        "disney plus": "https://www.disneyplus.com/search?q=",
        "hulu": "https://www.hulu.com/search?q=",
        "youtube movies": "https://www.youtube.com/results?search_query="
    }

    def __init__(self):
        pass

    def _find_first_video_id(self, query: str) -> Optional[str]:
        """Scrapes the first valid YouTube video ID matching query."""
        search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"
        req = urllib.request.Request(
            search_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        )
        try:
            with urllib.request.urlopen(req, timeout=4.5) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
                # Look for videoId patterns
                video_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                if video_ids:
                    # Return first unique video ID
                    for vid in video_ids:
                        if len(vid) == 11 and vid not in ("dQw4w9WgXcQ",):
                            return vid
        except Exception:
            pass
        return None

    def play(self, query: str, category: str = "music") -> Dict[str, Any]:
        """
        Searches YouTube for query, finds top matching video, and opens it directly with autoplay.
        Falls back to search results page if scraping times out.
        """
        clean_query = query.strip()
        memory.record_usage("music" if category == "music" else "video", clean_query)

        vid_id = self._find_first_video_id(clean_query)
        if vid_id:
            target_url = f"https://www.youtube.com/watch?v={vid_id}&autoplay=1"
            webbrowser.open(target_url)
            return {
                "success": True,
                "query": clean_query,
                "video_id": vid_id,
                "url": target_url,
                "message": f"Playing '{clean_query}' on YouTube"
            }
        else:
            # Fallback directly to search results
            search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(clean_query)}"
            webbrowser.open(search_url)
            return {
                "success": True,
                "query": clean_query,
                "url": search_url,
                "message": f"Opened YouTube search for '{clean_query}'"
            }

    def play_artist(self, artist: str) -> Dict[str, Any]:
        """Plays songs or playlist by specified artist."""
        query = f"{artist} songs playlist"
        return self.play(query, category="music")

    def play_random(self, genre: Optional[str] = None) -> Dict[str, Any]:
        """Plays a popular or random track based on genre or user preference."""
        fav_genre = genre or memory.get_preference("preferred_music_genre", "romantic pop songs")
        query = f"top {fav_genre} mix"
        return self.play(query, category="music")

    def play_playlist(self, playlist_name: str) -> Dict[str, Any]:
        """Searches and opens a playlist."""
        query = f"{playlist_name} full playlist"
        return self.play(query, category="music")

    # -------------------------------------------------------------
    # PLAYBACK CONTROLS
    # -------------------------------------------------------------
    def pause(self) -> Dict[str, Any]:
        """Pauses currently playing media."""
        return windows.media_play_pause()

    def resume(self) -> Dict[str, Any]:
        """Resumes media playback."""
        return windows.media_play_pause()

    def stop(self) -> Dict[str, Any]:
        """Stops media playback."""
        return windows.media_stop()

    def next_song(self) -> Dict[str, Any]:
        """Skips to next track."""
        return windows.media_next()

    def previous_song(self) -> Dict[str, Any]:
        """Returns to previous track."""
        return windows.media_previous()

    def toggle_fullscreen(self) -> Dict[str, Any]:
        """Toggles fullscreen mode (presses 'f' key)."""
        return windows.press_hotkey(["f"])

    # -------------------------------------------------------------
    # MOVIE & STREAMING SEARCH
    # -------------------------------------------------------------
    def search_movie(self, title: str, platform: Optional[str] = None) -> Dict[str, Any]:
        """Searches for movies/shows on YouTube or requested streaming service."""
        clean_title = title.strip()
        plat = (platform or "").lower()

        if plat in self.STREAMING_PLATFORMS:
            base_url = self.STREAMING_PLATFORMS[plat]
            full_url = f"{base_url}{urllib.parse.quote_plus(clean_title)}"
            webbrowser.open(full_url)
            return {
                "success": True,
                "title": clean_title,
                "platform": plat,
                "url": full_url,
                "message": f"Searching for '{clean_title}' on {plat.title()}"
            }

        # Default to YouTube Movies / full movie search
        return self.play(f"{clean_title} full movie trailer", category="movie")


youtube = YouTubeController()

