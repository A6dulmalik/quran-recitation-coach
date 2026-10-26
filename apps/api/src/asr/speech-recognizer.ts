import type { RecitedWord } from "@repo/utils";
import type { AudioFormat } from "./audio-format";

export interface Transcription {
  text: string;
  /** Word-level timing, when the provider supports it (enables waṣl checks) */
  words?: RecitedWord[];
}

/** Speech-to-text provider. Implemented by OpenAiSpeechRecognizer; faked in tests. */
export abstract class SpeechRecognizer {
  /** Whether the provider is configured (e.g. has an API key). */
  abstract isConfigured(): boolean;
  abstract transcribe(audio: Buffer, format: AudioFormat): Promise<Transcription>;
}

/** Raised by recognizers with a status the controller can pass on to clients. */
export class SpeechRecognitionError extends Error {
  constructor(
    message: string,
    readonly status: 422 | 502 | 503,
  ) {
    super(message);
  }
}
