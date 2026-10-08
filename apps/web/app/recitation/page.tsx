"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  getAyahWords,
  getSurahMeta,
  TANZIL_ATTRIBUTION,
  type SurahFile,
  type SurahMeta,
} from "@repo/quran-data";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  useRecitationEngine,
  type EngineAyah,
  type WordStatus,
} from "@/hooks/use-recitation-engine";
import { useSurah } from "@/lib/quran";

/** Parse ?surah=&start=&end= into a valid range, or null if invalid. */
function parseRange(params: URLSearchParams) {
  const meta = getSurahMeta(Number(params.get("surah")));
  if (!meta) return null;
  const start = params.has("start") ? Number(params.get("start")) : 1;
  const end = params.has("end") ? Number(params.get("end")) : meta.ayahCount;
  const valid =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 1 &&
    start <= end &&
    end <= meta.ayahCount;
  return valid ? { meta, start, end } : null;
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      {children}
    </div>
  );
}

function RecitationRoute() {
  const searchParams = useSearchParams();
  const range = parseRange(searchParams);
  const state = useSurah(range?.meta.number ?? 1);

  if (!range) {
    return (
      <CenteredMessage>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-lg font-semibold">That surah or verse range does not exist.</p>
        <Button asChild>
          <Link href="/select-surah">Choose a surah</Link>
        </Button>
      </CenteredMessage>
    );
  }

  if (state.status === "loading") {
    return (
      <CenteredMessage>
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-muted-foreground">Loading {range.meta.transliteration}…</p>
      </CenteredMessage>
    );
  }

  if (state.status === "error") {
    return (
      <CenteredMessage>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-lg font-semibold">Could not load {range.meta.transliteration}.</p>
        <p className="text-sm text-muted-foreground">{state.error}</p>
        <Button onClick={state.retry}>Try again</Button>
      </CenteredMessage>
    );
  }

  return (
    <RecitationSession
      key={`${range.meta.number}:${range.start}-${range.end}`}
      meta={range.meta}
      surah={state.surah}
      start={range.start}
      end={range.end}
    />
  );
}

interface RecitationSessionProps {
  meta: SurahMeta;
  surah: SurahFile;
  start: number;
  end: number;
}

