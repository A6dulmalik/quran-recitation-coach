import type { AyahWord } from "@repo/quran-data";
import type { WordResult } from "@repo/types";
import type { LiveResult } from "@repo/utils";
import { cn } from "@/lib/utils";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

const STATUS_CLASS: Record<WordResult["status"], string> = {
  correct: "text-emerald-600 dark:text-emerald-400",
  incorrect: "text-red-600 dark:text-red-400 underline decoration-wavy decoration-red-400 underline-offset-[0.35em]",
  missing: "text-red-500/70 dark:text-red-400/70 underline decoration-dotted decoration-red-400 underline-offset-[0.35em]",
};

const STATUS_LABEL: Record<WordResult["status"], string> = {
  correct: "correct",
  incorrect: "incorrect",
  missing: "missed",
};

interface AyahTextProps {
  words: AyahWord[];
  /** Per-word results to colour the text; omit for plain reading */
  results?: WordResult[];
  /** Word-by-word feedback while the user is still reciting (ignored once results exist) */
  live?: LiveResult | null;
  /** Highlight the word the reciter should say next (live feedback only) */
  showCursor?: boolean;
  ayahNumber?: number;
  className?: string;
}

/** Uthmani ayah text, word by word, with waqf marks and an end-of-ayah marker. */
export function AyahText({ words, results, live, showCursor, ayahNumber, className }: AyahTextProps) {
  return (
    <p lang="ar" dir="rtl" className={cn("font-arabic text-foreground", className)}>
      {words.map((word) => {
        const result = results?.[word.index];
        const liveWord = result ? undefined : live?.words[word.index];
        const status = result?.status ?? (liveWord && liveWord.status !== "pending" ? liveWord.status : undefined);
        const heard = result?.status === "incorrect" ? result.recited : liveWord?.heard;
        const active = !result && !!showCursor && live?.cursor === word.index;
        return (
          <span key={word.index}>
            <span
              data-word-index={word.index}
              data-status={status ?? "pending"}
              data-active={active || undefined}
              title={heard ? `Heard: ${heard}` : undefined}
              className={cn(
                "rounded-md transition-colors duration-300",
                status && STATUS_CLASS[status],
                active && "bg-primary/10",
              )}
            >
              {word.text}
              {status && status !== "correct" && (
                <span className="sr-only">
                  {" "}
                  ({STATUS_LABEL[status]}
                  {heard ? `, heard ${heard}` : ""})
                </span>
              )}
            </span>
            {word.waqf && (
              <span className="text-primary/80 text-[0.7em] align-super mx-0.5" aria-hidden>
                {word.waqf}
              </span>
            )}{" "}
          </span>
        );
      })}
      {ayahNumber !== undefined && (
        <span className="text-primary/80 text-[0.8em] whitespace-nowrap" aria-label={`Ayah ${ayahNumber}`}>
          ﴿{toArabicDigits(ayahNumber)}﴾
        </span>
      )}
    </p>
  );
}
