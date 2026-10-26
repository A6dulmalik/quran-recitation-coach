import type { AyahEvaluation } from "@repo/types";

// State machine for one practice session over a range of ayahs:
//   idle → recording → evaluating → evaluated | error → (try again) recording …
// Pure: the page wires it to the recorder, the API and the progress store.

export type Phase = "idle" | "recording" | "evaluating" | "evaluated" | "error";

export interface AyahAttempts {
  count: number;
  latest?: AyahEvaluation;
  best?: AyahEvaluation;
}

export interface PracticeState {
  /** Ayah numbers in this session, in order */
  ayahs: number[];
  index: number;
  phase: Phase;
  error?: string;
  attempts: Record<number, AyahAttempts>;
  /** Object URL of the user's latest recording of the current ayah */
  recordingUrl?: string;
  finished: boolean;
}

export type PracticeAction =
  | { type: "go"; index: number }
  | { type: "recording-started" }
  | { type: "recording-failed"; message: string }
  | { type: "submitted"; recordingUrl: string }
  | { type: "evaluated"; result: AyahEvaluation }
  | { type: "evaluation-failed"; message: string }
  | { type: "dismiss-error" }
  | { type: "finish" }
  | { type: "restart"; ayahs: number[] };

export function initialPracticeState(ayahs: number[], startAt = ayahs[0]): PracticeState {
  return {
    ayahs,
    index: Math.max(0, ayahs.indexOf(startAt)),
    phase: "idle",
    attempts: {},
    finished: false,
  };
}

/** Show the latest result for the ayah you navigate to, if there is one. */
function phaseFor(state: PracticeState, index: number): Phase {
  return state.attempts[state.ayahs[index]]?.latest ? "evaluated" : "idle";
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case "go": {
      if (action.index < 0 || action.index >= state.ayahs.length) return state;
      if (state.phase === "recording" || state.phase === "evaluating") return state;
      return {
        ...state,
        index: action.index,
        phase: phaseFor(state, action.index),
        error: undefined,
        recordingUrl: undefined,
        finished: false,
      };
    }
    case "recording-started":
      return { ...state, phase: "recording", error: undefined, recordingUrl: undefined };
    case "recording-failed":
      return { ...state, phase: "error", error: action.message };
    case "submitted":
      return { ...state, phase: "evaluating", recordingUrl: action.recordingUrl };
    case "evaluated": {
      const ayah = action.result.ayah;
      const prev = state.attempts[ayah];
      const best =
        !prev?.best || action.result.score >= prev.best.score ? action.result : prev.best;
      return {
        ...state,
        phase: "evaluated",
        attempts: {
          ...state.attempts,
          [ayah]: { count: (prev?.count ?? 0) + 1, latest: action.result, best },
        },
      };
    }
    case "evaluation-failed":
      return { ...state, phase: "error", error: action.message };
    case "dismiss-error":
      return { ...state, phase: phaseFor(state, state.index), error: undefined };
    case "finish":
      return { ...state, finished: true, phase: "idle" };
    case "restart":
      return { ...initialPracticeState(action.ayahs), attempts: state.attempts };
  }
}

export interface SessionSummary {
  practiced: number;
  total: number;
  mastered: number;
  /** Average of each practiced ayah's best score */
  averageScore: number;
  /** Ayahs practiced but not yet at 100 */
  needsWork: number[];
}

export function summarize(state: PracticeState): SessionSummary {
  const practiced = state.ayahs.filter((a) => state.attempts[a]?.best);
  const scores = practiced.map((a) => state.attempts[a]!.best!.score);
  return {
    practiced: practiced.length,
    total: state.ayahs.length,
    mastered: scores.filter((s) => s === 100).length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    needsWork: practiced.filter((a) => state.attempts[a]!.best!.score < 100),
  };
}
