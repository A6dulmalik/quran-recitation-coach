"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, Mic, Square, Volume2 } from "lucide-react";
import { getAyahWords, TANZIL_ATTRIBUTION, type SurahFile } from "@repo/quran-data";
import { AyahText } from "@/components/ayah-text";
import { ErrorState, InvalidRangeState, LoadingState } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useProgress } from "@/hooks/use-progress";
import { ayahKey, MASTERY_SCORE } from "@/lib/progress";
import { useSurah } from "@/lib/quran";
import { describeRange, parseRange, rangeQuery, type AyahRange } from "@/lib/range";
import { referenceAudioUrl, RECITER_NAME } from "@/lib/reference-audio";

export default function ReadPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <ReadRoute />
    </Suspense>
  );
}

function ReadRoute() {
  const range = parseRange(useSearchParams());
  const surah = useSurah(range?.meta.number ?? 1);
  if (!range) return <InvalidRangeState />;
  if (surah.status === "loading") return <LoadingState label={`Loading ${range.meta.transliteration}…`} />;
  if (surah.status === "error") {
    return <ErrorState title={`Could not load ${range.meta.transliteration}.`} detail={surah.error} onRetry={surah.retry} />;
  }
  return <ReadView range={range} surah={surah.surah} />;
}

function ReadView({ range, surah }: { range: AyahRange; surah: SurahFile }) {
  const { meta } = range;
  const progress = useProgress();
  const player = useAudioPlayer();
  const ayahs = useMemo(
    () => surah.ayahs.slice(range.start - 1, range.end).map((a) => ({ number: a.number, words: getAyahWords(a) })),
    [surah, range.start, range.end],
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/surahs">
              <ChevronLeft className="size-4" /> Surahs
            </Link>
          </Button>
          <div className="text-center">
            <h1 className="font-semibold">
              {meta.transliteration}{" "}
              <span lang="ar" className="font-arabic">
                {meta.name}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">{describeRange(range, meta.ayahCount)}</p>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href={`/practice?${rangeQuery({ surah: meta.number, start: range.start, end: range.end })}`}>
              <Mic className="size-4" /> Practice
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {surah.bismillah && range.start === 1 && (
          <p lang="ar" dir="rtl" className="font-arabic py-2 text-center text-3xl">
            {surah.bismillah}
          </p>
        )}

        {ayahs.map(({ number, words }) => {
          const url = referenceAudioUrl(meta.number, number);
          const status = player.statusFor(url);
          const mastered = (progress.ayahs[ayahKey(meta.number, number)]?.best ?? 0) >= MASTERY_SCORE;
          return (
            <article
              key={number}
              aria-label={`Ayah ${number}`}
              className="rounded-2xl border border-border/60 bg-card p-5 [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Ayah {number}
                  </span>
                  {mastered && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="size-3.5" aria-hidden /> Perfect
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => player.toggle(url)}
                    aria-label={status === "playing" ? `Stop ayah ${number}` : `Listen to ayah ${number} (${RECITER_NAME})`}
                  >
                    {status === "loading" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : status === "playing" ? (
                      <Square className="size-3.5 fill-current" />
                    ) : status === "error" ? (
                      <AlertCircle className="size-4 text-destructive" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                  </Button>
                  <Button asChild variant="ghost" size="icon" aria-label={`Practice from ayah ${number}`}>
                    <Link
                      href={`/practice?${rangeQuery({ surah: meta.number, start: range.start, end: range.end, from: number })}`}
                    >
                      <Mic className="size-4" />
                    </Link>
                  </Button>
                </span>
              </div>
              <AyahText
                words={words.words}
                ayahNumber={number}
                className="text-right text-[1.7rem] leading-[2.3] sm:text-[1.9rem]"
              />
            </article>
          );
        })}

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Qur&apos;an text:{" "}
          <a href={TANZIL_ATTRIBUTION.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {TANZIL_ATTRIBUTION.name}
          </a>{" "}
          · Recitation: {RECITER_NAME}
        </p>
      </main>
    </div>
  );
}
