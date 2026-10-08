import type { ApiErrorBody, AyahEvaluation } from "@repo/types";

/** Base URL of the evaluation API (apps/api). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type ApiErrorCode =
  | "offline" // no network / API unreachable
  | "no-speech" // recording had no recognisable recitation
  | "rate-limited"
  | "unavailable" // speech recognition not configured or provider down
  | "invalid-audio"
  | "timeout"
  | "unknown";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FRIENDLY: Record<ApiErrorCode, string> = {
  offline: "Can't reach the recitation service. Check your connection and try again.",
  "no-speech": "We couldn't hear any recitation. Check your microphone and try again.",
  "rate-limited": "You're going a little fast. Please wait a moment and try again.",
  unavailable: "Recitation checking is temporarily unavailable. Please try again later.",
  "invalid-audio": "That recording couldn't be processed. Please record again.",
  timeout: "Checking took too long. Please try again.",
  unknown: "Something went wrong while checking your recitation.",
};

function codeForStatus(status: number): ApiErrorCode {
  if (status === 422) return "no-speech";
  if (status === 429) return "rate-limited";
  if (status === 413 || status === 415) return "invalid-audio";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return "unknown";
}

/** Grade one recorded ayah. Throws ApiError with a user-presentable message. */
export async function evaluateRecording(
  audio: Blob,
  surah: number,
  ayah: number,
  { signal, timeoutMs = 90_000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<AyahEvaluation> {
  const body = new FormData();
  body.append("surah", String(surah));
  body.append("ayah", String(ayah));
  body.append("audio", audio, `recitation.${extensionFor(audio.type)}`);

  // Combine the caller's signal with a timeout (without AbortSignal.any, which
  // older iOS Safari lacks).
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/recitations/evaluate`, {
      method: "POST",
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // caller cancelled; not a user-facing error
    if (timedOut) throw new ApiError("timeout", FRIENDLY.timeout);
    throw new ApiError("offline", FRIENDLY.offline);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  if (res.ok) return (await res.json()) as AyahEvaluation;

  const code = codeForStatus(res.status);
  let serverMessage: string | undefined;
  try {
    serverMessage = ((await res.json()) as ApiErrorBody).message;
  } catch {
    // non-JSON error body
  }
  // The API's messages for 422/503 are written for users; prefer them there.
  const message =
    (code === "no-speech" || code === "unavailable") && serverMessage ? serverMessage : FRIENDLY[code];
  throw new ApiError(code, message, res.status);
}

function extensionFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}
