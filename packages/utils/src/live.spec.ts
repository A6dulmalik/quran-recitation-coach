import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getAyahWords, surahFileName, type SurahFile } from "@repo/quran-data";
import { describe, expect, it } from "vitest";
import { alignLive, type LiveResult } from "./live";

function ayah(surah: number, n: number) {
  const file: SurahFile = JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../quran-data/data/surah/${surahFileName(surah)}`, import.meta.url)),
      "utf8",
    ),
  );
  return getAyahWords(file.ayahs[n - 1]);
}

const statuses = (r: LiveResult) => r.words.map((w) => w.status);
const plainWords = (surah: number, n: number) => ayah(surah, n).clean.map((c) => c.text);

// 1:2 — الحمد لله رب العالمين (4 words)
const FATIHA_2 = ayah(1, 2);
const heard = (...words: string[]) => words.join(" ");

describe("alignLive", () => {
  it("starts with everything pending and the cursor on the first word", () => {
    const r = alignLive(FATIHA_2, "");
    expect(statuses(r)).toEqual(["pending", "pending", "pending", "pending"]);
    expect(r.cursor).toBe(0);
    expect(r.complete).toBe(false);
  });

  it("turns words green one by one as they are heard", () => {
    const words = plainWords(1, 2);
    for (let k = 1; k <= words.length; k++) {
      const r = alignLive(FATIHA_2, words.slice(0, k).join(" "));
      expect(statuses(r).slice(0, k)).toEqual(Array(k).fill("correct"));
      expect(statuses(r).slice(k)).toEqual(Array(words.length - k).fill("pending"));
      expect(r.cursor).toBe(k < words.length ? k : null);
    }
    expect(alignLive(FATIHA_2, words.join(" ")).complete).toBe(true);
  });

  it("holds back a last word that could still turn into the expected one", () => {
    // "لل" is the start of "لله": not red yet
    expect(statuses(alignLive(FATIHA_2, heard("الحمد", "لل")))).toEqual(["correct", "pending", "pending", "pending"]);
  });

  it("does not judge a word that is still being spoken", () => {
    // "رب" is complete; "العا" is the start of "العالمين"
    const r = alignLive(FATIHA_2, heard("الحمد", "لله", "رب", "العا"));
    expect(statuses(r)).toEqual(["correct", "correct", "correct", "pending"]);
  });

  it("marks a changed word red and keeps going", () => {
    const r = alignLive(FATIHA_2, heard("الحمد", "لل", "رب", "العالمين"));
    expect(statuses(r)).toEqual(["correct", "incorrect", "correct", "correct"]);
    expect(r.words[1].heard).toBe("لل");
    expect(r.complete).toBe(true);
  });

  it("marks skipped words red when a later word is heard", () => {
    const r = alignLive(FATIHA_2, heard("الحمد", "العالمين"));
    expect(statuses(r)).toEqual(["correct", "incorrect", "incorrect", "correct"]);
  });

  it("treats an inserted word as extra without derailing the rest", () => {
    const r = alignLive(FATIHA_2, heard("الحمد", "يا", "لله", "رب", "العالمين"));
    expect(statuses(r)).toEqual(["correct", "correct", "correct", "correct"]);
    expect(r.extras).toBe(1);
  });

  it("treats a repeated word as extra", () => {
    const r = alignLive(FATIHA_2, heard("الحمد", "الحمد", "لله"));
    expect(statuses(r)).toEqual(["correct", "correct", "pending", "pending"]);
    expect(r.extras).toBe(1);
  });

  it("revises a word when the recogniser changes its mind", () => {
    const wrong = alignLive(FATIHA_2, heard("الحمد", "لك"));
    expect(statuses(wrong)[1]).toBe("incorrect");
    const fixed = alignLive(FATIHA_2, heard("الحمد", "لله"));
    expect(statuses(fixed)[1]).toBe("correct");
  });

  it("ignores diacritics, punctuation and spelling variants in the transcript", () => {
    const r = alignLive(FATIHA_2, "الْحَمْدُ لِلَّهِ، رَبِّ الْعَالَمِينَ.");
    expect(statuses(r)).toEqual(["correct", "correct", "correct", "correct"]);
  });

  it("ignores an isti'adha / basmala said before the ayah, even while unfinished", () => {
    const partial = alignLive(FATIHA_2, "أعوذ بالله");
    expect(statuses(partial)).toEqual(["pending", "pending", "pending", "pending"]);
    const full = alignLive(FATIHA_2, "أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم الحمد لله");
    expect(statuses(full)).toEqual(["correct", "correct", "pending", "pending"]);
  });

  it("keeps the basmala when the ayah is the basmala (1:1)", () => {
    const basmala = ayah(1, 1);
    const r = alignLive(basmala, "بسم الله الرحمن الرحيم");
    expect(statuses(r)).toEqual(Array(basmala.words.length).fill("correct"));
  });

  it("judges the last word only when the recording is final", () => {
    const text = heard("الحمد", "لله", "رب", "العالم"); // wrong ending
    expect(statuses(alignLive(FATIHA_2, text))[3]).toBe("pending");
    expect(statuses(alignLive(FATIHA_2, text, { final: true }))[3]).toBe("incorrect");
  });

  it("agrees with the final grading on a clean recitation of a longer ayah", () => {
    const longer = ayah(2, 255); // Ayat al-Kursi
    const text = plainWords(2, 255).join(" ");
    const r = alignLive(longer, text);
    expect(r.complete).toBe(true);
    expect(statuses(r).every((s) => s === "correct")).toBe(true);
  });

  it("accepts spelled-out letters for the muqatta'at (2:1)", () => {
    const alm = ayah(2, 1);
    const r = alignLive(alm, "الف لام ميم");
    expect(statuses(r)).toEqual(["correct"]);
  });
});
