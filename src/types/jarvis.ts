export type JarvisSystemState =
  | "CONNECTING"
  | "READY"
  | "LISTENING"
  | "USER SPEAKING"
  | "THINKING"
  | "JARVIS SPEAKING"
  | "EXECUTING ACTION"
  | "ERROR";

export type JarvisErrorCode =
  | "MIC_PERMISSION_DENIED"
  | "GEMINI_CONNECTION_FAILED"
  | "MISSING_API_KEY"
  | "NETWORK_DISCONNECTED"
  | null;

export type JarvisVoiceName = "Charon" | "Fenrir" | "Zephyr" | "Puck" | "Kore";

export interface TranscriptEntry {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: number;
  isComplete: boolean;
}

export interface AudioMetrics {
  /** Normalized 0..1 microphone RMS level */
  inputLevel: number;
  /** Normalized 0..1 speaker output RMS level */
  outputLevel: number;
  /** Normalized 0..1 active level (whichever is dominant) */
  activeLevel: number;
  /** Normalized 0..1 low-frequency energy */
  bass: number;
  /** Normalized 0..1 mid-frequency energy */
  mid: number;
  /** Normalized 0..1 high-frequency energy */
  treble: number;
  /** Raw 64-bin frequency spectrum (0..255) for 3D rings and bars */
  frequencyBins: Uint8Array;
  /** Raw 128-sample time-domain waveform (0..255, 128 = zero crossing) */
  timeDomainData: Uint8Array;
}

export interface JarvisActionStatus {
  callId: string;
  tool: string;
  args: Record<string, any>;
  status: "running" | "completed" | "failed";
  result?: any;
  timestamp: number;
}

export interface SystemTelemetry {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_free_gb: number;
  disk_percent: number;
  battery_percent: number | null;
  power_plugged: boolean;
  volume_percent: number;
  is_muted: boolean;
  emergency_stopped?: boolean;
  timestamp?: string;
}

export interface MemoryPreference {
  key: string;
  value: string;
  category: string;
  updated_at?: string;
}
