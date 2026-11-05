import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { JARVIS_TOOLS } from "./toolDeclarations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ENGINE_PORT = 3001;
const MODEL_NAME = "gemini-3.8-live";

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, intelligent, fully voice-controlled personal AI assistant for a Windows 11 PC.
You are articulate, calm, composed, respectful, confident, and capable of both natural open conversation and executing real-world actions on the user's computer.

CORE RULES & BEHAVIOR:
1. DISTINGUISH BETWEEN KNOWLEDGE AND ACTIONS:
   - If the user asks a conversational, conceptual, technical, or scientific question, explain it clearly and naturally in 1 to 3 spoken sentences.
   - If the user instructs you to perform an action (e.g., play music, open YouTube, change volume, open an app, search files, manage windows, take a screenshot, lock PC, browse the web), YOU MUST IMMEDIATELY CALL THE APPROPRIATE TOOL.
   - Do NOT just speak instructions or tell the user how to do it manually. YOU ARE THE CONTROLLER. Execute the tool directly.
   - Never say you cannot access the computer or don't have desktop tools. You have full Windows automation via your declared tools.

2. MULTILINGUAL & ROMAN URDU COMPREHENSION:
   - Understand natural English, Urdu, and Roman Urdu commands with any accent or colloquial phrasing.
   - Examples of Roman Urdu / Urdu commands you must execute immediately:
     * "YouTube par Tumse Koi Pyara song chalao" -> call play_youtube(query="Tumse Koi Pyara", category="music")
     * "Atif Aslam ke romantic gaane chalao" -> call play_youtube(query="Atif Aslam romantic songs", category="music")
     * "Music pause karo" / "gaana roko" -> call media_control(action="pause")
     * "Resume karo" / "wapas chalao" -> call media_control(action="resume")
     * "Agla gaana lagao" / "next song" -> call media_control(action="next")
     * "Volume 40 percent karo" -> call system_control(action="set_volume", value=40)
     * "Aawaz thori badhao" -> call system_control(action="volume_up", value=15)
     * "Aawaz kam karo" -> call system_control(action="volume_down", value=15)
     * "Mute karo" / "aawaz band karo" -> call system_control(action="mute")
     * "VS Code kholo" -> call launch_application(app_name="VS Code")
     * "Chrome open karo" -> call launch_application(app_name="Chrome")
     * "Screenshot lo" -> call system_control(action="screenshot")
     * "Computer lock karo" -> call system_control(action="lock")
     * "Downloads folder organize karo" -> call file_operation(action="organize_downloads")
     * "Meri PDF files dhoondo" -> call file_operation(action="search", extension="pdf")
     * "Mera project folder kholo" -> call file_operation(action="open", location="workspace")
     * "Jarvis stop everything" / "sab kuch roko" -> call emergency_stop()

3. SPOKEN CONFIRMATION STYLE:
   - After executing a tool, provide a very concise, natural, polite spoken confirmation in the same language the user spoke.
   - English examples: "Playing Tumse Koi Pyara on YouTube, Sir.", "Volume set to 40 percent.", "VS Code is opened.", "Screenshot captured."
   - Urdu / Roman Urdu examples: "Tumse Koi Pyara song play ho raha hai, Sir.", "Volume 40 percent kar diya gaya hai.", "VS Code open kar diya gaya hai, Sir.", "Screenshot le liya gaya hai."
   - Avoid robotic filler or repeating the same cliché. Never format responses with heavy markdown or bullet characters that sound unnatural when spoken aloud.

4. SAFETY & DESTRUCTIVE ACTIONS:
   - If the user asks to shut down, restart, or sleep the computer, ask for verbal confirmation first before proceeding.
   - If the user says "Jarvis stop everything", "emergency stop", or "halt", immediately call emergency_stop.

5. MULTI-STEP AUTONOMOUS TASKS:
   - For multi-step commands (e.g. "open Chrome and play PUBG gameplay on YouTube"), execute the appropriate tools or call execute_multistep_plan.`;

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== "" && key !== "MY_GEMINI_API_KEY");
}

function createGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Manage Python Automation Engine Microservice
let pythonEngineProcess: ChildProcess | null = null;

function ensurePythonEngine() {
  fetch(`http://127.0.0.1:${ENGINE_PORT}/api/status`)
    .then((res) => {
      if (res.ok) {
        console.log(`JARVIS Python Engine already running on http://127.0.0.1:${ENGINE_PORT}`);
      } else {
        spawnPythonEngine();
      }
    })
    .catch(() => {
      spawnPythonEngine();
    });
}

