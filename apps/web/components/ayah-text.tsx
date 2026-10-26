import type { AyahWord } from "@repo/quran-data";
import type { WordResult } from "@repo/types";
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
  ayahNumber?: number;
  className?: string;
}

/** Uthmani ayah text, word by word, with waqf marks and an end-of-ayah marker. */
export function AyahText({ words, results, ayahNumber, className }: AyahTextProps) {
  return (
    <p lang="ar" dir="rtl" className={cn("font-arabic text-foreground", className)}>
      {words.map((word) => {
        const result = results?.[word.index];
        const heard = result?.status === "incorrect" && result.recited;
        return (
          <span key={word.index}>
            <span
              data-word-index={word.index}
              data-status={result?.status ?? "pending"}
              title={heard ? `Heard: ${result.recited}` : undefined}
              className={cn("transition-colors duration-300", result && STATUS_CLASS[result.status])}
            >
              {word.text}
              {result && result.status !== "correct" && (
                <span className="sr-only">
                  {" "}
                  ({STATUS_LABEL[result.status]}
                  {heard ? `, heard ${result.recited}` : ""})
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
