import React, { useState } from "react";
import {
  Mic,
  MicOff,
  MessageSquareText,
  RotateCw,
  Volume2,
  Sliders,
  History,
  ShieldAlert,
  Send,
  Radio,
} from "lucide-react";
import { useJarvisLive } from "./hooks/useJarvisLive";
import { JarvisCore3D } from "./components/JarvisCore3D";
import { AudioWaveform } from "./components/AudioWaveform";
import { TranscriptOverlay } from "./components/TranscriptOverlay";
import { ActionStatusHUD } from "./components/ActionStatusHUD";
import { SystemTelemetryBar } from "./components/SystemTelemetryBar";
import { SettingsMemoryModal } from "./components/SettingsMemoryModal";
import { CommandHistoryDrawer } from "./components/CommandHistoryDrawer";
import { JarvisSystemState } from "./types/jarvis";

const STATE_DISPLAY_CONFIG: Record<
  JarvisSystemState,
  {
    symbol: string;
    label: string;
    subtext: string;
    textColor: string;
    dotColor: string;
  }
> = {
  CONNECTING: {
    symbol: "◌",
    label: "CONNECTING...",
    subtext: "Establishing real-time neural audio link with Gemini 3.8 Live",
    textColor: "text-slate-300",
    dotColor: "text-sky-400 animate-spin",
  },
  READY: {
    symbol: "●",
    label: "READY",
    subtext: "Voice interface initialized · Speak naturally in English or Urdu",
    textColor: "text-cyan-300",
    dotColor: "text-cyan-400",
  },
  LISTENING: {
    symbol: "●",
    label: "LISTENING...",
    subtext: "Continuous voice detection active · Speak anytime",
    textColor: "text-cyan-300",
    dotColor: "text-cyan-400 animate-pulse",
  },
  "USER SPEAKING": {
    symbol: "◉",
    label: "USER SPEAKING...",
    subtext: "Capturing real-time voice stream",
    textColor: "text-teal-300",
    dotColor: "text-teal-400 animate-ping",
  },
  THINKING: {
    symbol: "◉",
    label: "THINKING...",
    subtext: "Processing context & formulating action",
    textColor: "text-amber-300",
    dotColor: "text-amber-400 animate-pulse",
  },
  "JARVIS SPEAKING": {
    symbol: "◉",
    label: "JARVIS SPEAKING...",
    subtext: "Speak at any moment to interrupt naturally",
    textColor: "text-sky-300",
    dotColor: "text-sky-400 animate-pulse",
  },
  "EXECUTING ACTION": {
    symbol: "⚙",
    label: "EXECUTING ACTION...",
    subtext: "Autonomous Windows tool in progress",
    textColor: "text-cyan-400 font-bold",
    dotColor: "text-cyan-400 animate-spin",
  },
  ERROR: {
    symbol: "▲",
    label: "ERROR",
    subtext: "Voice link interrupted",
    textColor: "text-red-400",
    dotColor: "text-red-500",
  },
};

