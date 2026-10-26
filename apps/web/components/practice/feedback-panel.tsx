import { AlertCircle, CheckCircle2, Info, PauseCircle } from "lucide-react";
import type { AyahEvaluation, RecitationError } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScoreRing } from "./score-ring";

function headline(score: number, errorCount: number) {
  if (score === 100 && errorCount === 0) return { title: "Perfect recitation", body: "Every word was correct." };
  if (score === 100) return { title: "All words correct", body: "Have a look at the joining/stopping notes below." };
  if (score >= 75) return { title: "Almost there", body: "Review the highlighted words and try again." };
  return { title: "Keep practicing", body: "Listen to the reference recitation, then try again." };
}

/** English message with «quoted» Arabic words rendered as isolated RTL runs. */
function Message({ text }: { text: string }) {
  const parts = text.split(/«([^»]+)»/);
  return (
    <span dir="ltr">
      {parts.map((part, k) =>
        k % 2 === 1 ? (
          <bdi key={k} lang="ar" dir="rtl" className="font-arabic text-base font-semibold">
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function ErrorList({ errors }: { errors: RecitationError[] }) {
  return (
    <ul className="space-y-2">
      {errors.map((error, k) => (
        <li key={k} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
          <Message text={error.message} />
        </li>
      ))}
    </ul>
  );
}

export function FeedbackPanel({ result }: { result: AyahEvaluation }) {
  const wording = result.errors.filter((e) => e.kind === "wording");
  const wasl = result.errors.filter((e) => e.kind === "wasl");
  const { title, body } = headline(result.score, result.errors.length);

  return (
    <section aria-label="Feedback" className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.score} />
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-1.5">
            {result.score === 100 && wasl.length === 0 && (
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
            )}
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>

      {wording.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-red-900 dark:text-red-200">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <AlertCircle className="size-4" aria-hidden />
            Wording · {wording.length}
          </h3>
          <ErrorList errors={wording} />
        </div>
      )}

      {wasl.length > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-900 dark:text-amber-200">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <PauseCircle className="size-4" aria-hidden />
            Waṣl / waqf · {wasl.length}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="ml-1 cursor-help border-amber-400 text-amber-800 dark:text-amber-200">
                    beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-60">
                  Joining and stopping are judged from the timing of your recording. They don&apos;t lower your
                  score while this check is being calibrated.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <ErrorList errors={wasl} />
        </div>
      )}

      {!result.waslChecked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" aria-hidden />
          Joining/stopping (waṣl) wasn&apos;t checked for this attempt.
        </p>
      )}
    </section>
  );
}
