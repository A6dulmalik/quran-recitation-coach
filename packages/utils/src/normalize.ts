// Arabic normalization for matching recited (speech-recognition) text against
// the plain-spelling Qur'an text. Both sides go through the same function, so
// it only needs to fold spelling variations, never pronunciation differences.

// Harakat, Qur'anic annotation marks and tatweel.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Remove diacritics and fold letter variants that differ only in spelling. */
export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS, "")
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ؤئ]/g, "ء") // ؤ ئ → ء (seat spelling varies: مسؤول/مسئول)
    .replace(/ی/g, "ي") // Persian ی → ي (ASR sometimes emits it)
    .replace(/ک/g, "ك") // Persian ک → ك
    .replace(/ہ/g, "ه") // Urdu ہ → ه
    .replace(/وو/g, "و"); // وو → و (داوود / داود)
  // Initial alif-hamza is folded (ASR often omits it), but hamza itself is kept:
  // dropping it would make ماء ("water") match ما ("what").
}

/**
 * Split text into normalized word tokens, dropping punctuation, digits and
 * anything that is not an Arabic letter.
 */
export function tokenizeArabic(text: string): string[] {
  return normalizeArabic(text)
    .replace(/[^ءا-غف-ي\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
