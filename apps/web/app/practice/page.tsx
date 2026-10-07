"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Headphones, Loader2, Play, Square, Volume2, X } from "lucide-react";
import { getAyahWords, type AyahWords, type SurahFile } from "@repo/quran-data";
import { AyahText } from "@/components/ayah-text";
import { ErrorState, InvalidRangeState, LoadingState } from "@/components/page-states";
import { FeedbackPanel } from "@/components/practice/feedback-panel";
import { RecordButton, type RecordButtonState } from "@/components/practice/record-button";
import { SessionSummary } from "@/components/practice/session-summary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useProgress } from "@/hooks/use-progress";
import { RecorderError, useRecorder } from "@/hooks/use-recorder";
import { ApiError, evaluateRecording } from "@/lib/api";
import { initialPracticeState, practiceReducer, summarize } from "@/lib/practice-session";
import { nextAyahToPractice, progressStore, withAttempt, withSession, type SessionRecord } from "@/lib/progress";
import { useSurah } from "@/lib/quran";
import { parseRange, type AyahRange } from "@/lib/range";
import { referenceAudioUrl, RECITER_NAME } from "@/lib/reference-audio";

export default function PracticePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <PracticeRoute />
    </Suspense>
  );
}

function PracticeRoute() {
  const range = parseRange(useSearchParams());
  const surah = useSurah(range?.meta.number ?? 1);
  const progress = useProgress();

  if (!range) return <InvalidRangeState />;
  if (surah.status === "loading") return <LoadingState label={`Loading ${range.meta.transliteration}…`} />;
  if (surah.status === "error") {
    return <ErrorState title={`Could not load ${range.meta.transliteration}.`} detail={surah.error} onRetry={surah.retry} />;
  }

  const startAt = range.from ?? nextAyahToPractice(progress, range.meta.number, range.start, range.end);
  return (
    <PracticeSession
      key={`${range.meta.number}:${range.start}-${range.end}`}
      range={range}
      surah={surah.surah}
      startAt={startAt}
    />
  );
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function PracticeSession({ range, surah, startAt }: { range: AyahRange; surah: SurahFile; startAt: number }) {
  const { meta } = range;
  const ayahNumbers = useMemo(
    () => Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i),
    [range.start, range.end],
  );
  const wordsByAyah = useMemo(() => {
    const map = new Map<number, AyahWords>();
    for (const n of ayahNumbers) map.set(n, getAyahWords(surah.ayahs[n - 1]));
    return map;
  }, [surah, ayahNumbers]);

  const [state, dispatch] = useReducer(practiceReducer, undefined, () => initialPracticeState(ayahNumbers, startAt));
  const [sessionId] = useState(() => `${meta.number}-${Date.now().toString(36)}`);
  const [startedAt] = useState(() => new Date().toISOString());
  const player = useAudioPlayer();
  const abortRef = useRef<AbortController | null>(null);

  const ayah = state.ayahs[state.index];
  const words = wordsByAyah.get(ayah)!;
  const attempts = state.attempts[ayah];
  const latest = state.phase === "evaluated" ? attempts?.latest : undefined;
  const isLast = state.index === state.ayahs.length - 1;

  // ── Submitting a recording ────────────────────────────────────────────────
  const submit = useCallback(
    async (audio: Blob, ayahNumber: number) => {
      dispatch({ type: "submitted", recordingUrl: URL.createObjectURL(audio) });
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await evaluateRecording(audio, meta.number, ayahNumber, { signal: controller.signal });
        dispatch({ type: "evaluated", result });
        progressStore.update((s) => withAttempt(s, result, range));
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: "evaluation-failed",
          message: error instanceof ApiError ? error.message : "Something went wrong while checking your recitation.",
        });
      }
    },
    [meta.number, range],
  );

  const recorder = useRecorder({ onAutoStop: (audio) => void submit(audio, ayah) });

  // Object URLs for the user's recordings are released when replaced or on exit.
  useEffect(() => {
    const url = state.recordingUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.recordingUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep this session in the history after every graded attempt.
  useEffect(() => {
    const practiced = state.ayahs.filter((a) => state.attempts[a]?.best);
    if (!practiced.length) return;
    const record: SessionRecord = {
      id: sessionId,
      surah: meta.number,
      start: range.start,
      end: range.end,
      startedAt,
      endedAt: new Date().toISOString(),
      ayahs: Object.entries(state.attempts)
        .filter(([, a]) => a.best)
        .map(([n, a]) => ({
          ayah: Number(n),
          score: a.best!.score,
          attempts: a.count,
          wordingErrors: a.best!.errors.filter((e) => e.kind === "wording").length,
          waslErrors: a.best!.errors.filter((e) => e.kind === "wasl").length,
        }))
        .sort((x, y) => x.ayah - y.ayah),
    };
    progressStore.update((s) => withSession(s, record));
  }, [state.attempts, state.ayahs, sessionId, startedAt, meta.number, range.start, range.end]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const recordState: RecordButtonState =
    state.phase === "evaluating"
      ? "evaluating"
      : recorder.status === "recording"
        ? "recording"
        : recorder.status === "starting"
          ? "starting"
          : "idle";

  const toggleRecording = useCallback(async () => {
    if (recorder.status === "recording") {
      try {
        const audio = await recorder.stop();
        await submit(audio, ayah);
      } catch (error) {
        dispatch({
          type: "recording-failed",
          message: error instanceof RecorderError ? error.message : "Recording failed. Please try again.",
        });
      }
      return;
    }
    if (recorder.status !== "idle" || state.phase === "evaluating") return;
    player.stop();
    try {
      await recorder.start();
      dispatch({ type: "recording-started" });
    } catch (error) {
      dispatch({
        type: "recording-failed",
        message: error instanceof RecorderError ? error.message : "Could not start recording.",
      });
    }
  }, [recorder, submit, ayah, state.phase, player]);

  const go = useCallback(
    (index: number) => {
      player.stop();
      dispatch({ type: "go", index });
    },
    [player],
  );

  // Keyboard: Space toggles recording, ←/→ move between ayahs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("button, a, input, textarea, select, [role=dialog]") || state.finished) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        void toggleRecording();
      } else if (e.key === "ArrowRight") go(state.index + 1);
      else if (e.key === "ArrowLeft") go(state.index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRecording, go, state.index, state.finished]);

  const busy = recordState !== "idle";
  const referenceUrl = referenceAudioUrl(meta.number, ayah);
  const referenceStatus = player.statusFor(referenceUrl);
  const ownStatus = state.recordingUrl ? player.statusFor(state.recordingUrl) : "idle";
  const completed = state.ayahs.filter((a) => state.attempts[a]?.best?.score === 100).length;

  const hint =
    recordState === "recording"
      ? `Listening… tap to stop · ${formatTime(recorder.elapsed)}`
      : recordState === "starting"
        ? "Starting the microphone… allow access if your browser asks"
        : recordState === "evaluating"
          ? "Checking your recitation…"
          : latest?.score === 100
            ? isLast
              ? "Well done! Finish the session or keep practicing."
              : "Well done! Continue to the next ayah."
            : latest || state.phase === "error"
              ? "Tap the microphone to try again"
              : `Tap the microphone and recite ayah ${ayah}`;

  if (state.finished) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <SessionSummary
            summary={summarize(state)}
            state={state}
            surahName={meta.transliteration}
            onReview={(ayahs) => dispatch({ type: "restart", ayahs })}
            onJump={go}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar: exit, progress, position */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-4">
          <Button asChild variant="ghost" size="icon" aria-label="Exit practice">
            <Link href="/surahs">
              <X className="size-5" />
            </Link>
          </Button>
          <Progress
            value={(completed / state.ayahs.length) * 100}
            className="h-2 flex-1"
            aria-label={`${completed} of ${state.ayahs.length} ayahs perfect`}
          />
          <span className="min-w-12 text-right text-sm tabular-nums text-muted-foreground">
            {state.index + 1}/{state.ayahs.length}
          </span>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3 pt-2 text-center">
          <h1 className="font-semibold">{meta.transliteration}</h1>
          <p lang="ar" className="font-arabic text-sm text-muted-foreground">
            {meta.name}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pb-48">
        {surah.bismillah && ayah === 1 && (
          <p lang="ar" dir="rtl" className="font-arabic text-center text-2xl text-foreground/70">
            {surah.bismillah}
          </p>
        )}

        <article
          aria-label={`Ayah ${ayah}`}
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Ayah {ayah}
            </span>
            <div className="flex items-center gap-2">
              {attempts && (
                <span className="text-xs text-muted-foreground">
                  {attempts.count} attempt{attempts.count === 1 ? "" : "s"} · best {attempts.best?.score}
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={busy}
                onClick={() => player.toggle(referenceUrl)}
                aria-label={
                  referenceStatus === "playing" ? "Stop reference recitation" : `Listen to ${RECITER_NAME}`
                }
                title={referenceStatus === "error" ? "Reference audio couldn't be loaded" : `Listen (${RECITER_NAME})`}
              >
                {referenceStatus === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : referenceStatus === "playing" ? (
                  <Square className="size-3.5 fill-current" />
                ) : referenceStatus === "error" ? (
                  <AlertCircle className="size-4 text-destructive" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <AyahText
            words={words.words}
            results={latest?.words}
            ayahNumber={ayah}
            className="text-center text-[1.75rem] leading-[2.3] sm:text-[2rem]"
          />
        </article>

        <div aria-live="polite" className="space-y-4">
          {state.phase === "error" && state.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {latest && <FeedbackPanel result={latest} />}
        </div>

        {state.recordingUrl && state.phase !== "evaluating" && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => player.toggle(state.recordingUrl!)}
          >
            {ownStatus === "playing" ? <Square className="size-3.5 fill-current" /> : <Headphones className="size-4" />}
            {ownStatus === "playing" ? "Stop" : "Hear your recitation"}
          </Button>
        )}
      </main>

      {/* Bottom controls */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/50 bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <p className="mb-3 text-center text-sm text-muted-foreground" role="status">
            {hint}
          </p>
          <div className="flex items-center justify-center gap-8">
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full"
              onClick={() => go(state.index - 1)}
              disabled={busy || state.index === 0}
              aria-label="Previous ayah"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <RecordButton state={recordState} level={recorder.level} onClick={() => void toggleRecording()} />
            {isLast ? (
              <Button
                variant={latest?.score === 100 ? "default" : "outline"}
                className="h-12 rounded-full px-4"
                onClick={() => dispatch({ type: "finish" })}
                disabled={busy}
              >
                Finish
              </Button>
            ) : (
              <Button
                variant={latest?.score === 100 ? "default" : "outline"}
                size="icon"
                className="size-12 rounded-full"
                onClick={() => go(state.index + 1)}
                disabled={busy}
                aria-label="Next ayah"
              >
                <ChevronRight className="size-5" />
              </Button>
            )}
          </div>
          {latest && latest.score < 100 && !busy && (
            <div className="mt-3 flex justify-center">
              <Button variant="link" size="sm" className="gap-1" onClick={() => player.toggle(referenceUrl)}>
                <Play className="size-3.5" /> Listen to the correct recitation first
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
