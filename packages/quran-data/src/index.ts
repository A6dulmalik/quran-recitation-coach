import surahIndex from "../data/surahs.json";

// ─── Records (shape of the generated JSON files) ───────────────────────────

export type Revelation = "meccan" | "medinan";

export interface SurahMeta {
  number: number;
  /** Arabic name, e.g. "الفاتحة" */
  name: string;
  /** Transliterated name, e.g. "Al-Faatiha" */
  transliteration: string;
  /** English meaning, e.g. "The Opening" */
  translation: string;
  revelation: Revelation;
  revelationOrder: number;
  ayahCount: number;
  /** Madani mushaf page (1–604) where the surah starts */
  startPage: number;
}

export interface AyahRecord {
  number: number;
  /** Uthmani script, verbatim from Tanzil (includes waqf/sakt marks) */
  text: string;
  /** Simple-Clean script (plain spelling, no diacritics), verbatim from Tanzil */
  clean: string;
  juz: number;
  page: number;
  sajdah?: "recommended" | "obligatory";
}

export interface SurahFile {
  notice: Record<string, string>;
  surah: number;
  /** Uthmani basmala shown above ayah 1 (null for Al-Fatiha and At-Tawbah) */
  bismillah: string | null;
  ayahs: AyahRecord[];
}

export const SURAHS: readonly SurahMeta[] = surahIndex as SurahMeta[];
export const SURAH_COUNT = 114;
export const AYAH_COUNT = 6236;

export const TANZIL_ATTRIBUTION = {
  name: "Tanzil Project",
  url: "https://tanzil.net",
  license: "Creative Commons Attribution 3.0",
} as const;

export function getSurahMeta(surah: number): SurahMeta | undefined {
  return Number.isInteger(surah) ? SURAHS[surah - 1] : undefined;
}

export function isValidAyahRef(surah: number, ayah: number): boolean {
  const meta = getSurahMeta(surah);
  return !!meta && Number.isInteger(ayah) && ayah >= 1 && ayah <= meta.ayahCount;
}

/** "001.json"-style file name for a surah's data file. */
export function surahFileName(surah: number): string {
  return `${String(surah).padStart(3, "0")}.json`;
}

// ─── Waqf (stop) and sakt marks ────────────────────────────────────────────

/** Pause marks printed in the Madani mushaf (Hafs). */
export const WAQF_MARKS = {
  "ۘ": { name: "Lazim", rule: "must-stop", label: "Compulsory stop" }, // ۘ
  "ۗ": { name: "Qila", rule: "stop-preferred", label: "Stopping is preferred" }, // ۗ
  "ۚ": { name: "Ja'iz", rule: "optional", label: "Stopping is permissible" }, // ۚ
  "ۖ": { name: "Sila", rule: "continue-preferred", label: "Continuing is preferred" }, // ۖ
  "ۛ": { name: "Mu'anaqah", rule: "paired", label: "Stop at one of the paired marks" }, // ۛ
  "ۙ": { name: "La", rule: "do-not-stop", label: "Do not stop" }, // ۙ
} as const;

export type WaqfMark = keyof typeof WAQF_MARKS;
export type WaqfRule = (typeof WAQF_MARKS)[WaqfMark]["rule"];

const SAKT_MARK = "ۜ"; // ۜ — brief pause without breath (Hafs)
const RUB_EL_HIZB = "۞"; // ۞
const SAJDAH_MARK = "۩"; // ۩

export function isWaqfMark(token: string): token is WaqfMark {
  return Object.prototype.hasOwnProperty.call(WAQF_MARKS, token);
}

/** Whether pausing after a word with this mark (or none, mid-ayah) is acceptable. */
export function pauseAllowedAfter(mark: WaqfMark | undefined): boolean {
  if (!mark) return false;
  return WAQF_MARKS[mark].rule !== "do-not-stop";
}

// ─── Word model ────────────────────────────────────────────────────────────

const ARABIC_LETTER = /[ء-غف-يٱ]/;

export interface AyahWord {
  /** Position among the ayah's words (marks excluded) */
  index: number;
  /** Uthmani display text, verbatim */
  text: string;
  /** Simple-Clean words this display word corresponds to (usually one) */
  clean: string[];
  /** Waqf mark printed after this word, if any */
  waqf?: WaqfMark;
  /** Sakt (brief breathless pause) is required after this word */
  sakt?: boolean;
}

export interface CleanWord {
  /** Plain-spelling word (what speech recognition is matched against) */
  text: string;
  /** Indexes of the display words this plain word belongs to */
  words: number[];
}

export interface AyahWords {
  words: AyahWord[];
  /** Plain-spelling words in order, linked back to display words */
  clean: CleanWord[];
  /** Ayah starts a new quarter-hizb (۞) */
  rubElHizb: boolean;
  /** Ayah ends with a prostration mark (۩) */
  sajdahMark: boolean;
}

interface Tokenized {
  words: string[];
  marks: Map<number, string[]>; // word index → marks following it
  rubElHizb: boolean;
  sajdahMark: boolean;
}

