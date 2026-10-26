import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, parseStoredPrefs } from "./reading-prefs";

describe("parseStoredPrefs", () => {
  it("defaults to showing both reading aids", () => {
    expect(parseStoredPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toEqual({ transliteration: true, translation: true });
  });

  it("reads stored choices and falls back per field on bad values", () => {
    expect(parseStoredPrefs('{"transliteration":false,"translation":true}')).toEqual({
      transliteration: false,
      translation: true,
    });
    expect(parseStoredPrefs('{"transliteration":"no","translation":false}')).toEqual({
      transliteration: true,
      translation: false,
    });
  });

  it("ignores corrupt storage", () => {
    expect(parseStoredPrefs("{oops")).toEqual(DEFAULT_PREFS);
    expect(parseStoredPrefs("[]")).toEqual(DEFAULT_PREFS);
  });
});
