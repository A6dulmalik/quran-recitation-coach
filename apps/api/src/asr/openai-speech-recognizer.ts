import { Inject, Injectable, Logger } from "@nestjs/common";
import OpenAI, { toFile } from "openai";
import { APP_CONFIG, type AppConfig } from "../config";
import type { AudioFormat } from "./audio-format";
import { SpeechRecognitionError, SpeechRecognizer, type Transcription } from "./speech-recognizer";

const MIME: Record<AudioFormat, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  flac: "audio/flac",
};

/** OpenAI speech-to-text. Only whisper-1 returns word timestamps. */
@Injectable()
export class OpenAiSpeechRecognizer extends SpeechRecognizer {
  private readonly logger = new Logger(OpenAiSpeechRecognizer.name);
  private client?: OpenAI;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  isConfigured(): boolean {
    return !!this.config.openaiApiKey;
  }

  async transcribe(audio: Buffer, format: AudioFormat): Promise<Transcription> {
    if (!this.config.openaiApiKey) {
      throw new SpeechRecognitionError("Speech recognition is not configured on the server.", 503);
    }
    this.client ??= new OpenAI({ apiKey: this.config.openaiApiKey, timeout: 60_000, maxRetries: 1 });

    const file = await toFile(audio, `recitation.${format}`, { type: MIME[format] });
    const withTimestamps = this.config.asrModel === "whisper-1";

    try {
      if (withTimestamps) {
        const result = await this.client.audio.transcriptions.create({
          model: this.config.asrModel,
          file,
          language: "ar",
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
        });
        return {
          text: result.text.trim(),
          words: result.words?.map((w) => ({ text: w.word, start: w.start, end: w.end })),
        };
      }

      const result = await this.client.audio.transcriptions.create({
        model: this.config.asrModel,
        file,
        language: "ar",
        response_format: "json",
      });
      return { text: result.text.trim() };
    } catch (error) {
      throw this.toRecognitionError(error);
    }
  }

  private toRecognitionError(error: unknown): SpeechRecognitionError {
    if (error instanceof OpenAI.APIError) {
      // Auth error messages echo part of the key, so log only the status for those.
      const detail = error.status === 401 || error.status === 403 ? "" : ` ${error.message}`;
      this.logger.error(`OpenAI transcription failed: ${error.status}${detail}`);
      if (error.status === 400) {
        return new SpeechRecognitionError("The recording could not be processed. Please try again.", 422);
      }
      if (error.status === 401 || error.status === 403) {
        return new SpeechRecognitionError("Speech recognition is misconfigured on the server.", 503);
      }
      if (error.status === 429) {
        return new SpeechRecognitionError("Speech recognition is busy. Please try again shortly.", 503);
      }
    } else {
      this.logger.error("Transcription request failed", error instanceof Error ? error.stack : error);
    }
    return new SpeechRecognitionError("Speech recognition is temporarily unavailable.", 502);
  }
}
