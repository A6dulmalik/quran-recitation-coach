import { z } from "zod";
import type { AyahEvaluation } from "@repo/types";
import { SURAHS } from "@repo/quran-data";

// Practice progress is stored on this device only (no accounts yet).
// Pure functions below operate on a ProgressState; the store at the bottom
// persists it to localStorage and notifies React subscribers.

const STORAGE_KEY = "qrc.progress.v1";
const MAX_SESSIONS = 50;
const MAX_ACTIVITY_DAYS = 400;

const ayahProgressSchema = z.object({
  best: z.number().min(0).max(100),
  attempts: z.number().int().min(0),
  lastPracticedAt: z.string(),
});

const sessionAyahSchema = z.object({
  ayah: z.number().int(),
  score: z.number().min(0).max(100),
  attempts: z.number().int().min(1),
  wordingErrors: z.number().int().min(0),
  waslErrors: z.number().int().min(0),
});

const sessionSchema = z.object({
  id: z.string(),
  surah: z.number().int(),
  start: z.number().int(),
  end: z.number().int(),
  startedAt: z.string(),
  endedAt: z.string(),
  ayahs: z.array(sessionAyahSchema),
});

const progressSchema = z.object({
  version: z.literal(1),
  onboarded: z.boolean(),
  /** Keyed "surah:ayah" */
  ayahs: z.record(z.string(), ayahProgressSchema),
  /** Newest first */
  sessions: z.array(sessionSchema),
  /** Local dates (YYYY-MM-DD) with at least one attempt, newest first */
  activityDays: z.array(z.string()),
  lastPosition: z
    .object({
      surah: z.number().int(),
      ayah: z.number().int(),
      start: z.number().int(),
      end: z.number().int(),
      updatedAt: z.string(),
    })
    .optional(),
});

export type ProgressState = z.infer<typeof progressSchema>;
export type SessionRecord = z.infer<typeof sessionSchema>;
export type AyahProgress = z.infer<typeof ayahProgressSchema>;

export const EMPTY_PROGRESS: ProgressState = {
  version: 1,
  onboarded: false,
  ayahs: {},
  sessions: [],
  activityDays: [],
};

export const ayahKey = (surah: number, ayah: number) => `${surah}:${ayah}`;

/** A perfect wording score means the ayah is mastered. */
export const MASTERY_SCORE = 100;

export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Pure updates ───────────────────────────────────────────────────────────

export function withAttempt(
  state: ProgressState,
  evaluation: Pick<AyahEvaluation, "surah" | "ayah" | "score">,
  range: { start: number; end: number },
  now = new Date(),
): ProgressState {
  const key = ayahKey(evaluation.surah, evaluation.ayah);
  const previous = state.ayahs[key];
  const today = localDay(now);
  return {
    ...state,
    ayahs: {
      ...state.ayahs,
      [key]: {
        best: Math.max(previous?.best ?? 0, evaluation.score),
        attempts: (previous?.attempts ?? 0) + 1,
        lastPracticedAt: now.toISOString(),
      },
    },
    activityDays:
      state.activityDays[0] === today
        ? state.activityDays
        : [today, ...state.activityDays].slice(0, MAX_ACTIVITY_DAYS),
    lastPosition: {
      surah: evaluation.surah,
      ayah: evaluation.ayah,
      start: range.start,
      end: range.end,
      updatedAt: now.toISOString(),
    },
  };
}

export function withSession(state: ProgressState, session: SessionRecord): ProgressState {
  return {
    ...state,
    sessions: [session, ...state.sessions.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS),
  };
}

// ─── Derived views ──────────────────────────────────────────────────────────

export interface SurahProgress {
  total: number;
  practiced: number;
  mastered: number;
  /** Mastered ayahs as a percentage of the surah */
  percent: number;
}

export function surahProgress(state: ProgressState, surah: number): SurahProgress {
  const total = SURAHS[surah - 1]?.ayahCount ?? 0;
  let practiced = 0;
  let mastered = 0;
  for (let ayah = 1; ayah <= total; ayah++) {
    const p = state.ayahs[ayahKey(surah, ayah)];
    if (!p) continue;
    practiced++;
    if (p.best >= MASTERY_SCORE) mastered++;
  }
  return { total, practiced, mastered, percent: total ? Math.round((100 * mastered) / total) : 0 };
}

/** Consecutive days with practice, ending today or yesterday. */
export function streakDays(state: ProgressState, now = new Date()): number {
  const days = new Set(state.activityDays);
  const cursor = new Date(now);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function totals(state: ProgressState) {
  const entries = Object.values(state.ayahs);
  return {
    ayahsPracticed: entries.length,
    ayahsMastered: entries.filter((p) => p.best >= MASTERY_SCORE).length,
    sessions: state.sessions.length,
  };
}

/** First ayah in [start, end] that is not yet mastered (or start if all are). */
export function nextAyahToPractice(state: ProgressState, surah: number, start: number, end: number) {
  for (let ayah = start; ayah <= end; ayah++) {
    if ((state.ayahs[ayahKey(surah, ayah)]?.best ?? 0) < MASTERY_SCORE) return ayah;
  }
  return start;
}

// ─── Persistence ────────────────────────────────────────────────────────────

export function parseStoredProgress(raw: string | null): ProgressState {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
let current: ProgressState | null = null;

function read(): ProgressState {
  if (current) return current;
  try {
    current = parseStoredProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    current = EMPTY_PROGRESS; // storage blocked (private mode, disabled cookies)
  }
  return current;
}

function write(next: ProgressState) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep progress in memory for this visit.
  }
  listeners.forEach((l) => l());
}

export const progressStore = {
  getSnapshot: read,
  getServerSnapshot: () => EMPTY_PROGRESS,
  subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      current = parseStoredProgress(e.newValue);
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  update(fn: (state: ProgressState) => ProgressState) {
    write(fn(read()));
  },
  reset() {
    write(EMPTY_PROGRESS);
  },
};
