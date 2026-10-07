import { describe, expect, it } from "vitest";
import { compareRecitation, normalizeArabic, tokenizeArabic } from "./index";

describe("normalizeArabic", () => {
  it("strips harakat and unifies letter variants", () => {
    expect(normalizeArabic("بِسْمِ اللَّهِ")).toBe("بسم الله");
    expect(normalizeArabic("إِيَّاكَ")).toBe("اياك");
    expect(normalizeArabic("عَلَىٰ")).toBe("علي");
  });
});

describe("tokenizeArabic", () => {
  it("splits on any whitespace and drops empties", () => {
    expect(tokenizeArabic("  الحمد   لله\nرب ")).toEqual(["الحمد", "لله", "رب"]);
  });
});

describe("compareRecitation", () => {
  it("marks a perfect recitation fully correct", () => {
    const result = compareRecitation("الحمد لله رب العالمين", "الحمد لله رب العالمين");
    expect(result.accuracy).toBe(1);
    expect(result.words.every((w) => w.status === "correct")).toBe(true);
  });

  it("marks a substituted word incorrect and keeps the expected word", () => {
    const result = compareRecitation("الحمد لله رب العالمين", "الحمد لل رب العالمين");
    expect(result.words[1]).toEqual({ text: "لل", status: "incorrect", expected: "لله" });
  });

  it("marks a skipped word missing without shifting later words", () => {
    const result = compareRecitation("الحمد لله رب العالمين", "الحمد رب العالمين");
    expect(result.words.map((w) => w.status)).toEqual(["correct", "missing", "correct", "correct"]);
  });
});
