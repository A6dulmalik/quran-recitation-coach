import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("has safe local defaults and no API key requirement", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 4000,
      corsOrigins: ["http://localhost:3000"],
      trustProxy: false,
      asrModel: "whisper-1",
      maxAudioBytes: 10 * 1024 * 1024,
      evaluationsPerMinute: 20,
    });
    expect(config.openaiApiKey).toBeUndefined();
  });

  it("parses lists and numbers", () => {
    const config = loadConfig({
      CORS_ORIGINS: "https://a.example, capacitor://localhost ,",
      TRUST_PROXY: "1",
      MAX_AUDIO_MB: "5",
      OPENAI_API_KEY: "  sk-test  ",
    });
    expect(config.corsOrigins).toEqual(["https://a.example", "capacitor://localhost"]);
    expect(config.trustProxy).toBe(1);
    expect(config.maxAudioBytes).toBe(5 * 1024 * 1024);
    expect(config.openaiApiKey).toBe("sk-test");
  });

  it("fails fast on invalid numbers", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
    expect(() => loadConfig({ EVALUATIONS_PER_MINUTE: "0" })).toThrow(/EVALUATIONS_PER_MINUTE/);
  });
});
