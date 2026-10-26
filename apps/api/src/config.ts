/** Validated runtime configuration (see apps/api/.env.example). */
export interface AppConfig {
  port: number;
  /** Origins allowed to call the API from a browser */
  corsOrigins: string[];
  /** Express "trust proxy" setting, so rate limiting sees client IPs behind a proxy */
  trustProxy: boolean | number;
  openaiApiKey?: string;
  asrModel: string;
  /** Streaming model for live feedback while reciting */
  liveAsrModel: string;
  maxAudioBytes: number;
  evaluationsPerMinute: number;
}

const DEFAULT_ORIGINS = ["http://localhost:3000"];

function positiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}")`);
  }
  return value;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ORIGINS;

  let trustProxy: boolean | number = false;
  if (env.TRUST_PROXY === "true") trustProxy = true;
  else if (env.TRUST_PROXY) trustProxy = positiveInt("TRUST_PROXY", env.TRUST_PROXY, 1);

  return {
    port: positiveInt("PORT", env.PORT, 4000),
    corsOrigins,
    trustProxy,
    openaiApiKey: env.OPENAI_API_KEY?.trim() || undefined,
    asrModel: env.ASR_MODEL?.trim() || "whisper-1",
    liveAsrModel: env.LIVE_ASR_MODEL?.trim() || "gpt-realtime-whisper",
    maxAudioBytes: positiveInt("MAX_AUDIO_MB", env.MAX_AUDIO_MB, 10) * 1024 * 1024,
    evaluationsPerMinute: positiveInt(
      "EVALUATIONS_PER_MINUTE",
      env.EVALUATIONS_PER_MINUTE,
      20,
    ),
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");

/**
 * process.loadEnvFile() never overrides variables already set in the shell, so a
 * stale OPENAI_API_KEY in the OS environment silently beats the one in .env.
 * Returns the names whose shell value differs from the .env file.
 */
export function shadowedEnvVars(
  fileValues: Record<string, string | undefined>,
  env: Record<string, string | undefined> = process.env,
  names: string[] = ["OPENAI_API_KEY", "ASR_MODEL"],
): string[] {
  return names.filter((name) => fileValues[name] !== undefined && env[name] !== undefined && fileValues[name] !== env[name]);
}

/** Safe-to-log description of a secret: never the secret itself. */
export function describeKey(key: string | undefined): string {
  if (!key) return "not set";
  return `${key.length} characters, ending …${key.slice(-4)}`;
}
