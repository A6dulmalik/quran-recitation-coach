import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getAyahWords, surahFileName, type SurahFile } from "@repo/quran-data";
import { describe, expect, it } from "vitest";
import { evaluateRecitation, type RecitedWord } from "./evaluate";
import { normalizeArabic, tokenizeArabic } from "./normalize";

function ayah(surah: number, n: number) {
  const file: SurahFile = JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../quran-data/data/surah/${surahFileName(surah)}`, import.meta.url)),
      "utf8",
    ),
  );
  const record = file.ayahs[n - 1];
  return { record, words: getAyahWords(record) };
}

const evaluate = (surah: number, n: number, recited: string | RecitedWord[]) =>
  evaluateRecitation(ayah(surah, n).words, recited, { surah, ayah: n });

/** Plain text of an ayah without pause marks, as ASR would output it. */
const plain = (surah: number, n: number) =>
  ayah(surah, n).words.clean.map((c) => c.text).join(" ");

/** Index of the last plain-spelling word belonging to a display word. */
const lastPlainOf = (surah: number, n: number, displayIndex: number) =>
  Math.max(...ayah(surah, n).words.clean.map((c, k) => (c.words.includes(displayIndex) ? k : -1)));

/** Give each word of `text` a timestamp; `pauses` maps plain-word index → silence after it. */
function timed(text: string, pauses: Record<number, number> = {}): RecitedWord[] {
  let t = 0;
  return text.split(" ").map((word, k) => {
    const start = t;
    const end = start + 0.4;
    t = end + 0.05 + (pauses[k] ?? 0);
    return { text: word, start, end };
  });
}

describe("normalizeArabic / tokenizeArabic", () => {
  it("folds alif and hamza-seat spellings but keeps hamza itself", () => {
    expect(normalizeArabic("إِيَّاكَ")).toBe(normalizeArabic("اياك"));
    expect(normalizeArabic("مسؤول")).toBe(normalizeArabic("مسئول"));
    expect(normalizeArabic("ماء")).not.toBe(normalizeArabic("ما"));
    expect(normalizeArabic("داوود")).toBe(normalizeArabic("داود"));
    expect(normalizeArabic("کتاب")).toBe(normalizeArabic("كتاب"));
  });

  it("drops punctuation and non-Arabic characters", () => {
    expect(tokenizeArabic("الحمد لله، رب العالمين. (1)")).toEqual(["الحمد", "لله", "رب", "العالمين"]);
  });
});

describe("evaluateRecitation — wording", () => {
  it("scores a perfect recitation 100 with no errors", () => {
    const result = evaluate(1, 2, plain(1, 2));
    expect(result.score).toBe(100);
    expect(result.errors).toEqual([]);
    expect(result.words.every((w) => w.status === "correct")).toBe(true);
  });

  it("ignores ASR punctuation and diacritics", () => {
    expect(evaluate(1, 2, "الْحَمْدُ لِلَّهِ، رَبِّ الْعَالَمِينَ.").score).toBe(100);
  });

  it("reports a wrong word with what was heard", () => {
    const result = evaluate(1, 2, "الحمد لل رب العالمين");
    expect(result.score).toBe(75);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ kind: "wording", type: "wrong-word", wordIndex: 1, recited: "لل" });
    expect(result.words[1]).toMatchObject({ status: "incorrect", recited: "لل" });
  });

  it("reports a skipped word without shifting the rest", () => {
    const result = evaluate(1, 2, "الحمد رب العالمين");
    expect(result.words.map((w) => w.status)).toEqual(["correct", "missing", "correct", "correct"]);
    expect(result.errors[0]).toMatchObject({ type: "missing-word", wordIndex: 1 });
  });

  it("reports an added word without cascading errors", () => {
    const result = evaluate(1, 2, "الحمد كل لله رب العالمين");
    expect(result.words.every((w) => w.status === "correct")).toBe(true);
    expect(result.errors).toEqual([
      expect.objectContaining({ type: "extra-word", recited: "كل", wordIndex: 0 }),
    ]);
    expect(result.score).toBe(80); // 4 correct of 4 expected + 1 extra
  });

  it("distinguishes a repeated word from an added one", () => {
    const result = evaluate(1, 2, "الحمد لله لله رب العالمين");
    expect(result.errors).toEqual([expect.objectContaining({ type: "repeated-word", recited: "لله" })]);
  });

  it("handles skipping several words at once", () => {
    const result = evaluate(1, 5, "نستعين");
    expect(result.words.map((w) => w.status)).toEqual(["missing", "missing", "missing", "correct"]);
  });

  it("treats a completely different ayah as all wrong", () => {
    const result = evaluate(112, 1, plain(1, 2));
    expect(result.score).toBe(0);
  });

  it("returns all words missing for an empty transcript", () => {
    const result = evaluate(1, 2, "   ");
    expect(result.score).toBe(0);
    expect(result.words.every((w) => w.status === "missing")).toBe(true);
  });
});

describe("evaluateRecitation — spelling differences that are not mistakes", () => {
  it("accepts the vocative written as one or two words", () => {
    expect(evaluate(2, 21, plain(2, 21)).score).toBe(100); // يا أيها الناس …
    const merged = plain(2, 21).replace("يا أيها", "ياأيها");
    expect(evaluate(2, 21, merged).score).toBe(100);
  });

  it("accepts muqatta'at written as letters or as spelled-out letter names", () => {
    expect(evaluate(2, 1, "الم").score).toBe(100);
    expect(evaluate(2, 1, "ألف لام ميم").score).toBe(100);
    expect(evaluate(36, 1, "يا سين").score).toBe(100);
  });

  it("ignores an opening isti'adha/basmala and a closing 'sadaqa Allah'", () => {
    const recited = `أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم ${plain(112, 1)} صدق الله العظيم`;
    const result = evaluate(112, 1, recited);
    expect(result.score).toBe(100);
    expect(result.errors).toEqual([]);
  });

  it("keeps the basmala when it is the ayah itself (Al-Fatiha 1:1)", () => {
    expect(evaluate(1, 1, "بسم الله الرحمن الرحيم").score).toBe(100);
    expect(evaluate(1, 1, "أعوذ بالله من الشيطان الرجيم").score).toBe(0);
  });

  it("passes every ayah of the Qur'an when the plain text is recited", () => {
    for (const surah of [1, 2, 18, 20, 36, 112, 114]) {
      const file: SurahFile = JSON.parse(
        readFileSync(fileURLToPath(new URL(`../../quran-data/data/surah/${surahFileName(surah)}`, import.meta.url)), "utf8"),
      );
      for (const record of file.ayahs) {
        const result = evaluateRecitation(getAyahWords(record), plain(surah, record.number), {
          surah,
          ayah: record.number,
        });
        expect(result.score, `${surah}:${record.number}`).toBe(100);
      }
    }
  });
});

describe("evaluateRecitation — waṣl / waqf (timing)", () => {
  // 2:2 ذلك الكتاب لا ريب ۛ فيه ۛ هدى للمتقين
  it("flags a stop where there is no stopping mark", () => {
    const result = evaluate(2, 2, timed(plain(2, 2), { [lastPlainOf(2, 2, 1)]: 1.5 })); // after الكتاب
    expect(result.waslChecked).toBe(true);
    expect(result.errors).toEqual([
      expect.objectContaining({ kind: "wasl", type: "improper-stop", wordIndex: 1 }),
    ]);
    expect(result.score).toBe(100); // timing does not change the wording score
  });

  it("allows a stop at a waqf mark", () => {
    const result = evaluate(2, 2, timed(plain(2, 2), { [lastPlainOf(2, 2, 3)]: 1.5 })); // after ريب ۛ
    expect(result.errors).toEqual([]);
  });

  it("explains the 'do not stop' (ۙ) mark", () => {
    const { words } = ayah(2, 25);
    const laIndex = words.words.findIndex((w) => w.waqf === "ۙ");
    expect(laIndex).toBeGreaterThan(-1);
    const result = evaluate(2, 25, timed(plain(2, 25), { [lastPlainOf(2, 25, laIndex)]: 1.5 }));
    expect(result.errors).toEqual([
      expect.objectContaining({ type: "improper-stop", wordIndex: laIndex }),
    ]);
    expect(result.errors[0].message).toContain("do not stop");
  });

  it("flags a missed sakt and accepts an observed one (36:52)", () => {
    const { words } = ayah(36, 52);
    const saktIndex = words.words.findIndex((w) => w.sakt);
    const at = lastPlainOf(36, 52, saktIndex);
    const noPause = timed(plain(36, 52)).map((w, k, all) =>
      k === at ? { ...w, end: all[k + 1].start } : w,
    );
    expect(evaluate(36, 52, noPause).errors).toEqual([
      expect.objectContaining({ type: "missed-sakt", wordIndex: saktIndex }),
    ]);
    expect(evaluate(36, 52, timed(plain(36, 52), { [at]: 0.3 })).errors).toEqual([]);
  });

  it("skips timing checks when no timestamps are available", () => {
    const result = evaluate(2, 2, plain(2, 2));
    expect(result.waslChecked).toBe(false);
  });
});