function tokenize(text: string): Tokenized {
  const words: string[] = [];
  const marks = new Map<number, string[]>();
  let rubElHizb = false;
  let sajdahMark = false;
  for (const token of text.split(" ")) {
    if (!token) continue;
    if (ARABIC_LETTER.test(token)) {
      words.push(token);
      continue;
    }
    if (token === RUB_EL_HIZB && words.length === 0) {
      rubElHizb = true;
      continue;
    }
    if (token === SAJDAH_MARK) sajdahMark = true;
    const after = words.length - 1;
    if (after >= 0) marks.set(after, [...(marks.get(after) ?? []), token]);
  }
  return { words, marks, rubElHizb, sajdahMark };
}

/** Reduce a word to its consonantal skeleton so both scripts can be compared. */
export function skeleton(word: string): string {
  return word
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/[^ا-غف-ي]/g, ""); // drop hamza, marks, tatweel, diacritics
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Normalized edit distance between two skeletons (0 = identical, 1 = unrelated). */
function mismatch(sa: string, sb: string): number {
  if (sa === sb) return 0;
  return editDistance(sa, sb) / Math.max(sa.length, sb.length, 1);
}

// Uthmani→clean group shapes: one-to-one, one Uthmani word written as 2–3
// plain words (e.g. يَـٰٓأَيُّهَا → يا أيها), or two Uthmani words written as one.
const GROUPS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 2],
  [1, 3],
  [2, 1],
];

/**
 * Align Uthmani display words with Simple-Clean words. Returns, for each
 * Uthmani word, the indexes of the clean words it covers. Monotonic and total:
 * every clean word is covered exactly once.
 */
export function alignScripts(uthmani: string[], clean: string[]): number[][] {
  const n = uthmani.length;
  const m = clean.length;
  // skeleton() maps characters independently, so a group's skeleton is the
  // concatenation of its words' skeletons; compute each once.
  const su = uthmani.map(skeleton);
  const sc = clean.map(skeleton);

  // Fast path (~94% of ayahs): same word count and every pair on the diagonal
  // is a plausible spelling variant of the other.
  if (n === m && su.every((s, k) => mismatch(s, sc[k]) <= 0.5)) {
    return su.map((_, k) => [k]);
  }

  const INF = Number.POSITIVE_INFINITY;
  const cost: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(INF));
  const step: Array<Array<readonly [number, number] | null>> = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(null),
  );
  cost[0][0] = 0;

  // The scripts only drift apart by the number of split/merged words, so the
  // search can stay within a band around the diagonal.
  const slack = 3;
  const lo = Math.min(0, m - n) - slack;
  const hi = Math.max(0, m - n) + slack;

  for (let i = 0; i <= n; i++) {
    for (let j = Math.max(0, i + lo); j <= Math.min(m, i + hi); j++) {
      if (cost[i][j] === INF) continue;
      for (const g of GROUPS) {
        const [du, dc] = g;
        if (i + du > n || j + dc > m) continue;
        const u = du === 1 ? su[i] : su.slice(i, i + du).join("");
        const c = dc === 1 ? sc[j] : sc.slice(j, j + dc).join("");
        // Small penalty for non 1:1 groups so they are used only when needed.
        const c2 = cost[i][j] + mismatch(u, c) + (du === 1 && dc === 1 ? 0 : 0.05);
        if (c2 < cost[i + du][j + dc]) {
          cost[i + du][j + dc] = c2;
          step[i + du][j + dc] = g;
        }
      }
    }
  }

  if (cost[n][m] === INF) throw new Error("Scripts could not be aligned");

  const result: number[][] = Array.from({ length: n }, () => []);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const g = step[i][j];
    if (!g) throw new Error("Alignment backtrack failed");
    const [du, dc] = g;
    const cleanIdx = Array.from({ length: dc }, (_, k) => j - dc + k);
    for (let k = 0; k < du; k++) result[i - du + k] = cleanIdx;
    i -= du;
    j -= dc;
  }
  return result;
}

/** Split an ayah into display words, each linked to its plain-spelling words. */
export function getAyahWords(ayah: Pick<AyahRecord, "text" | "clean">): AyahWords {
  const u = tokenize(ayah.text);
  const c = tokenize(ayah.clean);
  const mapping = alignScripts(u.words, c.words);

  const words = u.words.map<AyahWord>((text, index) => {
    const word: AyahWord = { index, text, clean: mapping[index].map((k) => c.words[k]) };
    for (const mark of u.marks.get(index) ?? []) {
      if (isWaqfMark(mark)) word.waqf = mark;
      else if (mark === SAKT_MARK) word.sakt = true;
    }
    return word;
  });

  const clean: CleanWord[] = c.words.map((text) => ({ text, words: [] }));
  mapping.forEach((cleanIdx, wordIdx) => {
    for (const k of cleanIdx) clean[k].words.push(wordIdx);
  });

  return { words, clean, rubElHizb: u.rubElHizb, sajdahMark: u.sajdahMark };
}
