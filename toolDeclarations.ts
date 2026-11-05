import { Type } from "@google/genai";

export const JARVIS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "play_youtube",
        description:
          "Searches YouTube for a song, music video, artist, or query and plays it with autoplay. Call this whenever the user asks to play a song, music, or video on YouTube (e.g. 'YouTube par Tumse Koi Pyara song chalao', 'play Atif Aslam', 'play romantic songs').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description:
                "The name of the song, artist, playlist, or video query to search and play.",
            },
            category: {
              type: Type.STRING,
              description: "Type of content: 'music', 'video', or 'movie'. Defaults to 'music'.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "media_control",
        description:
          "Controls active media playback (YouTube, music players, system audio). Actions: pause, resume, stop, next, previous, fullscreen, volume_up, volume_down, volume_set, mute, unmute.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description:
                "Playback action: 'pause', 'resume', 'stop', 'next', 'previous', 'fullscreen', 'volume_set', 'volume_up', 'volume_down', 'mute', 'unmute'.",
            },
            value: {
              type: Type.NUMBER,
              description:
                "Optional value: exact volume percentage (0-100) for 'volume_set', or step delta for volume changes.",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "search_movie",
        description:
          "Searches for movies, shows, or trailers across YouTube or streaming platforms (Netflix, Prime Video, Disney+).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Movie title, actor, or genre query.",
            },
            platform: {
              type: Type.STRING,
              description:
                "Optional streaming platform: 'youtube', 'netflix', 'prime', 'disney'. Defaults to YouTube.",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "launch_application",
        description:
          "Launches a Windows application by name (e.g., 'Chrome', 'Edge', 'VS Code', 'Notepad', 'File Explorer', 'Calculator', 'Spotify', 'Terminal').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            app_name: {
              type: Type.STRING,
              description: "Name of the application to open.",
            },
            args: {
              type: Type.STRING,
              description: "Optional command line argument or path to pass to the application.",
            },
          },
          required: ["app_name"],
        },
      },
      {
        name: "close_application",
        description: "Closes a running Windows application by name.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            app_name: {
              type: Type.STRING,
              description: "Name of the application or process to close.",
            },
          },
          required: ["app_name"],
        },
      },
      {
        name: "manage_window",
        description:
          "Manages Windows desktop application windows: focus, switch, minimize, maximize, or list windows.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Action: 'focus', 'minimize', 'maximize', 'list'.",
            },
            window_title: {
              type: Type.STRING,
              description: "Title or partial title of the target window to switch to or manipulate.",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "system_control",
        description:
          "Performs Windows OS controls: volume %, mute, take screenshot, battery/CPU telemetry, lock workstation, or sleep/shutdown (with confirmation).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description:
                "System action: 'set_volume', 'volume_up', 'volume_down', 'mute', 'unmute', 'screenshot', 'get_status', 'lock', 'sleep', 'shutdown', 'restart'.",
            },
            value: {
              type: Type.NUMBER,
              description: "Optional volume value (0-100) or delta.",
            },
            confirm_token: {
              type: Type.STRING,
              description:
                "Optional security confirmation token for destructive actions (shutdown, restart, sleep).",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "file_operation",
        description:
          "Performs file management: search files, open files/folders, create folders, rename, move, copy, organize downloads, or read document contents (.txt, .md, .py, .pdf).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description:
                "File action: 'search', 'open', 'create_folder', 'rename', 'move', 'copy', 'organize_downloads', 'read_file'.",
            },
            query: {
              type: Type.STRING,
              description: "Search keyword or filename query.",
            },
            extension: {
              type: Type.STRING,
              description: "Optional file extension to filter by (e.g. 'pdf', 'docx', 'png').",
            },
            location: {
              type: Type.STRING,
              description:
                "Directory location: 'desktop', 'downloads', 'documents', 'pictures', or a specific path.",
            },
            target: {
              type: Type.STRING,
              description: "Target file or folder path to open or read.",
            },
            destination: {
              type: Type.STRING,
              description: "Destination directory for move/copy operations.",
            },
            new_name: {
              type: Type.STRING,
              description: "New name for rename operation.",
            },
            max_results: {
              type: Type.NUMBER,
              description: "Maximum number of search results to return.",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "desktop_action",
        description:
          "Simulates mouse and keyboard inputs: type text, press hotkeys (e.g. ['ctrl', 'c']), click, scroll, or manage clipboard.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description:
                "Input action: 'type', 'press_keys', 'click', 'scroll', 'get_clipboard', 'set_clipboard'.",
            },
            text: {
              type: Type.STRING,
              description: "Text to type or set in clipboard.",
            },
            keys: {
              type: Type.STRING,
              description: "Hotkey combinations separated by + (e.g. 'ctrl+c', 'alt+tab', 'win+d').",
            },
            amount: {
              type: Type.NUMBER,
              description: "Scroll amount (negative for down, positive for up).",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "browser_action",
        description:
          "Navigates the web: opens specific websites (e.g. Google, GitHub, YouTube, ChatGPT), arbitrary URLs, or performs Google search.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Browser action: 'open_site', 'open_url', 'search'.",
            },
            site: {
              type: Type.STRING,
              description: "Name of the website (e.g. 'github', 'youtube', 'google', 'chatgpt').",
            },
            url: {
              type: Type.STRING,
              description: "Full URL to open.",
            },
            query: {
              type: Type.STRING,
              description: "Search query for Google search.",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "memory_operation",
        description:
          "Manages persistent memory & preferences in SQLite: view, update, delete preferences, or list saved preferences.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Memory action: 'get', 'set', 'delete', 'list'.",
            },
            key: {
              type: Type.STRING,
              description: "Preference or memory key.",
            },
            value: {
              type: Type.STRING,
              description: "Preference value to save.",
            },
            category: {
              type: Type.STRING,
              description: "Category: 'music', 'language', 'general', 'system'.",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "execute_multistep_plan",
        description:
          "Executes multiple actions sequentially in an autonomous chain (e.g., open Chrome, search for a video, and play it).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
              },
              description:
                "List of step objects, each having { 'tool': string, 'args': object }.",
            },
          },
          required: ["steps"],
        },
      },
      {
        name: "emergency_stop",
        description:
          "IMMEDIATELY stops all active tasks, halts background processes, and suspends operations. Call when the user says 'Jarvis stop everything', 'emergency stop', or 'halt'.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

