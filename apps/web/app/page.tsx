"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Flame, History } from "lucide-react";
import { getSurahMeta } from "@repo/quran-data";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProgress } from "@/hooks/use-progress";
import { nextAyahToPractice, streakDays, surahProgress, totals } from "@/lib/progress";
import { describeRange, rangeQuery } from "@/lib/range";

const QUICK_START = [1, 112, 113, 114, 67, 36];

export default function HomePage() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !progress.onboarded) router.replace("/onboarding");
  }, [hydrated, progress.onboarded, router]);

  if (!hydrated || !progress.onboarded) return <LoadingState label="Loading…" />;

  const last = progress.lastPosition;
  const lastMeta = last ? getSurahMeta(last.surah) : undefined;
  const lastProgress = last ? surahProgress(progress, last.surah) : undefined;
  const { ayahsMastered, sessions } = totals(progress);
  const streak = streakDays(progress);

  return (
    <AppShell>
      <div className="space-y-6">
        {last && lastMeta && lastProgress ? (
          <section
            aria-labelledby="continue-title"
            className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">Continue</p>
                <h2 id="continue-title" className="mt-1 text-2xl font-bold">
                  {lastMeta.transliteration}
                </h2>
                <p className="text-sm opacity-80">{describeRange(last, lastMeta.ayahCount)}</p>
              </div>
              <span lang="ar" className="font-arabic text-3xl">
                {lastMeta.name}
              </span>
            </div>
            <Progress
              value={lastProgress.percent}
              className="mt-4 h-2 bg-primary-foreground/25 [&>div]:bg-primary-foreground"
              aria-label={`${lastProgress.percent}% of the surah mastered`}
            />
            <p className="mt-2 text-sm opacity-90">
              {lastProgress.mastered} of {lastProgress.total} ayahs perfect
            </p>
            <Button asChild variant="secondary" size="lg" className="mt-4 w-full gap-2">
              <Link
                href={`/practice?${rangeQuery({
                  surah: last.surah,
                  start: last.start,
                  end: last.end,
                  from: nextAyahToPractice(progress, last.surah, last.start, last.end),
                })}`}
              >
                Resume practice <ArrowRight className="size-4" />
              </Link>
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md">
            <h2 className="text-2xl font-bold">Start your first session</h2>
            <p className="mt-1 text-sm opacity-90">
              Recite one ayah at a time and get word-by-word feedback.
            </p>
            <Button asChild variant="secondary" size="lg" className="mt-4 w-full gap-2">
              <Link href="/practice?surah=1">
                Begin with Al-Fatiha <ArrowRight className="size-4" />
              </Link>
            </Button>
          </section>
        )}

        <section aria-label="Your progress" className="grid grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, value: ayahsMastered, label: "Ayahs perfect" },
            { icon: Flame, value: streak, label: streak === 1 ? "Day streak" : "Days streak" },
            { icon: History, value: sessions, label: "Sessions" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card p-3 text-center">
              <Icon className="mx-auto size-5 text-primary" aria-hidden />
              <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="quick-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="quick-title" className="font-semibold">
              Practice a surah
            </h2>
            <Link href="/surahs" className="text-sm font-medium text-primary">
              All 114 →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_START.map((n) => {
              const meta = getSurahMeta(n)!;
              const p = surahProgress(progress, n);
              return (
                <li key={n}>
                  <Link
                    href={`/practice?surah=${n}`}
                    className="block rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{meta.transliteration}</span>
                      <span lang="ar" className="font-arabic text-lg">
                        {meta.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta.ayahCount} ayahs{p.mastered ? ` · ${p.percent}% perfect` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {progress.sessions.length > 0 && (
          <section aria-labelledby="recent-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-title" className="font-semibold">
                Recent sessions
              </h2>
              <Link href="/progress" className="text-sm font-medium text-primary">
                See all →
              </Link>
            </div>
            <ul className="space-y-2">
              {progress.sessions.slice(0, 3).map((s) => {
                const meta = getSurahMeta(s.surah)!;
                const avg = Math.round(s.ayahs.reduce((sum, a) => sum + a.score, 0) / s.ayahs.length);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/practice?${rangeQuery({ surah: s.surah, start: s.start, end: s.end })}`}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40"
                    >
                      <span>
                        <span className="block text-sm font-medium">{meta.transliteration}</span>
                        <span className="text-xs text-muted-foreground">
                          {describeRange(s, meta.ayahCount)} · {new Date(s.endedAt).toLocaleDateString()}
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

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" aria-hidden />
          Progress is saved on this device.
        </p>
      </div>
    </AppShell>
  );
}
