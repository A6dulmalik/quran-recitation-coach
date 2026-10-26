import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { LiveSession } from "@repo/types";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { APP_CONFIG, loadConfig } from "../config";
import { LiveSessionError, LiveSessionProvider } from "./live-session";
import { OpenAiLiveSessionProvider } from "./openai-live-session";

const config = { ...loadConfig({}), openaiApiKey: "sk-test-key-1234" };

afterEach(() => vi.unstubAllGlobals());

describe("OpenAiLiveSessionProvider", () => {
  it("asks OpenAI for an Arabic transcription session and returns only the ephemeral secret", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ client_secret: { value: "ek_ephemeral", expires_at: 1_900_000_000 }, id: "sess_1" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await new OpenAiLiveSessionProvider(config).create();

    expect(session).toEqual({
      clientSecret: "ek_ephemeral",
      expiresAt: 1_900_000_000,
      url: "wss://api.openai.com/v1/realtime?intent=transcription",
      model: "gpt-4o-transcribe",
      sampleRate: 24_000,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/transcription_sessions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-key-1234");
    expect(JSON.parse(init.body as string).input_audio_transcription).toEqual({
      model: "gpt-4o-transcribe",
      language: "ar",
    });
    expect(JSON.stringify(session)).not.toContain("sk-test-key");
  });

  it.each([
    [401, 503, /misconfigured/],
    [403, 503, /misconfigured/],
    [429, 502, /temporarily unavailable/],
    [500, 502, /temporarily unavailable/],
  ])("maps an OpenAI %i to a %i for clients", async (upstream, status, message) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: upstream })));
    await expect(new OpenAiLiveSessionProvider(config).create()).rejects.toMatchObject({
      status,
      message: expect.stringMatching(message),
    });
  });

  it("fails cleanly when OpenAI is unreachable or replies without a secret", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(new OpenAiLiveSessionProvider(config).create()).rejects.toBeInstanceOf(LiveSessionError);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await expect(new OpenAiLiveSessionProvider(config).create()).rejects.toMatchObject({ status: 502 });
  });

  it("is not configured without a key", () => {
    expect(new OpenAiLiveSessionProvider({ ...config, openaiApiKey: undefined }).isConfigured()).toBe(false);
  });
});

class FakeProvider extends LiveSessionProvider {
  constructor(private readonly outcome: LiveSession | Error, private readonly configured = true) {
    super();
  }
  isConfigured() {
    return this.configured;
  }
  async create() {
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

let app: NestExpressApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function server(provider: LiveSessionProvider) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(LiveSessionProvider)
    .useValue(provider)
    .compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, config);
  await app.init();
  return app.getHttpServer();
}

describe("POST /recitations/live-session", () => {
  const session: LiveSession = {
    clientSecret: "ek_1",
    url: "wss://example.test/stream",
    model: "gpt-4o-transcribe",
    sampleRate: 24_000,
  };

  it("returns the session", async () => {
    const res = await request(await server(new FakeProvider(session))).post("/recitations/live-session").expect(200);
    expect(res.body).toEqual(session);
  });

  it("answers 503 when speech recognition is not configured", async () => {
    await request(await server(new FakeProvider(session, false)))
      .post("/recitations/live-session")
      .expect(503);
  });

  it("passes provider errors on with their status", async () => {
    const res = await request(await server(new FakeProvider(new LiveSessionError("Live feedback is temporarily unavailable.", 502))))
      .post("/recitations/live-session")
      .expect(502);
    expect(res.body.message).toMatch(/temporarily unavailable/);
  });
});
