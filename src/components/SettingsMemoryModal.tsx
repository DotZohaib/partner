import React, { useState, useEffect } from "react";
import { JarvisVoiceName, MemoryPreference } from "../types/jarvis";
import {
  X,
  Database,
  Volume2,
  Sliders,
  Plus,
  Trash2,
  Check,
  ShieldAlert,
  Mic,
  RotateCcw,
} from "lucide-react";

interface SettingsMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceName: JarvisVoiceName;
  onVoiceChange: (voice: JarvisVoiceName) => void;
  isContinuousListening: boolean;
  onToggleContinuousListening: (val: boolean) => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: (val: boolean) => void;
  onEmergencyReset: () => void;
  isEmergencyStopped?: boolean;
}

const AVAILABLE_VOICES: JarvisVoiceName[] = [
  "Charon",
  "Fenrir",
  "Zephyr",
  "Puck",
  "Kore",
];

export const SettingsMemoryModal: React.FC<SettingsMemoryModalProps> = ({
  isOpen,
  onClose,
  voiceName,
  onVoiceChange,
  isContinuousListening,
  onToggleContinuousListening,
  wakeWordEnabled,
  onToggleWakeWord,
  onEmergencyReset,
  isEmergencyStopped,
}) => {
  const [activeTab, setActiveTab] = useState<"memory" | "voice" | "system">("memory");
  const [preferences, setPreferences] = useState<MemoryPreference[]>([]);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState<boolean>(false);

  // New preference form
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchPreferences = async () => {
    setIsLoadingPrefs(true);
    try {
      const res = await fetch("/api/memory/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || []);
      }
    } catch {
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const handleSavePreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      const res = await fetch("/api/memory/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue.trim(),
          category: newCategory,
        }),
      });

      if (res.ok) {
        setNewKey("");
        setNewValue("");
        setStatusMsg("Preference saved to persistent SQLite memory");
        setTimeout(() => setStatusMsg(null), 3000);
        fetchPreferences();
      } else {
        setStatusMsg("Failed to save preference");
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch {
      setStatusMsg("Connection error saving preference");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleDeletePreference = async (key: string) => {
    try {
      const res = await fetch(
        `/api/memory/preferences?key=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchPreferences();
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-semibold text-lg text-slate-100 tracking-wider">
              JARVIS CONTROL MATRIX
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-white/5 bg-slate-900/20 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("memory")}
            className={`px-3 sm:px-4 py-2.5 text-xs font-mono tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "memory"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PERSISTENT MEMORY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`px-3 sm:px-4 py-2.5 text-xs font-mono tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "voice"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>VOICE &amp; SPEECH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-3 sm:px-4 py-2.5 text-xs font-mono tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "system"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SECURITY &amp; SYSTEM</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PERSISTENT MEMORY */}
          {activeTab === "memory" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  SQLite Neural Memory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  JARVIS persistently remembers your preferences, preferred language, favorite music, and habits across sessions.
                </p>
              </div>

              {/* Add New Preference Form */}
              <form
                onSubmit={handleSavePreference}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3"
              >
                <div className="text-xs font-medium text-cyan-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add / Update Saved Preference</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Key (e.g. favorite_artist)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Atif Aslam)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="general">General</option>
                    <option value="music">Music</option>
                    <option value="language">Language</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-emerald-400">{statusMsg}</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Save Memory
                  </button>
                </div>
              </form>

              {/* Preferences List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Current Saved Preferences ({preferences.length})</span>
                  <button
                    type="button"
                    onClick={fetchPreferences}
                    className="hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingPrefs ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Loading memory...</p>
                ) : preferences.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No saved preferences found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {preferences.map((pref) => (
                      <div
                        key={pref.key}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-900/40 border border-white/5 text-xs hover:border-white/10 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-medium">
                              {pref.key}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                              {pref.category}
                            </span>
                          </div>
                          <p className="text-slate-300">{pref.value}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePreference(pref.key)}
                          className="text-slate-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer shrink-0"
                          title="Delete memory item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VOICE & SPEECH */}
          {activeTab === "voice" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  AI Voice Synthesizer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose your preferred natural human-like voice model.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_VOICES.map((v) => {
                  const isSelected = voiceName === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onVoiceChange(v)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                          : "bg-slate-900/40 border-white/5 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-display text-sm font-semibold">
                          {v}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {v === "Charon"
                            ? "Deep, composed, articulate (Default JARVIS)"
                            : v === "Fenrir"
                            ? "Authoritative, resonant, commanding"
                            : v === "Zephyr"
                            ? "Calm, gentle, smooth"
                            : v === "Puck"
                            ? "Energetic, dynamic, friendly"
                            : "Warm, clear, balanced"}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Listening Mode Settings */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Listening Behavior
                </h4>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-200">
                      Continuous Listening Mode
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Allows hands-free voice command execution without pressing any buttons.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isContinuousListening}
                    onChange={(e) => onToggleContinuousListening(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-200">
                      Wake Word Activation ("Hey Jarvis")
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Activates listening immediately upon hearing "Hey Jarvis" or "Jarvis".
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={wakeWordEnabled}
                    onChange={(e) => onToggleWakeWord(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM & SECURITY */}
          {activeTab === "system" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Autonomous Safety Guardrails
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Security protocols protecting your computer against unauthorized shell code, destructive file deletion, and unconfirmed shutdowns.
                </p>
              </div>

              {isEmergencyStopped && (
                <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/60 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-red-300">
                      EMERGENCY STOP STATE ACTIVE
                    </span>
                    <p className="text-xs text-red-200">
                      All autonomous tools are currently locked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEmergencyReset}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resume Operations</span>
                  </button>
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                  <div className="font-semibold text-cyan-300">
                    Protected System Paths
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Files in Windows, System32, and Program Files can never be deleted or modified by autonomous actions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                  <div className="font-semibold text-cyan-300">
                    Destructive Action Confirmation
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Computer shutdown, restart, and sleep require verbal or explicit UI confirmation tokens.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

