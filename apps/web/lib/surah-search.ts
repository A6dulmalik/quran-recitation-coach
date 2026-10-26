import { skeleton, type SurahMeta } from "@repo/quran-data";

/**
 * Fold a Latin transliteration so spelling variants match:
 * "Al-Faatiha" / "al fatiha" / "fatihah" → "alfatiha".
 */
export function foldLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9]/g, "") // spaces, hyphens, apostrophes
    .replace(/ee/g, "i") // yaseen → yasin
    .replace(/oo/g, "u") // yoonus → yunus
    .replace(/aw/g, "au") // tawba → tauba
    .replace(/dh/g, "d") // dhuha → duha
    .replace(/(.)\1+/g, "$1") // aa → a, ll → l
    .replace(/h$/, ""); // fatihah → fatiha
}

export function matchesSurah(surah: SurahMeta, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(surah.number).startsWith(q);

  if (/[؀-ۿ]/.test(q)) return skeleton(surah.name).includes(skeleton(q));

  const folded = foldLatin(q);
  if (!folded) return true;
  return (
    foldLatin(surah.transliteration).includes(folded) ||
    foldLatin(surah.translation).includes(folded)
  );
}