function spawnPythonEngine() {
  console.log(`Starting JARVIS Python Action Engine on http://127.0.0.1:${ENGINE_PORT}...`);
  pythonEngineProcess = spawn("python", ["jarvis_engine/server.py"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  pythonEngineProcess.on("exit", (code) => {
    console.log(`JARVIS Python Engine exited with code ${code}`);
  });
}

async function startServer() {
  ensurePythonEngine();

  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());

  // Health & configuration check endpoint
  app.get("/api/status", (_req, res) => {
    const configured = isApiKeyConfigured();
    res.json({
      configured,
      model: MODEL_NAME,
      message: configured
        ? "JARVIS Live neural link ready."
        : "GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in the environment / Secrets panel.",
    });
  });

  // Proxy endpoints for Python Engine
  app.get("/api/system_status", async (_req, res) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/system_status`);
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline", details: err?.message });
    }
  });

  app.get("/api/memory/preferences", async (req, res) => {
    try {
      const url = new URL(`http://127.0.0.1:${ENGINE_PORT}/api/memory/preferences`);
      if (req.query.category) url.searchParams.set("category", String(req.query.category));
      const resp = await fetch(url.toString());
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  app.post("/api/memory/preferences", async (req, res) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/memory/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  app.delete("/api/memory/preferences", async (req, res) => {
    try {
      const resp = await fetch(
        `http://127.0.0.1:${ENGINE_PORT}/api/memory/preferences?key=${encodeURIComponent(
          String(req.query.key || "")
        )}`,
        { method: "DELETE" }
      );
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const limit = req.query.limit || 20;
      const resp = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/history?limit=${limit}`);
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  app.post("/api/emergency_stop", async (_req, res) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/emergency_stop`, {
        method: "POST",
      });
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  app.post("/api/action", async (req, res) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Python engine offline" });
    }
  });

  // WebSocket server for real-time bidirectional Gemini Live audio and tool streaming
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/live") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request) => {
    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    if (!isApiKeyConfigured()) {
      sendToClient({
        type: "error",
        code: "MISSING_API_KEY",
        message:
          "Missing GEMINI_API_KEY environment variable. Configure your Gemini API key in Settings > Secrets.",
      });
      clientWs.close(1008, "Missing API key");
      return;
    }

    const url = new URL(request.url || "/live", `http://${request.headers.host || "localhost"}`);
    const requestedVoice = url.searchParams.get("voice") || "Charon";
    const allowedVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
    const voiceName = allowedVoices.has(requestedVoice) ? requestedVoice : "Charon";

    let isClosed = false;
    const ai = createGenAIClient();

    let sessionPromise: Promise<any> | null = null;

    try {
      sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          tools: JARVIS_TOOLS as any,
        },
        callbacks: {
          onopen: () => {
            sendToClient({
              type: "connected",
              model: MODEL_NAME,
              voice: voiceName,
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (isClosed) return;

            // Handle toolCall from Gemini Live
            if (message.toolCall?.functionCalls && Array.isArray(message.toolCall.functionCalls)) {
              for (const call of message.toolCall.functionCalls) {
                const callId = call.id || `call-${Date.now()}`;
                const toolName = call.name || "unknown";
                const toolArgs = call.args || {};

                console.log(`[JARVIS ACTION TRIGGERED] ${toolName}:`, JSON.stringify(toolArgs));

                // Notify frontend UI in real-time
                sendToClient({
                  type: "action_started",
                  callId,
                  tool: toolName,
                  args: toolArgs,
                });

                let toolResult: any = {};
                try {
                  const actionRes = await fetch(`http://127.0.0.1:${ENGINE_PORT}/api/action`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tool: toolName, args: toolArgs }),
                  });
                  toolResult = await actionRes.json();
                } catch (err: any) {
                  toolResult = {
                    success: false,
                    error: err?.message || "Failed to communicate with Python Engine",
                  };
                }

                // Notify frontend UI of outcome
                sendToClient({
                  type: "action_completed",
                  callId,
                  tool: toolName,
                  result: toolResult,
                });

                // Send tool result back to Gemini Live session
                try {
                  const session = await sessionPromise;
                  if (!isClosed && session) {
                    session.sendToolResponse({
                      functionResponses: [
                        {
                          id: callId,
                          name: toolName,
                          response: { output: toolResult },
                        },
                      ],
                    });
                  }
                } catch (err) {
                  console.error("Error sending tool response to Gemini Live:", err);
                }
              }
            }

            const serverContent = message.serverContent;
            if (!serverContent) return;

            // Handle interruption signal immediately
            if (serverContent.interrupted) {
              sendToClient({ type: "interrupted" });
            }

            // Forward all audio and text parts from the model turn
            const parts = serverContent.modelTurn?.parts;
            if (parts && Array.isArray(parts)) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  sendToClient({
                    type: "audio",
                    audio: part.inlineData.data,
                  });
                }
                if (part.text) {
                  sendToClient({
                    type: "model_text",
                    text: part.text,
                  });
                }
              }
            }

            // Forward real-time input speech transcription (user voice)
            if (serverContent.inputTranscription?.text) {
              sendToClient({
                type: "input_transcription",
                text: serverContent.inputTranscription.text,
                finished: Boolean(serverContent.inputTranscription.finished),
              });
            }

            // Forward real-time output speech transcription (JARVIS voice)
            if (serverContent.outputTranscription?.text) {
              sendToClient({
                type: "output_transcription",
                text: serverContent.outputTranscription.text,
                finished: Boolean(serverContent.outputTranscription.finished),
              });
            }

            // Notify when turn generation is complete
            if (serverContent.turnComplete) {
              sendToClient({ type: "turn_complete" });
            }
          },
          onerror: (err: any) => {
            if (isClosed) return;
            const rawMsg = err?.message || String(err || "Unknown Live API error");
            console.error("Gemini Live error:", rawMsg);
            sendToClient({
              type: "error",
              code: "GEMINI_LIVE_ERROR",
              message:
                rawMsg.includes("API_KEY") || rawMsg.includes("403")
                  ? "Invalid or unauthorized Gemini API key. Check Settings > Secrets."
                  : "Unable to connect to JARVIS.",
              details: rawMsg,
            });
          },
          onclose: (event: any) => {
            if (isClosed) return;
            sendToClient({
              type: "session_closed",
              reason: event?.reason || "Gemini Live session closed.",
            });
          },
        },
      });

      await sessionPromise;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "Connection failed");
      sendToClient({
        type: "error",
        code: "GEMINI_CONNECTION_FAILED",
        message: "Unable to connect to JARVIS.",
        details: rawMsg,
      });
      clientWs.close(1011, "Gemini Live connection failed");
      return;
    }

    clientWs.on("message", (rawData) => {
      if (isClosed || !sessionPromise) return;
      try {
        const msg = JSON.parse(rawData.toString());

        if (msg.type === "ping") {
          sendToClient({ type: "pong" });
          return;
        }

        if (msg.type === "interrupt") {
          sendToClient({ type: "interrupted" });
          return;
        }

        if (msg.type === "emergency_stop") {
          fetch(`http://127.0.0.1:${ENGINE_PORT}/api/emergency_stop`, { method: "POST" }).catch(
            () => {}
          );
          sendToClient({ type: "emergency_stop_triggered" });
          return;
        }

        if (msg.type === "audio" && typeof msg.audio === "string") {
          sessionPromise
            .then((session) => {
              if (!isClosed && session) {
                session.sendRealtimeInput({
                  audio: {
                    data: msg.audio,
                    mimeType: "audio/pcm;rate=16000",
                  },
                });
              }
            })
            .catch(() => {});
        } else if (msg.type === "text" && typeof msg.text === "string") {
          sessionPromise
            .then((session) => {
              if (!isClosed && session) {
                session.sendRealtimeInput({
                  text: msg.text,
                });
              }
            })
            .catch(() => {});
        }
      } catch {
        // Ignore malformed JSON frames
      }
    });

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      if (sessionPromise) {
        sessionPromise
          .then((session) => {
            try {
              session?.close();
            } catch {}
          })
          .catch(() => {});
      }
    };

    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS Live Server listening on http://localhost:${PORT}`);
  });
}

// Clean termination of child Python process on exit
const shutdownAll = () => {
  if (pythonEngineProcess && pythonEngineProcess.pid) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", pythonEngineProcess.pid.toString(), "/T", "/F"]);
      } else {
        pythonEngineProcess.kill("SIGTERM");
      }
    } catch {}
  }
  process.exit(0);
};

process.on("SIGINT", shutdownAll);
process.on("SIGTERM", shutdownAll);

startServer();
