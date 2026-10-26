// Shared contract between the evaluation engine (@repo/utils), the API and clients.

/** Result for one Uthmani display word of the ayah. */
export type WordStatus = "correct" | "incorrect" | "missing";

export interface WordResult {
  /** Index of the display word within the ayah */
  index: number;
  status: WordStatus;
  /** What was heard in place of this word (for "incorrect") */
  recited?: string;
}

/**
 * Error categories shown to the reciter.
 * - wording: a word was changed, skipped, added or repeated
 * - wasl:    joining/stopping (waṣl/waqf) — stopping where the text should be
 *            joined, or not observing a required sakt. Detected from word
 *            timing, so it is reported as "beta".
 */
export type ErrorKind = "wording" | "wasl";

export type WordingErrorType = "wrong-word" | "missing-word" | "extra-word" | "repeated-word";
export type WaslErrorType = "improper-stop" | "missed-sakt";
export type ErrorType = WordingErrorType | WaslErrorType;

export interface RecitationError {
  kind: ErrorKind;
  type: ErrorType;
  /**
   * Display word the error is about. For extra/repeated words this is the
   * word they were heard after (-1 = before the first word).
   */
  wordIndex: number;
  /** Expected word (Uthmani), when there is one */
  expected?: string;
  /** What was heard, when relevant */
  recited?: string;
  /** Human-readable explanation */
  message: string;
}

export interface AyahEvaluation {
  surah: number;
  ayah: number;
  /** Wording score 0–100: correct words ÷ (expected + extra words) */
  score: number;
  words: WordResult[];
  errors: RecitationError[];
  /** Transcript the evaluation was based on */
  transcript: string;
  /** Whether waṣl/waqf timing checks could run (needs word timestamps) */
  waslChecked: boolean;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
}
