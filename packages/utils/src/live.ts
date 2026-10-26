import type { AyahWords } from "@repo/quran-data";
import { matchLetterNames, stripFormulae, type Token } from "./evaluate";
import { normalizeArabic, tokenizeArabic } from "./normalize";

// Live feedback while the reciter is still speaking.
//
// `alignLive` is a pure function of the transcript heard so far, so it can be
// called on every speech-recognition update: a word turns red when the next
// words show it was skipped or changed, and green once it is heard correctly.
// Because the transcript is re-aligned from scratch each time, a status simply
// changes if the recogniser later revises what it heard. The authoritative
// score (and waṣl checks) still come from evaluateRecitation on the finished
// recording; live feedback is a preview and uses the same exact matching, so it
// does not show green for words the final grading would reject.

export type LiveWordStatus = "pending" | "correct" | "incorrect";

export interface LiveWord {
  /** Index of the display (Uthmani) word */
  index: number;
  status: LiveWordStatus;
  /** What was heard in place of this word, for incorrect words */
  heard?: string;
}

export interface LiveResult {
  words: LiveWord[];
  /** Display word the reciter should be saying next, or null when finished */
  cursor: number | null;
  /** Every word has been judged */
  complete: boolean;
  /** Words heard that are not part of the ayah (repeats, insertions) */
  extras: number;
}

export interface LiveOptions {
  /** The recognizer has finished: judge the last heard word too. Default false */
  final?: boolean;
  /** How many expected words ahead a skipped-word match may be found. Default 3 */
  lookahead?: number;
}

type Judgement = { status: "correct" } | { status: "incorrect"; heard?: string };

const ISTIADHA = tokenizeArabic("أعوذ بالله من الشيطان الرجيم");
const BASMALA = tokenizeArabic("بسم الله الرحمن الرحيم");

const toTokens = (text: string): Token[] =>
  text
    .split(/\s+/)
    .flatMap((raw) => tokenizeArabic(raw).map((norm) => ({ norm, raw: raw.replace(/[^ء-ٰٟٱ]/g, "") || norm })));

/** Whether the tokens so far are an unfinished opening formula (e.g. "أعوذ بالله"). */
function isPartialFormula(tokens: Token[], expected: string[]): boolean {
  if (tokens.length === 0) return false;
  const norms = tokens.map((t) => t.norm);
  const prefixOf = (formula: string[]) =>
    norms.length < formula.length && norms.every((n, k) => formula[k] === n);
  const ayahIsBasmala = BASMALA.every((s, k) => expected[k] === s);
  return prefixOf(ISTIADHA) || (!ayahIsBasmala && prefixOf(BASMALA));
}

/** Align the transcript so far against one ayah. */
export function alignLive(ayah: AyahWords, transcript: string, options: LiveOptions = {}): LiveResult {
  const { final = false, lookahead = 3 } = options;
  const expected = ayah.clean.map((c) => normalizeArabic(c.text));
  const all = toTokens(transcript);
  const tokens = isPartialFormula(all, expected) ? [] : stripFormulae(all, expected);

  const n = expected.length;
  const judged: Array<Judgement | undefined> = Array(n).fill(undefined);
  let p = 0; // next expected plain word
  let extras = 0;

  /** How many expected / heard tokens does the word at p match at heard index k? */
  const matchAt = (e: number, k: number): { e: number; t: number } | null => {
    const h = tokens[k].norm;
    if (expected[e] === h) return { e: 1, t: 1 };
    const letters = matchLetterNames(expected[e], tokens, k);
    if (letters) return { e: 1, t: letters };
    if (e + 1 < n && expected[e] + expected[e + 1] === h) return { e: 2, t: 1 }; // two words heard as one
    if (k + 1 < tokens.length && expected[e] === h + tokens[k + 1].norm) return { e: 1, t: 2 }; // one heard as two
    return null;
  };

  for (let k = 0; k < tokens.length && p < n; k++) {
    const token = tokens[k];
    const isLast = k === tokens.length - 1 && !final;

    const exact = matchAt(p, k);
    if (exact) {
      for (let x = 0; x < exact.e; x++) judged[p + x] = { status: "correct" };
      p += exact.e;
      k += exact.t - 1;
      continue;
    }
    // Still being spoken: the word heard so far is the start of the expected one.
    if (isLast && expected[p].startsWith(token.norm)) break;

    // The next heard word fits a later expected word: the ones between were skipped.
    let skipTo = -1;
    for (let q = p + 1; q <= Math.min(p + lookahead, n - 1) && skipTo < 0; q++) {
      if (matchAt(q, k)) skipTo = q;
    }
    // …unless this word is just an extra before the right one (insertion).
    const nextFitsHere = k + 1 < tokens.length && !!matchAt(p, k + 1);
    if (skipTo >= 0 && !nextFitsHere) {
      for (let q = p; q < skipTo; q++) judged[q] = { status: "incorrect" };
      p = skipTo;
      k -= 1; // re-process this token against the matched word
      continue;
    }
    if (nextFitsHere) {
      extras++; // inserted word; the expected word follows
      continue;
    }
    // Repeating the previous word is an extra, not a substitution.
    if (p > 0 && expected[p - 1] === token.norm) {
      extras++;
      continue;
    }
    judged[p] = { status: "incorrect", heard: token.raw };
    p++;
  }

  // Fold plain-spelling results onto display words.
  const words: LiveWord[] = ayah.words.map((w) => {
    const parts = ayah.clean.map((c, k) => ({ c, j: judged[k] })).filter(({ c }) => c.words.includes(w.index));
    const bad = parts.find(({ j }) => j?.status === "incorrect");
    if (bad) return { index: w.index, status: "incorrect", ...(bad.j && "heard" in bad.j && bad.j.heard ? { heard: bad.j.heard } : {}) };
    if (parts.every(({ j }) => j?.status === "correct")) return { index: w.index, status: "correct" };
    return { index: w.index, status: "pending" };
  });

  const firstPending = words.find((w) => w.status === "pending");
  return {
    words,
    cursor: firstPending ? firstPending.index : null,
    complete: !firstPending,
    extras,
  };
}
