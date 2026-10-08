import { SURAHS } from "@repo/quran-data";
import { describe, expect, it } from "vitest";
import { foldLatin, matchesSurah } from "./surah-search";

const search = (q: string) => SURAHS.filter((s) => matchesSurah(s, q)).map((s) => s.number);

describe("foldLatin", () => {
  it("folds common transliteration variants together", () => {
    expect(foldLatin("Al-Faatiha")).toBe(foldLatin("al fatiha"));
    expect(foldLatin("Al-Fatihah")).toBe(foldLatin("Al-Faatiha"));
    expect(foldLatin("Ar-Rahmaan")).toBe(foldLatin("Ar Rahman"));
  });
});

describe("matchesSurah", () => {
  it("returns everything for an empty query", () => {
    expect(search("  ")).toHaveLength(114);
  });

  it("matches transliterations regardless of spelling", () => {
    expect(search("fatiha")).toEqual([1]);
    expect(search("baqarah")).toEqual([2]);
    expect(search("yasin")).toEqual([36]);
    expect(search("ya-seen")).toEqual([36]);
    expect(search("taubah")).toEqual([9]);
    expect(search("duha")).toEqual([93]);
  });

  it("matches English meanings", () => {
    expect(search("opening")).toEqual([1]);
  });

  it("matches surah numbers by prefix", () => {
    expect(search("114")).toEqual([114]);
    expect(search("11")).toEqual([11, 110, 111, 112, 113, 114]);
  });

  it("matches Arabic names with or without hamza and diacritics", () => {
    expect(search("الفاتحة")).toEqual([1]);
    expect(search("البقره")).toEqual([2]);
  });
});
