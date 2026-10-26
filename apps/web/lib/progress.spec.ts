import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  nextAyahToPractice,
  parseStoredProgress,
  streakDays,
  surahProgress,
  totals,
  withAttempt,
  withSession,
  type SessionRecord,
} from "./progress";

const range = { start: 1, end: 7 };
const at = (iso: string) => new Date(iso);

describe("withAttempt", () => {
  it("tracks best score, attempts, activity and last position", () => {
    let state = withAttempt(EMPTY_PROGRESS, { surah: 1, ayah: 2, score: 80 }, range, at("2026-10-01T10:00:00"));
    state = withAttempt(state, { surah: 1, ayah: 2, score: 60 }, range, at("2026-10-01T11:00:00"));
    expect(state.ayahs["1:2"]).toMatchObject({ best: 80, attempts: 2 });
    expect(state.activityDays).toEqual(["2026-10-01"]);
    expect(state.lastPosition).toMatchObject({ surah: 1, ayah: 2, start: 1, end: 7 });
  });
});

describe("surahProgress / totals / nextAyahToPractice", () => {
  const state = [
    { ayah: 1, score: 100 },
    { ayah: 2, score: 100 },
    { ayah: 3, score: 70 },
  ].reduce((s, a) => withAttempt(s, { surah: 1, ...a }, range), EMPTY_PROGRESS);

  it("counts mastered ayahs against the surah length", () => {
    expect(surahProgress(state, 1)).toEqual({ total: 7, practiced: 3, mastered: 2, percent: 29 });
    expect(totals(state)).toMatchObject({ ayahsPracticed: 3, ayahsMastered: 2 });
  });

  it("resumes at the first ayah that is not mastered", () => {
    expect(nextAyahToPractice(state, 1, 1, 7)).toBe(3);
    expect(nextAyahToPractice(state, 1, 1, 2)).toBe(1); // all mastered → start over
  });
});

describe("streakDays", () => {
  const withDays = (days: string[]) => ({ ...EMPTY_PROGRESS, activityDays: days });

  it("counts consecutive days ending today or yesterday", () => {
    expect(streakDays(withDays(["2026-10-07", "2026-10-06", "2026-10-04"]), at("2026-10-07T09:00:00"))).toBe(2);
    expect(streakDays(withDays(["2026-10-06", "2026-10-05"]), at("2026-10-07T09:00:00"))).toBe(2);
    expect(streakDays(withDays(["2026-10-01"]), at("2026-10-07T09:00:00"))).toBe(0);
  });
});

describe("withSession", () => {
  it("keeps sessions newest first and replaces by id", () => {
    const s = (id: string): SessionRecord => ({
      id,
      surah: 1,
      start: 1,
      end: 7,
      startedAt: "",
      endedAt: "",
      ayahs: [],
    });
    const state = withSession(withSession(withSession(EMPTY_PROGRESS, s("a")), s("b")), s("a"));
    expect(state.sessions.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("parseStoredProgress", () => {
  it("falls back to empty progress for missing, corrupt or old data", () => {
    expect(parseStoredProgress(null)).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress("{not json")).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress(JSON.stringify({ version: 0 }))).toBe(EMPTY_PROGRESS);
  });

  it("round-trips valid progress", () => {
    const state = withAttempt(EMPTY_PROGRESS, { surah: 2, ayah: 255, score: 100 }, { start: 255, end: 255 });
    expect(parseStoredProgress(JSON.stringify(state))).toEqual(state);
  });
});
