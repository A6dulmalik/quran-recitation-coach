import { Inject, Injectable, Logger } from "@nestjs/common";
import type { LiveSession } from "@repo/types";
import { APP_CONFIG, type AppConfig } from "../config";
import { LiveSessionError, LiveSessionProvider } from "./live-session";

const SESSIONS_URL = "https://api.openai.com/v1/realtime/transcription_sessions";
const STREAM_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * Mints an ephemeral OpenAI Realtime transcription token. The browser then
 * streams microphone audio to OpenAI directly with it (apps/web live recognizer).
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
      response = await fetch(SESSIONS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          input_audio_transcription: { model: this.config.liveAsrModel, language: "ar" },
          turn_detection: { type: "server_vad", silence_duration_ms: 900 },
          input_audio_noise_reduction: { type: "near_field" },
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

    const body = (await response.json()) as { client_secret?: { value?: string; expires_at?: number } };
    const secret = body.client_secret?.value;
    if (!secret) {
      this.logger.error("OpenAI live session response had no client secret");
      throw new LiveSessionError("Live feedback is temporarily unavailable.", 502);
    }
    return {
      clientSecret: secret,
      expiresAt: body.client_secret?.expires_at,
      url: STREAM_URL,
      model: this.config.liveAsrModel,
      sampleRate: 24_000,
    };
  }
}
