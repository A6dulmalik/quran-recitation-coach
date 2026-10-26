import { pauseAllowedAfter, type AyahWords, type WaqfMark } from "@repo/quran-data";
import type { AyahEvaluation, RecitationError, WordResult } from "@repo/types";
import { normalizeArabic, tokenizeArabic } from "./normalize";

/** A word as returned by speech recognition, optionally with timing (seconds). */
export interface RecitedWord {
  text: string;
  start?: number;
  end?: number;
}

export interface EvaluateOptions {
  /** Silence (s) between two words that counts as a stop. Default 1.0 */
  stopThreshold?: number;
  /** Minimum silence (s) expected at a sakt. Default 0.1 */
  saktMinGap?: number;
}

interface Token {
  norm: string;
  raw: string;
  start?: number;
  end?: number;
}

// ─── Opening / closing formulae ─────────────────────────────────────────────
// Reciters often begin with the isti'adha and/or basmala and may end with
// "sadaqa Allahu al-'azim"; none of these belong to the ayah being graded.

const ISTIADHA = tokenizeArabic("أعوذ بالله من الشيطان الرجيم");
const BASMALA = tokenizeArabic("بسم الله الرحمن الرحيم");
const SADAQA = tokenizeArabic("صدق الله العظيم");

const startsWith = (tokens: Token[], seq: string[], at = 0) =>
  seq.every((s, k) => tokens[at + k]?.norm === s);

function stripFormulae(tokens: Token[], expected: string[]): Token[] {
  let start = 0;
  if (startsWith(tokens, ISTIADHA)) start += ISTIADHA.length;
  // Keep the basmala when it *is* the ayah (Al-Fatiha 1:1).
  const ayahIsBasmala = BASMALA.every((s, k) => expected[k] === s);
  if (!ayahIsBasmala && startsWith(tokens, BASMALA, start)) start += BASMALA.length;

  let end = tokens.length;
  if (end - start > SADAQA.length && startsWith(tokens, SADAQA, end - SADAQA.length)) {
    end -= SADAQA.length;
  }
  return tokens.slice(start, end);
}

// ─── Muqatta'at (disjoined letters) ─────────────────────────────────────────
// "الم" is recited as the letter names "alif lam mim"; ASR may write either.

const LETTER_NAMES: Record<string, string[]> = {
  "ا": ["الف"],
  "ل": ["لام"],
  "م": ["ميم"],
  "ص": ["صاد"],
  "ر": ["را", "راء"],
  "ك": ["كاف"],
  "ه": ["ها", "هاء"],
  "ي": ["يا", "ياء"],
  "ع": ["عين"],
  "ط": ["طا", "طاء"],
  "س": ["سين"],
  "ح": ["حا", "حاء"],
  "ق": ["قاف"],
  "ن": ["نون"],
};
const MUQATTAAT = new Set(
  ["الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"].map(
    normalizeArabic,
  ),
);

/** Number of recited tokens spelling out the letters of `expected`, or 0. */
function matchLetterNames(expected: string, tokens: Token[], at: number): number {
  if (!MUQATTAAT.has(expected)) return 0;
  const letters = [...expected];
  const ok = letters.every((letter, k) => LETTER_NAMES[letter]?.includes(tokens[at + k]?.norm ?? ""));
  return ok ? letters.length : 0;
}

// ─── Alignment ──────────────────────────────────────────────────────────────

type Op =
  | { kind: "match"; e: number[]; r: number[] }
  | { kind: "substitute"; e: number; r: number }
  | { kind: "missing"; e: number }
  | { kind: "extra"; r: number };

function charDistance(a: string, b: string): number {
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
  return prev[b.length] / Math.max(a.length, b.length, 1);
}

/**
 * Word-level edit-distance alignment. Insertions and deletions no longer shift
 * every following word, and spelling splits/merges (e.g. "يا أيها" vs
 * "ياأيها") or spelled-out muqatta'at count as matches.
 */
