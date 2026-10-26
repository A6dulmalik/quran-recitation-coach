import type { AyahEvaluation } from "@repo/types";
import { describe, expect, it } from "vitest";
import { initialPracticeState, practiceReducer, summarize, type PracticeAction } from "./practice-session";

const result = (ayah: number, score: number): AyahEvaluation => ({
  surah: 1,
  ayah,
  score,
  words: [],
  errors: [],
  transcript: "",
  waslChecked: false,
});

const run = (actions: PracticeAction[], ayahs = [1, 2, 3]) =>
  actions.reduce(practiceReducer, initialPracticeState(ayahs));

describe("practiceReducer", () => {
  it("goes through record → evaluate", () => {
    const state = run([
      { type: "recording-started" },
      { type: "submitted", recordingUrl: "blob:1" },
      { type: "evaluated", result: result(1, 75) },
    ]);
    expect(state.phase).toBe("evaluated");
    expect(state.recordingUrl).toBe("blob:1");
    expect(state.attempts[1]).toMatchObject({ count: 1, latest: { score: 75 }, best: { score: 75 } });
  });

  it("keeps the best attempt while showing the latest", () => {
    const state = run([
      { type: "evaluated", result: result(1, 90) },
      { type: "evaluated", result: result(1, 60) },
    ]);
    expect(state.attempts[1].count).toBe(2);
    expect(state.attempts[1].latest?.score).toBe(60);
    expect(state.attempts[1].best?.score).toBe(90);
  });

  it("does not navigate away while recording or evaluating", () => {
    const recording = run([{ type: "recording-started" }, { type: "go", index: 1 }]);
    expect(recording.index).toBe(0);
    const evaluating = run([{ type: "submitted", recordingUrl: "x" }, { type: "go", index: 1 }]);
    expect(evaluating.index).toBe(0);
  });

  it("shows an ayah's previous result when navigating back to it", () => {
    const state = run([
      { type: "evaluated", result: result(1, 100) },
      { type: "go", index: 1 },
      { type: "go", index: 0 },
    ]);
    expect(state.phase).toBe("evaluated");
    expect(state.recordingUrl).toBeUndefined();
  });

  it("ignores out-of-range navigation", () => {
    expect(run([{ type: "go", index: 5 }]).index).toBe(0);
    expect(run([{ type: "go", index: -1 }]).index).toBe(0);
  });

  it("recovers from errors", () => {
    const state = run([{ type: "evaluation-failed", message: "offline" }]);
    expect(state).toMatchObject({ phase: "error", error: "offline" });
    expect(practiceReducer(state, { type: "dismiss-error" }).phase).toBe("idle");
  });

  it("restarts with a subset of ayahs and keeps earlier attempts", () => {
    const state = run([
      { type: "evaluated", result: result(1, 100) },
      { type: "go", index: 1 },
      { type: "evaluated", result: result(2, 50) },
      { type: "finish" },
      { type: "restart", ayahs: [2] },
    ]);
    expect(state.ayahs).toEqual([2]);
    expect(state.finished).toBe(false);
    expect(state.attempts[2].best?.score).toBe(50);
  });

  it("starts at a requested ayah", () => {
    expect(initialPracticeState([4, 5, 6], 5).index).toBe(1);
  });
});

describe("summarize", () => {
  it("counts mastery and lists ayahs that need work", () => {
    const state = run([
      { type: "evaluated", result: result(1, 100) },
      { type: "go", index: 1 },
      { type: "evaluated", result: result(2, 60) },
    ]);
    expect(summarize(state)).toEqual({
      practiced: 2,
      total: 3,
      mastered: 1,
      averageScore: 80,
      needsWork: [2],
    });
  });
});
