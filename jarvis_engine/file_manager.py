"""
JARVIS File Manager
Provides desktop file operations:
- Search files across user directories (Documents, Downloads, Desktop, etc.)
- Open files and folders with default Windows applications
- Create folders
- Rename, move, and copy files
- Organize Downloads folder into categorized directories
- Read document contents (.txt, .md, .py, .json, .csv, .pdf)
- Safe file deletion (subject to safety validation)
"""

import os
import shutil
import glob
import datetime
from typing import Dict, Any, List, Optional

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


class FileManager:
    COMMON_ROOTS = {
        "desktop": os.path.join(os.path.expanduser("~"), "Desktop"),
        "downloads": os.path.join(os.path.expanduser("~"), "Downloads"),
        "documents": os.path.join(os.path.expanduser("~"), "Documents"),
        "pictures": os.path.join(os.path.expanduser("~"), "Pictures"),
        "music": os.path.join(os.path.expanduser("~"), "Music"),
        "videos": os.path.join(os.path.expanduser("~"), "Videos"),
        "workspace": os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    }

    FILE_CATEGORIES = {
        "Documents": [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".pptx", ".csv", ".epub"],
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico"],
        "Videos": [".mp4", ".mkv", ".flv", ".mov", ".avi", ".wmv", ".webm"],
        "Audio": [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"],
        "Installers": [".exe", ".msi", ".bat", ".cmd"],
        "Archives": [".zip", ".rar", ".7z", ".tar", ".gz", ".iso"]
    }

    def __init__(self):
        pass

    def _resolve_search_dir(self, location: Optional[str]) -> str:
        """Resolves location name or path to a real filesystem directory."""
        if not location:
            return os.path.expanduser("~")
        norm = location.strip().lower()
        if norm in self.COMMON_ROOTS:
            return self.COMMON_ROOTS[norm]
        if os.path.isabs(location) and os.path.exists(location):
            return location
        rel = os.path.abspath(location)
        if os.path.exists(rel):
            return rel
        return os.path.expanduser("~")

    def search_files(
        self,
        query: str,
        extension: Optional[str] = None,
        location: Optional[str] = None,
        max_results: int = 15
    ) -> Dict[str, Any]:
        """
        Searches for files matching query and/or extension.
        Returns paths, sizes, and last modified timestamps sorted by latest first.
        """
        root_dir = self._resolve_search_dir(location)
        results = []
        clean_ext = extension.strip().lower() if extension else None
        if clean_ext and not clean_ext.startswith("."):
            clean_ext = f".{clean_ext}"

        clean_query = query.strip().lower() if query else ""

        # Walk up to 4 directory levels deep for performance
        try:
            for root, dirs, files in os.walk(root_dir):
                # Skip hidden/system directories
                dirs[:] = [d for d in dirs if not d.startswith(".") and not d.startswith("$")]
                depth = root[len(root_dir):].count(os.sep)
                if depth > 4:
                    continue

                for f in files:
                    name_lower = f.lower()
                    if clean_ext and not name_lower.endswith(clean_ext):
                        continue
                    if clean_query and clean_query not in name_lower:
                        continue

                    full_path = os.path.join(root, f)
                    try:
                        stat = os.stat(full_path)
                        results.append({
                            "name": f,
                            "path": full_path,
                            "size_bytes": stat.st_size,
                            "size_kb": round(stat.st_size / 1024, 1),
                            "modified": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                            "timestamp": stat.st_mtime
                        })
                    except (PermissionError, FileNotFoundError):
                        continue

                    if len(results) >= max_results * 4:
                        break
        except Exception as e:
            return {"success": False, "error": str(e), "results": []}

        # Sort by latest modified first
        results.sort(key=lambda x: x["timestamp"], reverse=True)
        final_list = results[:max_results]

        return {
            "success": True,
            "count": len(final_list),
            "search_root": root_dir,
            "results": final_list,
            "message": f"Found {len(final_list)} file(s)"
        }

    def open_path(self, target_path: str) -> Dict[str, Any]:
        """Opens a file or folder using Windows default handler."""
        norm_path = target_path.strip().strip('"').strip("'")
        if norm_path.lower() in self.COMMON_ROOTS:
            norm_path = self.COMMON_ROOTS[norm_path.lower()]

        if not os.path.exists(norm_path):
            # Attempt to locate relative to home or workspace
            cand = os.path.join(os.path.expanduser("~"), norm_path)
            if os.path.exists(cand):
                norm_path = cand
            else:
                return {"success": False, "error": f"Path not found: '{target_path}'"}

        try:
            os.startfile(norm_path)
            is_dir = os.path.isdir(norm_path)
            return {
                "success": True,
                "path": norm_path,
                "is_directory": is_dir,
                "message": f"Opened {'folder' if is_dir else 'file'}: {os.path.basename(norm_path)}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def create_folder(self, folder_path: str) -> Dict[str, Any]:
        """Creates a new folder."""
        path = os.path.abspath(folder_path.strip().strip('"'))
        try:
            os.makedirs(path, exist_ok=True)
            return {"success": True, "path": path, "message": f"Folder created at {path}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def rename_file(self, old_path: str, new_name: str) -> Dict[str, Any]:
        """Renames a file or folder."""
        src = os.path.abspath(old_path.strip().strip('"'))
        if not os.path.exists(src):
            return {"success": False, "error": f"Source does not exist: {src}"}

        parent = os.path.dirname(src)
        dst = os.path.join(parent, new_name.strip())
        try:
            os.rename(src, dst)
            return {"success": True, "old_path": src, "new_path": dst, "message": f"Renamed to {new_name}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def move_file(self, source_path: str, destination_dir: str) -> Dict[str, Any]:
        """Moves a file or folder to destination."""
        src = os.path.abspath(source_path.strip().strip('"'))
        dst_dir = self._resolve_search_dir(destination_dir)
        if not os.path.exists(src):
            return {"success": False, "error": f"Source does not exist: {src}"}
        try:
            shutil.move(src, dst_dir)
            return {"success": True, "source": src, "destination": dst_dir, "message": f"Moved to {dst_dir}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def copy_file(self, source_path: str, destination_dir: str) -> Dict[str, Any]:
        """Copies a file to destination."""
        src = os.path.abspath(source_path.strip().strip('"'))
        dst_dir = self._resolve_search_dir(destination_dir)
        if not os.path.exists(src):
            return {"success": False, "error": f"Source does not exist: {src}"}
        try:
            shutil.copy2(src, dst_dir)
            return {"success": True, "source": src, "destination": dst_dir, "message": f"Copied to {dst_dir}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def organize_downloads(self) -> Dict[str, Any]:
        """Automatically sorts files in Downloads into categorized folders."""
        downloads_dir = self.COMMON_ROOTS["downloads"]
        if not os.path.exists(downloads_dir):
            return {"success": False, "error": "Downloads folder not found"}

        moved_counts: Dict[str, int] = {cat: 0 for cat in self.FILE_CATEGORIES}

        try:
            for item in os.listdir(downloads_dir):
                item_path = os.path.join(downloads_dir, item)
                if os.path.isdir(item_path):
                    continue

                _, ext = os.path.splitext(item)
                ext = ext.lower()

                target_category = None
                for cat, extensions in self.FILE_CATEGORIES.items():
                    if ext in extensions:
                        target_category = cat
                        break

                if target_category:
                    cat_folder = os.path.join(downloads_dir, target_category)
                    os.makedirs(cat_folder, exist_ok=True)
                    shutil.move(item_path, os.path.join(cat_folder, item))
                    moved_counts[target_category] += 1

            total_moved = sum(moved_counts.values())
            return {
                "success": True,
                "total_organized": total_moved,
                "details": moved_counts,
                "message": f"Organized {total_moved} files in Downloads"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def read_document(self, file_path: str, max_chars: int = 4000) -> Dict[str, Any]:
        """Reads content of a supported document (txt, md, json, py, csv, pdf)."""
        path = os.path.abspath(file_path.strip().strip('"'))
        if not os.path.exists(path):
            workspace_cand = os.path.join(self.COMMON_ROOTS["workspace"], file_path.strip().strip('"'))
            if os.path.exists(workspace_cand):
                path = workspace_cand
            else:
                return {"success": False, "error": f"File does not exist: {path}"}

        _, ext = os.path.splitext(path)
        ext = ext.lower()

        # Handle PDF
        if ext == ".pdf":
            if not HAS_PYPDF:
                return {"success": False, "error": "pypdf library not available to read PDF"}
            try:
                with open(path, "rb") as f:
                    reader = pypdf.PdfReader(f)
                    num_pages = len(reader.pages)
                    extracted_text = ""
                    for i, page in enumerate(reader.pages):
                        page_text = page.extract_text() or ""
                        extracted_text += f"\n--- Page {i+1} ---\n{page_text}"
                        if len(extracted_text) >= max_chars:
                            extracted_text = extracted_text[:max_chars] + "\n...[truncated]"
                            break
                return {
                    "success": True,
                    "pages": num_pages,
                    "content": extracted_text.strip(),
                    "message": f"Extracted text from {num_pages}-page PDF"
                }
            except Exception as e:
                return {"success": False, "error": f"Failed to read PDF: {str(e)}"}

        # Handle text formats
        text_extensions = {".txt", ".md", ".json", ".csv", ".py", ".log", ".yaml", ".yml", ".html", ".css", ".js", ".ts"}
        if ext in text_extensions or ext == "":
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(max_chars)
                    if len(content) == max_chars:
                        content += "\n...[truncated]"
                return {
                    "success": True,
                    "content": content,
                    "message": f"Read {len(content)} characters from {os.path.basename(path)}"
                }
            except Exception as e:
                return {"success": False, "error": str(e)}

        return {"success": False, "error": f"Unsupported document format: {ext}"}


file_manager = FileManager()