function align(expected: string[], tokens: Token[]): Op[] {
  const n = expected.length;
  const m = tokens.length;
  const r = tokens.map((t) => t.norm);
  const cost: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  const back: Array<Array<{ op: Op; pi: number; pj: number } | null>> = Array.from(
    { length: n + 1 },
    () => Array(m + 1).fill(null),
  );
  cost[0][0] = 0;

  const relax = (i: number, j: number, ni: number, nj: number, c: number, op: Op) => {
    if (cost[i][j] + c < cost[ni][nj]) {
      cost[ni][nj] = cost[i][j] + c;
      back[ni][nj] = { op, pi: i, pj: j };
    }
  };

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (cost[i][j] === Infinity) continue;
      if (i < n && j < m) {
        if (expected[i] === r[j]) relax(i, j, i + 1, j + 1, 0, { kind: "match", e: [i], r: [j] });
        // Small similarity term so equal-cost paths pair up similar words.
        else relax(i, j, i + 1, j + 1, 1 + 0.1 * charDistance(expected[i], r[j]), { kind: "substitute", e: i, r: j });
      }
      if (i < n) relax(i, j, i + 1, j, 1, { kind: "missing", e: i });
      if (j < m) relax(i, j, i, j + 1, 1, { kind: "extra", r: j });
      // Two expected words heard as one token, or one expected word as two tokens.
      if (i + 1 < n && j < m && expected[i] + expected[i + 1] === r[j]) {
        relax(i, j, i + 2, j + 1, 0, { kind: "match", e: [i, i + 1], r: [j] });
      }
      if (i < n && j + 1 < m && expected[i] === r[j] + r[j + 1]) {
        relax(i, j, i + 1, j + 2, 0, { kind: "match", e: [i], r: [j, j + 1] });
      }
      if (i < n && j < m) {
        const k = matchLetterNames(expected[i], tokens, j);
        if (k) {
          relax(i, j, i + 1, j + k, 0, {
            kind: "match",
            e: [i],
            r: Array.from({ length: k }, (_, x) => j + x),
          });
        }
      }
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = back[i][j];
    if (!step) throw new Error("alignment backtrack failed");
    ops.push(step.op);
    i = step.pi;
    j = step.pj;
  }
  return ops.reverse();
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

