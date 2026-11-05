import React from "react";
import { JarvisActionStatus } from "../types/jarvis";
import { Play, CheckCircle2, AlertTriangle, Loader2, Sparkles, X } from "lucide-react";

interface ActionStatusHUDProps {
  action: JarvisActionStatus | null;
  onDismiss?: () => void;
}

export const ActionStatusHUD: React.FC<ActionStatusHUDProps> = ({ action, onDismiss }) => {
  if (!action) return null;

  const isRunning = action.status === "running";
  const isFailed = action.status === "failed";
  const isCompleted = action.status === "completed";

  // Format friendly display name
  const formatToolName = (tool: string) => {
    return tool
      .replace(/_/g, " ")
      .toUpperCase();
  };

  const getArgsSummary = (args: Record<string, any>) => {
    if (args.query) return `"${args.query}"`;
    if (args.app_name) return `App: ${args.app_name}`;
    if (args.action) return `Action: ${args.action}${args.value !== undefined ? ` (${args.value})` : ""}`;
    if (args.title) return `"${args.title}"`;
    if (args.steps) return `${args.steps.length} multi-step tasks`;
    return "";
  };

  const message = action.result?.message || (action.result?.error ? `Error: ${action.result.error}` : "");

  return (
    <aside
      aria-label="Action Execution Telemetry"
      className="pointer-events-auto w-full max-w-lg mx-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`relative overflow-hidden rounded-xl border backdrop-blur-md px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${
          isRunning
            ? "bg-slate-950/85 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]"
            : isFailed
            ? "bg-red-950/85 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]"
            : "bg-teal-950/80 border-teal-400/50 shadow-[0_0_30px_rgba(20,184,166,0.25)]"
        }`}
      >
        {/* Holographic top accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] ${
            isRunning
              ? "bg-gradient-to-r from-cyan-500 via-sky-300 to-cyan-500 animate-pulse"
              : isFailed
              ? "bg-gradient-to-r from-red-500 via-rose-300 to-red-500"
              : "bg-gradient-to-r from-teal-500 via-emerald-300 to-teal-500"
          }`}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                isRunning
                  ? "bg-cyan-500/20 text-cyan-300"
                  : isFailed
                  ? "bg-red-500/20 text-red-300"
                  : "bg-teal-500/20 text-teal-300"
              }`}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFailed ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                  {isRunning ? "AUTONOMOUS TASK" : isFailed ? "TASK FAILED" : "COMPLETED"}
                </span>
                <span className="font-display text-xs font-semibold text-white tracking-wide truncate">
                  {formatToolName(action.tool)}
                </span>
              </div>

              <div className="text-xs text-slate-300 truncate mt-0.5">
                {getArgsSummary(action.args) && (
                  <span className="text-cyan-200 font-medium mr-1.5">
                    {getArgsSummary(action.args)}
                  </span>
                )}
                {message && <span className="opacity-90">{message}</span>}
              </div>
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss action notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