export default function App() {
  const {
    systemState,
    errorCode,
    errorMessage,
    isMicMuted,
    needsUserGesture,
    voiceName,
    transcripts,
    activeAction,
    actionHistory,
    systemTelemetry,
    isContinuousListening,
    setIsContinuousListening,
    wakeWordEnabled,
    setWakeWordEnabled,
    setIsPushToTalkActive,
    sampleAudioMetrics,
    unlockAndResumeAudio,
    reconnect,
    toggleMicMute,
    changeVoice,
    clearTranscripts,
    dismissAction,
    interruptJarvis,
    triggerEmergencyStop,
    sendTextMessage,
  } = useJarvisLive();

  const [showTranscript, setShowTranscript] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");

  const currentDisplay =
    STATE_DISPLAY_CONFIG[systemState] || STATE_DISPLAY_CONFIG.LISTENING;

  const handleCoreInteraction = () => {
    if (needsUserGesture || systemState === "ERROR") {
      unlockAndResumeAudio();
      return;
    }
    if (systemState === "JARVIS SPEAKING") {
      interruptJarvis();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextMessage(textInput.trim());
    setTextInput("");
  };

  const handleEmergencyReset = async () => {
    try {
      await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "reset_emergency", args: {} }),
      });
      reconnect();
    } catch {}
  };

  return (
    <div className="relative w-screen h-dvh bg-[#030712] text-slate-100 overflow-hidden select-none flex flex-col justify-between">
      {/* Subtle Architectural Grid & Vignette Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.14) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#030712_90%)]" />

      {/* Full-Viewport 3D JARVIS Spatial Core */}
      <main className="absolute inset-0 z-0 w-full h-full">
        <JarvisCore3D
          systemState={systemState}
          sampleAudioMetrics={sampleAudioMetrics}
          onCoreClick={handleCoreInteraction}
        />
      </main>

      {/* Top Bar: Brand, Hardware Telemetry & Quick Action Controls */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="font-display text-lg sm:text-xl font-bold tracking-widest text-cyan-50 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          >
            J.A.R.V.I.S.
          </a>
          <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300">
            AUTONOMOUS 2.0
          </span>
        </div>

        {/* Live Windows System Telemetry Bar */}
        <SystemTelemetryBar telemetry={systemTelemetry} />

        {/* Action Controls & Emergency Stop */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Emergency Stop Button */}
          <button
            type="button"
            onClick={triggerEmergencyStop}
            className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/40 bg-red-950/60 text-red-200 hover:bg-red-900/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-95 shrink-0"
            title="Emergency Stop: Halts all actions and media"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden md:inline">HALT</span>
          </button>

          {/* Transcript Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              showTranscript
                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Toggle live transcript"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </button>

          {/* Command History Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Open command history"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Settings / Memory Controls */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Open settings and memory"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Control</span>
          </button>

          {/* Mic Mute / Active Toggle */}
          <button
            type="button"
            onClick={toggleMicMute}
            className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              isMicMuted
                ? "bg-red-500/20 border-red-500/40 text-red-200 hover:bg-red-500/30"
                : "bg-cyan-500/20 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30"
            }`}
            aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMicMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Active</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Floating Active Action Execution Telemetry Badge */}
      <div className="relative z-20 px-4 pt-3">
        <ActionStatusHUD action={activeAction} onDismiss={dismissAction} />
      </div>

      {/* Bottom HUD: Live State, Waveform, Prompts, Transcripts & Push-to-Talk */}
      <section className="relative z-10 w-full flex flex-col items-center justify-end pb-4 sm:pb-6 px-4 gap-2.5 pointer-events-none">
        {/* Browser Audio Unlock Banner */}
        {needsUserGesture && systemState !== "ERROR" && (
          <div className="pointer-events-auto max-w-md w-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/40 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-cyan-100">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tap once to activate real-time microphone &amp; voice output.</span>
            </div>
            <button
              type="button"
              onClick={unlockAndResumeAudio}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Initialize Audio
            </button>
          </div>
        )}

        {/* Error Notification */}
        {systemState === "ERROR" && errorMessage && (
          <div
            role="alert"
            className="pointer-events-auto max-w-lg w-full bg-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_35px_rgba(239,68,68,0.25)]"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-red-300">
                {errorCode === "MIC_PERMISSION_DENIED"
                  ? "MICROPHONE PERMISSION REQUIRED"
                  : errorCode === "MISSING_API_KEY"
                  ? "CONFIGURATION ERROR"
                  : "CONNECTION ERROR"}
              </p>
              <p className="text-sm font-medium text-red-100">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={reconnect}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-red-500/25 border border-red-400/50 text-red-100 hover:bg-red-500/35 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Conversation Transcript Overlay */}
        <TranscriptOverlay
          transcripts={transcripts}
          isOpen={showTranscript}
          onClear={clearTranscripts}
        />

        {/* Real-Time Synchronized Voice Waveform */}
        <AudioWaveform
          systemState={systemState}
          sampleAudioMetrics={sampleAudioMetrics}
        />

        {/* Primary Status Indicator */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-2.5 font-display text-base sm:text-lg font-semibold tracking-[0.18em]">
            <span className={currentDisplay.dotColor} aria-hidden="true">
              {currentDisplay.symbol}
            </span>
            <span className={currentDisplay.textColor}>
              {isMicMuted && systemState === "LISTENING"
                ? "MICROPHONE MUTED"
                : currentDisplay.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md text-balance">
            {isMicMuted
              ? "Unmute microphone to resume hands-free voice commands"
              : currentDisplay.subtext}
          </p>
        </div>

        {/* Push-to-Talk Button (when continuous listening is disabled) */}
        {!isContinuousListening && (
          <div className="pointer-events-auto">
            <button
              type="button"
              onMouseDown={() => setIsPushToTalkActive(true)}
              onMouseUp={() => setIsPushToTalkActive(false)}
              onTouchStart={() => setIsPushToTalkActive(true)}
              onTouchEnd={() => setIsPushToTalkActive(false)}
              className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Hold to Talk to JARVIS</span>
            </button>
          </div>
        )}

        {/* Text Command Input Bar */}
        <form
          onSubmit={handleTextSubmit}
          className="pointer-events-auto w-full max-w-md flex items-center gap-2 bg-slate-950/70 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a command or speak: 'YouTube par Tumse Koi Pyara chalao'..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer shrink-0"
            title="Send text command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </section>

      {/* Settings & Memory Modal */}
      <SettingsMemoryModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        voiceName={voiceName}
        onVoiceChange={changeVoice}
        isContinuousListening={isContinuousListening}
        onToggleContinuousListening={setIsContinuousListening}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={setWakeWordEnabled}
        onEmergencyReset={handleEmergencyReset}
        isEmergencyStopped={systemTelemetry?.emergency_stopped}
      />

      {/* Command & Action History Drawer */}
      <CommandHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={actionHistory}
      />
    </div>
  );
}
