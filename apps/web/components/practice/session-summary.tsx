import Link from "next/link";
import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PracticeState, SessionSummary as Summary } from "@/lib/practice-session";
import { ScoreRing } from "./score-ring";

interface SessionSummaryProps {
  summary: Summary;
  state: PracticeState;
  surahName: string;
  onReview: (ayahs: number[]) => void;
  onJump: (index: number) => void;
}

export function SessionSummary({ summary, state, surahName, onReview, onJump }: SessionSummaryProps) {
  const allMastered = summary.practiced === summary.total && summary.needsWork.length === 0;
  const unpracticed = state.ayahs.filter((a) => !state.attempts[a]);

  return (
    <section aria-labelledby="summary-title" className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="size-7 text-primary" aria-hidden />
        </div>
        <h2 id="summary-title" className="text-xl font-bold">
          {allMastered ? "Mastered!" : "Session complete"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {surahName} · {summary.practiced} of {summary.total} ayahs practiced · {summary.mastered} perfect
        </p>
        <div className="mt-4 flex justify-center">
          <ScoreRing score={summary.averageScore} size={88} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Average of your best attempts</p>
      </div>

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Ayah results">
        {state.ayahs.map((ayah, index) => {
          const best = state.attempts[ayah]?.best;
          return (
            <li key={ayah}>
              <button
                type="button"
                onClick={() => onJump(index)}
                className="w-full rounded-lg border border-border/60 bg-card p-2 text-center hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ayah ${ayah}: ${best ? `best score ${best.score}` : "not practiced"}`}
              >
                <span className="block text-xs text-muted-foreground">Ayah {ayah}</span>
                <span
                  className={
                    !best
                      ? "text-sm text-muted-foreground"
                      : best.score === 100
                        ? "text-sm font-semibold text-emerald-600"
                        : "text-sm font-semibold text-amber-600"
                  }
                >
                  {best ? best.score : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row">
        {summary.needsWork.length + unpracticed.length > 0 && (
          <Button
            size="lg"
            className="flex-1 gap-2"
            onClick={() => onReview([...summary.needsWork, ...unpracticed].sort((a, b) => a - b))}
          >
            <RotateCcw className="size-4" aria-hidden />
            Practice the {summary.needsWork.length + unpracticed.length} remaining ayah
            {summary.needsWork.length + unpracticed.length === 1 ? "" : "s"}
          </Button>
        )}
        <Button asChild size="lg" variant={allMastered ? "default" : "outline"} className="flex-1">
          <Link href="/surahs">Choose another surah</Link>
        </Button>
      </div>
    </section>
  );
}
