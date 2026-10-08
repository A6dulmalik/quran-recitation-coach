"use client";

import Link from "next/link";
import { CheckCircle2, Flame, History } from "lucide-react";
import { getSurahMeta, SURAHS } from "@repo/quran-data";
import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProgress } from "@/hooks/use-progress";
import { progressStore, streakDays, surahProgress, totals } from "@/lib/progress";
import { describeRange, rangeQuery } from "@/lib/range";

export default function ProgressPage() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const { ayahsPracticed, ayahsMastered, sessions } = totals(progress);
  const streak = streakDays(progress);
  const surahs = SURAHS.map((s) => ({ meta: s, p: surahProgress(progress, s.number) })).filter(
    ({ p }) => p.practiced > 0,
  );

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Your progress</h1>
      <p className="mt-1 text-sm text-muted-foreground">Saved on this device.</p>

      {hydrated && ayahsPracticed === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No practice yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your scores and sessions will appear here.</p>
          <Button asChild className="mt-4">
            <Link href="/surahs">Start practicing</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section aria-label="Totals" className="grid grid-cols-3 gap-3">
            {[
              { icon: CheckCircle2, value: ayahsMastered, label: `of ${ayahsPracticed} ayahs perfect` },
              { icon: Flame, value: streak, label: streak === 1 ? "day streak" : "days streak" },
              { icon: History, value: sessions, label: "sessions" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card p-3 text-center">
                <Icon className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </section>

          {surahs.length > 0 && (
            <section aria-labelledby="surahs-title">
              <h2 id="surahs-title" className="mb-3 font-semibold">
                Surahs
              </h2>
              <ul className="space-y-2">
                {surahs.map(({ meta, p }) => (
                  <li key={meta.number}>
                    <Link
                      href={`/practice?surah=${meta.number}`}
                      className="block rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {meta.number}. {meta.transliteration}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {p.mastered}/{p.total}
                        </span>
                      </div>
                      <Progress value={p.percent} className="mt-2 h-1.5" aria-label={`${p.percent}% perfect`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {progress.sessions.length > 0 && (
            <section aria-labelledby="history-title">
              <h2 id="history-title" className="mb-3 font-semibold">
                History
              </h2>
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                {progress.sessions.map((s) => {
                  const meta = getSurahMeta(s.surah)!;
                  const avg = Math.round(s.ayahs.reduce((sum, a) => sum + a.score, 0) / s.ayahs.length);
                  const wording = s.ayahs.reduce((n, a) => n + a.wordingErrors, 0);
                  const wasl = s.ayahs.reduce((n, a) => n + a.waslErrors, 0);
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/practice?${rangeQuery({ surah: s.surah, start: s.start, end: s.end })}`}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-primary/5"
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {meta.transliteration} · {describeRange(s, meta.ayahCount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(s.endedAt).toLocaleString()} · {s.ayahs.length} ayah
                            {s.ayahs.length === 1 ? "" : "s"} · {wording} wording, {wasl} waṣl notes
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{avg}%</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                Reset progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes your scores, streak and session history from this device. It can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => progressStore.update((s) => ({ ...s, ayahs: {}, sessions: [], activityDays: [], lastPosition: undefined }))}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppShell>
  );
}
