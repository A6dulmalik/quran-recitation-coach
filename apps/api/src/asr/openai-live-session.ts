import { Inject, Injectable, Logger } from "@nestjs/common";
import type { LiveSession } from "@repo/types";
import { APP_CONFIG, type AppConfig } from "../config";
import { LiveSessionError, LiveSessionProvider } from "./live-session";

const SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const STREAM_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * Mints an ephemeral OpenAI Realtime transcription client secret. The browser
 * then streams microphone audio to OpenAI directly with it (apps/web live
 * recognizer). Request shape follows the GA Realtime API (`session.type:
 * "transcription"`, see the `openai` SDK's realtime/client-secrets types).
 */
@Injectable()
export class OpenAiLiveSessionProvider extends LiveSessionProvider {
  private readonly logger = new Logger(OpenAiLiveSessionProvider.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  isConfigured(): boolean {
    return !!this.config.openaiApiKey;
  }

  async create(): Promise<LiveSession> {
    if (!this.config.openaiApiKey) {
      throw new LiveSessionError("Speech recognition is not configured on the server.", 503);
    }
    let response: Response;
    try {
      response = await fetch(SECRETS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          expires_after: { anchor: "created_at", seconds: 600 },
          session: this.sessionConfig(),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error("Live session request failed", error instanceof Error ? error.message : error);
      throw new LiveSessionError("Live feedback is temporarily unavailable.", 502);
    }

    if (!response.ok) {
      // Auth errors echo part of the key, so log only the status.
      this.logger.error(`OpenAI live session failed: ${response.status}`);
      const misconfigured = response.status === 401 || response.status === 403;
      throw new LiveSessionError(
        misconfigured ? "Speech recognition is misconfigured on the server." : "Live feedback is temporarily unavailable.",
        misconfigured ? 503 : 502,
      );
    }

    const body = (await response.json()) as {
      value?: string;
      expires_at?: number;
      client_secret?: { value?: string; expires_at?: number }; // older response shape
    };
    const secret = body.value ?? body.client_secret?.value;
    if (!secret) {
      this.logger.error("OpenAI live session response had no client secret");
      throw new LiveSessionError("Live feedback is temporarily unavailable.", 502);
    }
    return {
      clientSecret: secret,
      expiresAt: body.expires_at ?? body.client_secret?.expires_at,
      url: STREAM_URL,
      model: this.config.liveAsrModel,
      sampleRate: 24_000,
    };
  }

  /** gpt-realtime-whisper streams continuously (no VAD, no prompt); other models segment speech with server VAD. */
  private sessionConfig() {
    const model = this.config.liveAsrModel;
    const streaming = model.includes("realtime-whisper");
    return {
      type: "transcription",
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24_000 },
          transcription: { model, language: "ar", ...(streaming && { delay: "low" }) },
          noise_reduction: { type: "near_field" },
          turn_detection: streaming ? null : { type: "server_vad", silence_duration_ms: 700 },
        },
      },
    };
  }
}
