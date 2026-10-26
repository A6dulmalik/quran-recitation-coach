import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config";
import { OpenAiSpeechRecognizer } from "./openai-speech-recognizer";

const config = { ...loadConfig({}), openaiApiKey: "sk-test-key-1234" };
const audio = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);

afterEach(() => vi.restoreAllMocks());

const upstream = (status: number, error: Record<string, unknown>) =>
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error }, { status, headers: { "retry-after": "0" } })));

describe("OpenAiSpeechRecognizer errors", () => {
  it("tells apart an exhausted account (429 insufficient_quota) from a busy service", async () => {
    const logged = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    upstream(429, { code: "insufficient_quota", message: "You have no credits remaining." });

    await expect(new OpenAiSpeechRecognizer(config).transcribe(audio, "webm")).rejects.toMatchObject({
      status: 503,
      message: "Recitation checking is temporarily unavailable.",
    });
    // The operator is told what to do; the client message does not mention billing.
    expect(String(logged.mock.calls.at(-1)?.[0])).toContain("no credits left");
    expect(String(logged.mock.calls.at(-1)?.[0])).toContain("billing");
  });

  it("still reports an ordinary rate limit as busy", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    upstream(429, { code: "rate_limit_exceeded", message: "Rate limit reached." });

    await expect(new OpenAiSpeechRecognizer(config).transcribe(audio, "webm")).rejects.toMatchObject({
      status: 503,
      message: "Speech recognition is busy. Please try again shortly.",
    });
  });
});