function RecitationSession({ meta, surah, start, end }: RecitationSessionProps) {
  const ayahs = useMemo<EngineAyah[]>(
    () =>
      surah.ayahs.slice(start - 1, end).map((ayah) => ({
        number: ayah.number,
        words: getAyahWords(ayah).words.map((w) => w.text),
      })),
    [surah, start, end],
  );

  // ── Engine (all recitation logic lives here) ──────────────────────────────
  const engine = useRecitationEngine({ ayahs, mode: "simulation" });
  const {
    recitationState,
    verses,
    currentVerseIndex,
    currentWordIndex,
    incorrectWordIndex,
    duration,
    accuracy,
  } = engine;

  // ── DOM refs for auto-scroll (UI concern, not engine concern) ─────────────
  const verseElementRefs = useRef<Array<HTMLDivElement | null>>([]);

  // ── Auto-scroll to active verse (pure UI side-effect) ────────────────────
  useEffect(() => {
    if (
      recitationState !== "listening" &&
      recitationState !== "paused" &&
      recitationState !== "paused_on_error"
    ) {
      return;
    }

    const activeVerseEl = verseElementRefs.current[currentVerseIndex] ?? null;
    if (!activeVerseEl) return;

    const frame = requestAnimationFrame(() => {
      activeVerseEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [currentVerseIndex, recitationState]);

  const getWordClasses = (
    status: WordStatus,
    isActiveWord: boolean,
  ): string => {
    // Base: generous tap target, smooth transition
    const base =
      "inline-block px-2 py-1 rounded-md text-3xl leading-[1.8] font-arabic transition-all duration-300";

    // Active-word ring: shown on top of any status so the cursor position is always clear
    const activeRing =
      isActiveWord ?
        // "ring-2 ring-offset-1 ring-primary/60 scale-105 shadow-sm"
        ""
      : "";

    let statusClasses = "";
    switch (status) {
      case "correct":
        statusClasses =
          "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400";
        break;
      case "incorrect":
        statusClasses =
          "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 font-semibold";
        break;
      case "missing":
        statusClasses = "text-red-400 line-through opacity-50";
        break;
      case "active":
        // Legacy status kept for compat; visual controlled by isActiveWord ring
        statusClasses = "text-foreground";
        break;
      case "pending":
        statusClasses = "text-foreground/90";
        break;
    }

    return [base, statusClasses, activeRing].filter(Boolean).join(" ");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/select-surah"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="text-center">
            <h1 className="font-semibold text-foreground">
              {meta.transliteration}{" "}
              <span lang="ar" className="font-arabic">
                {meta.name}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {start === end ? `Verse ${start}` : `Verses ${start}–${end}`} of{" "}
              {meta.ayahCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">State</p>
            <p className="text-sm font-semibold text-primary capitalize">
              {recitationState.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 overflow-y-auto">
        {recitationState === "paused_on_error" &&
          (() => {
            const incorrectWord =
              incorrectWordIndex !== null ?
                verses[currentVerseIndex]?.words[incorrectWordIndex]
              : null;
            return (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-700">Incorrect word</p>
                    {incorrectWord && (
                      <p
                        className="mt-1 text-2xl font-arabic text-red-600"
                        dir="rtl"
                      >
                        {incorrectWord.text}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-red-600">
                      Verse {verses[currentVerseIndex]?.verseNumber}, word{" "}
                      {incorrectWordIndex !== null ?
                        incorrectWordIndex + 1
                      : "-"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Qur'anic Text Display */}
        {recitationState !== "completed" && (
          <div className="space-y-6 mb-12">
            {surah.bismillah && start === 1 && (
              <p
                lang="ar"
                dir="rtl"
                className="text-center text-3xl leading-[2] font-arabic text-foreground/80"
              >
                {surah.bismillah}
              </p>
            )}
            {verses.map((verse, idx) => (
              <div
                key={verse.verseNumber}
                data-verse-index={idx}
                ref={(el) => {
                  verseElementRefs.current[idx] = el;
                }}
                className={`p-6 rounded-lg border transition-all ${
                  (
                    verse.status === "active" &&
                    (recitationState === "listening" ||
                      recitationState === "paused" ||
                      recitationState === "paused_on_error")
                  ) ?
                    recitationState === "paused_on_error" ?
                      "border-red-400 bg-red-50/50"
                    : "border-primary bg-primary/5"
                  : "border-border/50 bg-card hover:border-primary/30"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-semibold mb-3 ${
                    verse.status === "completed" ?
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : verse.status === "active" ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}
                >
                  {verse.verseNumber}
                </span>
                {/* Words always rendered as individual spans */}
                <div
                  lang="ar"
                  className="flex flex-wrap gap-x-3 gap-y-2 justify-start"
                  dir="rtl"
                >
                  {verse.words.map((word, wordIdx) => {
                    const isActiveWord =
                      verse.status === "active" &&
                      recitationState === "listening" &&
                      wordIdx === currentWordIndex + 1;
                    return (
                      <span
                        key={wordIdx}
                        data-verse-index={idx}
                        data-word-index={wordIdx}
                        className={getWordClasses(word.status, isActiveWord)}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feedback View */}
        {recitationState === "completed" && (
          <div className="space-y-6">
            {/* Accuracy Score */}
            <div className="bg-card border border-border/50 rounded-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <span className="text-3xl font-bold text-primary">
                  {accuracy}%
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {accuracy >= 80 ?
                  "Excellent!"
                : accuracy >= 60 ?
                  "Good Job!"
                : "Keep Practicing"}
              </h2>
              <p className="text-muted-foreground">
                {accuracy >= 80 ?
                  "Your recitation is very accurate!"
                : "Focus on the highlighted words to improve."}
              </p>
            </div>

            {/* Verse Reviews */}
            <div className="space-y-4">
              {verses.map((verse) => {
                const hasErrors = verse.words.some(
                  (w) => w.status !== "correct" && w.status !== "pending",
                );
                return (
                  <div
                    key={verse.verseNumber}
                    className="bg-card border border-border/50 rounded-lg p-6"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {hasErrors ?
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-1" />
                      : <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-1" />
                      }
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          Verse {verse.verseNumber}
                        </h3>
                      </div>
                    </div>

                    {/* Word-by-word review using the same span structure */}
                    <div
                      lang="ar"
                      className="bg-secondary/50 rounded p-4 mb-3 flex flex-wrap gap-x-2 gap-y-1 justify-start"
                      dir="rtl"
                    >
                      {verse.words.map((word, wordIdx) => (
                        <span
                          key={wordIdx}
                          data-verse={verse.verseNumber}
                          data-word={wordIdx}
                          className={getWordClasses(word.status, false)}
                        >
                          {word.text}
                        </span>
                      ))}
                    </div>

                    {hasErrors && (
                      <div className="space-y-2 text-sm">
                        {verse.words.map((word, idx) => {
                          if (word.status === "incorrect")
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-red-50 rounded"
                              >
                                <span className="text-red-600">✗</span>
                                <span className="text-foreground">
                                  You said:{" "}
                                  <span className="font-mono">{word.text}</span>
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-foreground">
                                  Expected:{" "}
                                  <span className="font-mono text-green-600">
                                    {word.expected}
                                  </span>
                                </span>
                              </div>
                            );
                          if (word.status === "missing")
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-red-50 rounded"
                              >
                                <span className="text-red-600">✗</span>
                                <span className="text-foreground">
                                  Missing word:{" "}
                                  <span className="font-mono text-green-600">
                                    {word.text}
                                  </span>
                                </span>
                              </div>
                            );
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Qur&apos;an text:{" "}
          <a
            href={TANZIL_ATTRIBUTION.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {TANZIL_ATTRIBUTION.name}
          </a>{" "}
          ({TANZIL_ATTRIBUTION.license})
        </p>
      </main>

      {/* Floating Controls */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {recitationState !== "completed" && (
            <>
              {recitationState === "listening" && (
                <div className="mb-4 flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${20 + i * 12}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono font-bold text-primary text-lg">
                    {Math.floor(duration / 60)}:
                    {String(duration % 60).padStart(2, "0")}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                {recitationState === "idle" ?
                  <>
                    <Button
                      onClick={engine.start}
                      size="lg"
                      className="flex-1 gap-2 text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recitation
                    </Button>
                    {duration > 0 && (
                      <Button
                        onClick={engine.stop}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                : recitationState === "paused" ?
                  <>
                    <Button
                      onClick={engine.resume}
                      size="lg"
                      className="flex-1 gap-2 text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Play className="w-5 h-5" />
                      Resume
                    </Button>
                    <Button
                      onClick={engine.stop}
                      size="lg"
                      variant="destructive"
                      className="gap-2 text-lg py-6 px-6"
                    >
                      <Square className="w-5 h-5" />
                      Stop
                    </Button>
                  </>
                : recitationState === "paused_on_error" ?
                  <>
                    <Button
                      onClick={engine.tryAgain}
                      size="lg"
                      className="flex-1 gap-2 text-lg py-6 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Try Again
                    </Button>
                    <Button
                      onClick={engine.stop}
                      size="lg"
                      variant="destructive"
                      className="gap-2 text-lg py-6 px-6"
                    >
                      <Square className="w-5 h-5" />
                      Stop
                    </Button>
                  </>
                : <>
                    <Button
                      onClick={engine.pause}
                      size="lg"
                      variant="outline"
                      className="gap-2 text-lg py-6 px-6"
                    >
                      <Pause className="w-5 h-5" />
                      Pause
                    </Button>
                    <Button
                      onClick={engine.stop}
                      size="lg"
                      variant="destructive"
                      className="flex-1 gap-2 text-lg py-6"
                    >
                      <Square className="w-5 h-5" />
                      Stop
                    </Button>
                  </>
                }
              </div>
            </>
          )}

          {recitationState === "completed" && (
            <div className="flex gap-3">
              <Button
                onClick={engine.stop}
                variant="outline"
                size="lg"
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </Button>
              <Link href="/select-surah" className="flex-1">
                <Button size="lg" className="w-full">
                  Choose Different Surah
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RecitationRoute />
    </Suspense>
  );
}