function toTokens(recited: string | RecitedWord[]): Token[] {
  const words: RecitedWord[] =
    typeof recited === "string" ? recited.split(/\s+/).map((text) => ({ text })) : recited;
  const tokens: Token[] = [];
  for (const word of words) {
    const norms = tokenizeArabic(word.text);
    // Arabic letters and diacritics only (drops ASR punctuation such as ، . ؟)
    const raws = word.text
      .replace(/[^ء-ٰٟٱ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => tokenizeArabic(w).length > 0);
    norms.forEach((norm, k) =>
      tokens.push({ norm, raw: raws[k] ?? norm, start: word.start, end: word.end }),
    );
  }
  return tokens;
}

const quote = (s: string) => `«${s}»`;

/**
 * Grade one recited ayah against its text.
 * Wording errors come from the transcript; waṣl/waqf errors from word timing.
 */
export function evaluateRecitation(
  ayah: AyahWords,
  recited: string | RecitedWord[],
  ref: { surah: number; ayah: number },
  options: EvaluateOptions = {},
): AyahEvaluation {
  const { stopThreshold = 1.0, saktMinGap = 0.1 } = options;
  const expected = ayah.clean.map((c) => normalizeArabic(c.text));
  const allTokens = toTokens(recited);
  const tokens = stripFormulae(allTokens, expected);
  const ops = align(expected, tokens);

  // Per plain-spelling word: what happened to it.
  const cleanStatus: Array<{ status: "correct" | "incorrect" | "missing"; tokens: Token[] }> =
    expected.map(() => ({ status: "missing", tokens: [] }));
  // Extra tokens, anchored after the last expected word seen before them.
  const extras: Array<{ token: Token; afterClean: number }> = [];
  let lastClean = -1;

  for (const op of ops) {
    if (op.kind === "match") {
      for (const e of op.e) cleanStatus[e] = { status: "correct", tokens: op.r.map((x) => tokens[x]) };
      lastClean = op.e[op.e.length - 1];
    } else if (op.kind === "substitute") {
      cleanStatus[op.e] = { status: "incorrect", tokens: [tokens[op.r]] };
      lastClean = op.e;
    } else if (op.kind === "missing") {
      lastClean = op.e;
    } else {
      extras.push({ token: tokens[op.r], afterClean: lastClean });
    }
  }

  const displayOf = (cleanIdx: number) =>
    cleanIdx < 0 ? -1 : ayah.clean[cleanIdx].words[ayah.clean[cleanIdx].words.length - 1];

  // Aggregate onto display (Uthmani) words.
  const words: WordResult[] = ayah.words.map((w) => {
    const parts = ayah.clean
      .map((c, k) => ({ c, s: cleanStatus[k] }))
      .filter(({ c }) => c.words.includes(w.index))
      .map(({ s }) => s);
    if (parts.every((p) => p.status === "correct")) return { index: w.index, status: "correct" };
    if (parts.every((p) => p.status === "missing")) return { index: w.index, status: "missing" };
    const heard = parts.flatMap((p) => p.tokens.map((t) => t.raw)).join(" ");
    return { index: w.index, status: "incorrect", ...(heard ? { recited: heard } : {}) };
  });

  const errors: RecitationError[] = [];
  for (const w of words) {
    const text = ayah.words[w.index].text;
    if (w.status === "incorrect") {
      errors.push({
        kind: "wording",
        type: "wrong-word",
        wordIndex: w.index,
        expected: text,
        recited: w.recited,
        message: w.recited
          ? `Expected ${quote(text)} but heard ${quote(w.recited)}.`
          : `${quote(text)} was not recited correctly.`,
      });
    } else if (w.status === "missing") {
      errors.push({
        kind: "wording",
        type: "missing-word",
        wordIndex: w.index,
        expected: text,
        message: `${quote(text)} was skipped.`,
      });
    }
  }

  for (const { token, afterClean } of extras) {
    const neighbours = [expected[afterClean], expected[afterClean + 1]];
    const repeated = neighbours.includes(token.norm);
    const wordIndex = displayOf(afterClean);
    errors.push({
      kind: "wording",
      type: repeated ? "repeated-word" : "extra-word",
      wordIndex,
      recited: token.raw,
      message: repeated
        ? `${quote(token.raw)} was repeated.`
        : `${quote(token.raw)} was added; it is not part of this ayah.`,
    });
  }

  // ── Waṣl / waqf from word timing ──────────────────────────────────────────
  const timed = (t: Token | undefined) => t?.start !== undefined && t.end !== undefined;
  let waslChecked = false;
  for (let k = 0; k < ayah.words.length - 1; k++) {
    const word = ayah.words[k];
    const lastCleanOfWord = Math.max(
      ...ayah.clean.map((c, x) => (c.words.includes(k) ? x : -1)),
    );
    const firstCleanOfNext = ayah.clean.findIndex((c) => c.words.includes(k + 1));
    const cur = cleanStatus[lastCleanOfWord]?.tokens.at(-1);
    const next = cleanStatus[firstCleanOfNext]?.tokens[0];
    if (!timed(cur) || !timed(next) || cur === next) continue;
    waslChecked = true;

    const gap = next!.start! - cur!.end!;
    const nextText = ayah.words[k + 1].text;
    if (word.sakt) {
      if (gap < saktMinGap) {
        errors.push({
          kind: "wasl",
          type: "missed-sakt",
          wordIndex: k,
          expected: word.text,
          message: `Pause briefly without taking a breath (sakt) after ${quote(word.text)}.`,
        });
      }
    } else if (gap >= stopThreshold && !pauseAllowedAfter(word.waqf as WaqfMark | undefined)) {
      errors.push({
        kind: "wasl",
        type: "improper-stop",
        wordIndex: k,
        expected: word.text,
        message:
          word.waqf === "ۙ"
            ? `You stopped after ${quote(word.text)}, which carries a "do not stop" (ۙ) mark. Join it with ${quote(nextText)}.`
            : `You stopped after ${quote(word.text)}, where there is no stopping mark. Join it with ${quote(nextText)} (waṣl).`,
      });
    }
  }

  const correct = words.filter((w) => w.status === "correct").length;
  const score = Math.round((100 * correct) / (words.length + extras.length));

  errors.sort((a, b) => a.wordIndex - b.wordIndex);

  return {
    surah: ref.surah,
    ayah: ref.ayah,
    score,
    words,
    errors,
    transcript: allTokens.map((t) => t.raw).join(" "),
    waslChecked,
  };
}
