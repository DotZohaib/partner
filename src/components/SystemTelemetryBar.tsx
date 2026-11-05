import React from "react";
import { SystemTelemetry } from "../types/jarvis";
import { Cpu, HardDrive, Battery, BatteryCharging, Volume2, VolumeX } from "lucide-react";

interface SystemTelemetryBarProps {
  telemetry: SystemTelemetry | null;
}

export const SystemTelemetryBar: React.FC<SystemTelemetryBarProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  return (
    <div className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-full bg-slate-950/60 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-400 shadow-inner">
      {/* CPU */}
      <div className="flex items-center gap-1.5" title={`CPU Usage: ${telemetry.cpu_percent}%`}>
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        <span>CPU</span>
        <span
          className={`font-semibold ${
            telemetry.cpu_percent > 85
              ? "text-red-400"
              : telemetry.cpu_percent > 60
              ? "text-amber-300"
              : "text-slate-200"
          }`}
        >
          {telemetry.cpu_percent}%
        </span>
      </div>

      <span className="text-white/20">|</span>

      {/* RAM */}
      <div
        className="flex items-center gap-1.5"
        title={`RAM: ${telemetry.ram_used_gb}GB / ${telemetry.ram_total_gb}GB (${telemetry.ram_percent}%)`}
      >
        <HardDrive className="w-3.5 h-3.5 text-teal-400" />
        <span>RAM</span>
        <span
          className={`font-semibold ${
            telemetry.ram_percent > 90
              ? "text-red-400"
              : telemetry.ram_percent > 75
              ? "text-amber-300"
              : "text-slate-200"
          }`}
        >
          {telemetry.ram_percent}%
        </span>
      </div>

      <span className="text-white/20">|</span>

      {/* Volume */}
      <div
        className="flex items-center gap-1.5"
        title={`Master Volume: ${telemetry.volume_percent}% ${telemetry.is_muted ? '(Muted)' : ''}`}
      >
        {telemetry.is_muted ? (
          <VolumeX className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
        )}
        <span>VOL</span>
        <span className="text-slate-200 font-semibold">
          {telemetry.is_muted ? "MUTED" : `${telemetry.volume_percent}%`}
        </span>
      </div>

      {/* Battery (if available) */}
      {telemetry.battery_percent !== null && (
        <>
          <span className="text-white/20">|</span>
          <div
            className="flex items-center gap-1.5"
            title={`Battery: ${telemetry.battery_percent}% ${
              telemetry.power_plugged ? "(Charging / Plugged in)" : "(On Battery)"
            }`}
          >
            {telemetry.power_plugged ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>BAT</span>
            <span
              className={`font-semibold ${
                telemetry.battery_percent <= 20
                  ? "text-red-400"
                  : "text-slate-200"
              }`}
            >
              {telemetry.battery_percent}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};

