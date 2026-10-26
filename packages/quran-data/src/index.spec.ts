import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AYAH_COUNT,
  getAyahWords,
  getSurahMeta,
  isValidAyahRef,
  pauseAllowedAfter,
  SURAHS,
  surahFileName,
  type SurahFile,
} from "./index";

const pkg = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const loadSurah = (n: number): SurahFile =>
  JSON.parse(readFileSync(pkg(`data/surah/${surahFileName(n)}`), "utf8"));

const allSurahs = SURAHS.map((s) => loadSurah(s.number));

/** Parse a Tanzil XML source into "surah:ayah" → text. */
function parseSource(file: string): Map<string, string> {
  const xml = readFileSync(pkg(`sources/${file}`), "utf8");
  const out = new Map<string, string>();
  for (const sura of xml.matchAll(/<sura index="(\d+)"[^>]*>([\s\S]*?)<\/sura>/g)) {
    for (const aya of sura[2].matchAll(/<aya index="(\d+)" text="([^"]*)"/g)) {
      out.set(`${sura[1]}:${aya[1]}`, aya[2]);
    }
  }
  return out;
}

describe("dataset", () => {
  it("has 114 surahs and 6236 ayahs with consistent metadata", () => {
    expect(SURAHS).toHaveLength(114);
    expect(allSurahs.reduce((n, s) => n + s.ayahs.length, 0)).toBe(AYAH_COUNT);
    allSurahs.forEach((file, i) => {
      expect(file.surah).toBe(i + 1);
      expect(file.ayahs).toHaveLength(SURAHS[i].ayahCount);
      expect(file.ayahs.map((a) => a.number)).toEqual(
        Array.from({ length: SURAHS[i].ayahCount }, (_, k) => k + 1),
      );
    });
  });

  it("keeps every ayah verbatim from the Tanzil sources (license: no changes)", () => {
    const uthmani = parseSource("quran-uthmani.xml");
    const clean = parseSource("quran-simple-clean.xml");
    for (const file of allSurahs) {
      for (const ayah of file.ayahs) {
        const ref = `${file.surah}:${ayah.number}`;
        expect(ayah.text, ref).toBe(uthmani.get(ref));
        expect(ayah.clean, ref).toBe(clean.get(ref));
      }
    }
  });

  it("carries the Tanzil copyright notice in every data file", () => {
    for (const file of allSurahs) {
      expect(file.notice.uthmaniCopyright).toContain("Tanzil Project");
      expect(file.notice.simpleCleanCopyright).toContain("Tanzil Project");
    }
  });

  it("puts the basmala outside ayah 1 except for Al-Fatiha and At-Tawbah", () => {
    expect(allSurahs[0].bismillah).toBeNull();
    expect(allSurahs[8].bismillah).toBeNull();
    // The basmala is stored separately and is identical to Al-Fatiha 1:1.
    expect(allSurahs[1].bismillah).toBe(allSurahs[0].ayahs[0].text);
    expect(allSurahs[1].ayahs[0].clean).toBe("الم");
  });

  it("records juz, page and sajdah positions", () => {
    expect(allSurahs[0].ayahs[0]).toMatchObject({ juz: 1, page: 1 });
    expect(allSurahs[1].ayahs[141]).toMatchObject({ juz: 2 }); // 2:142 starts juz 2
    expect(allSurahs[113].ayahs[5].page).toBe(604);
    const sajdahs = allSurahs.flatMap((s) => s.ayahs.filter((a) => a.sajdah));
    expect(sajdahs).toHaveLength(15);
  });
});

describe("getAyahWords", () => {
  it("links every Uthmani word to plain-spelling words, covering each exactly once", () => {
    for (const file of allSurahs) {
      for (const ayah of file.ayahs) {
        const ref = `${file.surah}:${ayah.number}`;
        const { words, clean } = getAyahWords(ayah);
        expect(words.length, ref).toBeGreaterThan(0);
        for (const w of words) expect(w.clean.length, ref).toBeGreaterThan(0);
        for (const c of clean) expect(c.words.length, ref).toBeGreaterThan(0);
        expect(words.flatMap((w) => w.clean).length, ref).toBe(clean.length);
      }
    }
  });

  it("reproduces the verbatim ayah text from words and marks", () => {
    const ayah = allSurahs[1].ayahs[1]; // 2:2 with paired (mu'anaqah) marks
    const { words } = getAyahWords(ayah);
    const rebuilt = words.map((w) => (w.waqf ? `${w.text} ${w.waqf}` : w.text)).join(" ");
    expect(rebuilt).toBe(ayah.text);
    expect(words.filter((w) => w.waqf === "ۛ")).toHaveLength(2);
  });

  it("splits vocative particles the way plain spelling (and ASR) writes them", () => {
    const { words } = getAyahWords(allSurahs[1].ayahs[20]); // 2:21 يَـٰٓأَيُّهَا ٱلنَّاسُ
    expect(words[0].clean).toEqual(["يا", "أيها"]);
    const split3 = getAyahWords(allSurahs[19].ayahs[93]).words.filter((w) => w.clean.length === 3); // 20:94
    expect(split3.map((w) => w.clean)).toEqual([["يا", "ابن", "أم"]]);
  });

  it("marks the five sakt positions of Hafs", () => {
    const sakt = allSurahs.flatMap((s) =>
      s.ayahs.flatMap((a) =>
        getAyahWords(a)
          .words.filter((word) => word.sakt)
          .map(() => `${s.surah}:${a.number}`),
      ),
    );
    expect(sakt).toEqual(["18:1", "36:52", "69:28", "75:27", "83:14"]);
  });

  it("flags rub el hizb and sajdah marks without treating them as words", () => {
    const quarter = getAyahWords(allSurahs[1].ayahs[25]); // 2:26 starts with ۞
    expect(quarter.rubElHizb).toBe(true);
    expect(quarter.words[0].text).toBe(allSurahs[1].ayahs[25].text.split(" ")[1]);
    const sajdah = getAyahWords(allSurahs[6].ayahs[205]); // 7:206 ends with ۩
    expect(sajdah.sajdahMark).toBe(true);
  });
});

describe("helpers", () => {
  it("validates surah/ayah references", () => {
    expect(getSurahMeta(1)?.transliteration).toBe("Al-Faatiha");
    expect(getSurahMeta(115)).toBeUndefined();
    expect(isValidAyahRef(2, 286)).toBe(true);
    expect(isValidAyahRef(2, 287)).toBe(false);
    expect(isValidAyahRef(1.5, 1)).toBe(false);
  });

  it("only allows pausing after marks that permit it", () => {
    expect(pauseAllowedAfter(undefined)).toBe(false);
    expect(pauseAllowedAfter("ۙ")).toBe(false); // ۙ do not stop
    expect(pauseAllowedAfter("ۚ")).toBe(true); // ۚ permissible
  });
});
