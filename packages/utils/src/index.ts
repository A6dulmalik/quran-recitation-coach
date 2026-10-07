export type SessionSummary = {
  surah: number;
  startVerse: number;
  endVerse: number;
  accuracy: number;
};

// Arabic Unicode ranges for diacritics (harakat) and tatweel
const HARAKAT_REGEX =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;

// Common letter normalizations:
//   أ إ آ ٱ  →  ا   (alef variants → bare alef)
//   ة        →  ه   (taa marbuta → haa)
//   ى        →  ي   (alef maqsura → yaa)
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g; // آ أ إ ٱ
const TAA_MARBUTA = /\u0629/g; // ة
const ALEF_MAQSURA = /\u0649/g; // ى
const TATWEEL = /\u0640/g; // ـ

/**
 * Remove diacritics and normalize common Arabic letter variations.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(HARAKAT_REGEX, "")
    .replace(TATWEEL, "")
    .replace(ALEF_VARIANTS, "\u0627") // → ا
    .replace(TAA_MARBUTA, "\u0647") // → ه
    .replace(ALEF_MAQSURA, "\u064A"); // → ي
}

/**
 * Split Arabic text into an array of words, trimming surrounding whitespace.
 */
export function tokenizeArabic(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

// ─── Comparison ─────────────────────────────────────────────────────────────

export type WordStatus = "correct" | "incorrect" | "missing";

export type ComparedWord = {
  text: string;
  status: WordStatus;
  expected?: string;
};

export type ComparisonResult = {
  words: ComparedWord[];
  accuracy: number;
};

/**
 * Compare expected Qur'an text against user-recited text word-by-word.
 *
 * Both inputs are normalized then tokenized before comparison.
 * - Matching words      → "correct"
 * - Differing words     → "incorrect" (expected word is attached)
 * - Extra expected words with nothing recited → "missing"
 */
export function compareRecitation(
  expected: string,
  recited: string,
): ComparisonResult {
  const expectedWords = tokenizeArabic(normalizeArabic(expected));
  const recitedWords = tokenizeArabic(normalizeArabic(recited));

  const words: ComparedWord[] = [];
  let correct = 0;

  // Two-pointer MVP alignment so missing middle words don't shift all following words.
  let i = 0; // expected pointer
  let j = 0; // recited pointer

  while (i < expectedWords.length) {
    const exp = expectedWords[i];
    const rec = recitedWords[j];

    if (rec === undefined) {
      words.push({ text: exp, status: "missing" });
      i++;
      continue;
    }

    if (rec === exp) {
      words.push({ text: exp, status: "correct" });
      correct++;
      i++;
      j++;
      continue;
    }

    // If next expected equals current recited, current expected word was skipped.
    if (expectedWords[i + 1] !== undefined && expectedWords[i + 1] === rec) {
      words.push({ text: exp, status: "missing" });
      i++;
      continue;
    }

    words.push({ text: rec, status: "incorrect", expected: exp });
    i++;
    j++;
  }

  const accuracy =
    expectedWords.length === 0 ? 0 : correct / expectedWords.length;

  return { words, accuracy };
}

export const appName = "quran-recitation-coach";

export function formatSessionLabel(session: SessionSummary): string {
  return `Surah ${session.surah} (${session.startVerse}-${session.endVerse}) • ${session.accuracy}%`;
}
