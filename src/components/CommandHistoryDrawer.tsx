import React from "react";
import { JarvisActionStatus } from "../types/jarvis";
import { History, X, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface CommandHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: JarvisActionStatus[];
}

export const CommandHistoryDrawer: React.FC<CommandHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-950/95 border-l border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/50">
        <div className="flex items-center gap-2 text-cyan-300">
          <History className="w-4 h-4" />
          <h2 className="font-display font-semibold text-sm tracking-wider text-slate-100">
            ACTION &amp; COMMAND LOG
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
            <p>No executed actions in this session yet.</p>
            <p className="text-[11px] mt-1 text-slate-600">
              Speak commands like &ldquo;Play Tumse Koi Pyara on YouTube&rdquo; or &ldquo;Open Chrome&rdquo;
            </p>
          </div>
        ) : (
          history.map((item) => {
            const isCompleted = item.status === "completed";
            const isFailed = item.status === "failed";
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={item.callId}
                className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5 text-xs hover:border-white/15 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-cyan-300">
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                    ) : isFailed ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                    <span>{item.tool.replace(/_/g, " ").toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {timeStr}
                  </span>
                </div>

                {Object.keys(item.args).length > 0 && (
                  <div className="text-slate-300 font-mono text-[11px] bg-black/40 px-2 py-1 rounded">
                    {item.args.query
                      ? `"${item.args.query}"`
                      : item.args.app_name
                      ? `App: ${item.args.app_name}`
                      : item.args.action
                      ? `Action: ${item.args.action}`
                      : JSON.stringify(item.args)}
                  </div>
                )}

                {item.result?.message && (
                  <p className="text-[11px] text-slate-400">
                    {item.result.message}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

