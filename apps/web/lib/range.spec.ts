import { describe, expect, it } from "vitest";
import { describeRange, parseRange, rangeQuery } from "./range";

const parse = (query: string) => parseRange(new URLSearchParams(query));

describe("parseRange", () => {
  it("defaults to the whole surah", () => {
    expect(parse("surah=1")).toMatchObject({ start: 1, end: 7 });
  });

  it("accepts a valid sub-range and starting ayah", () => {
    expect(parse("surah=2&start=255&end=257&from=256")).toMatchObject({ start: 255, end: 257, from: 256 });
  });

  it("ignores a starting ayah outside the range", () => {
    expect(parse("surah=2&start=1&end=5&from=9")?.from).toBeUndefined();
  });

  it.each(["", "surah=0", "surah=115", "surah=abc", "surah=1&start=0", "surah=1&end=8", "surah=1&start=5&end=2", "surah=1&start=1.5"])(
    "rejects %s",
    (query) => {
      expect(parse(query)).toBeNull();
    },
  );
});

describe("rangeQuery / describeRange", () => {
  it("builds queries", () => {
    expect(rangeQuery({ surah: 2, start: 1, end: 5 })).toBe("surah=2&start=1&end=5");
  });

  it("describes ranges", () => {
    expect(describeRange({ start: 1, end: 7 }, 7)).toBe("All 7 ayahs");
    expect(describeRange({ start: 255, end: 255 }, 286)).toBe("Ayah 255");
    expect(describeRange({ start: 1, end: 5 }, 286)).toBe("Ayahs 1–5");
  });
});
