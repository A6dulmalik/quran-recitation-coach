import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import type { AudioFormat } from "../asr/audio-format";
import { SpeechRecognitionError, SpeechRecognizer, type Transcription } from "../asr/speech-recognizer";
import { APP_CONFIG, loadConfig, type AppConfig } from "../config";

// Minimal byte signatures; the fake recognizer never decodes them.
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypM4A "), Buffer.alloc(64)]);

class FakeRecognizer extends SpeechRecognizer {
  calls: AudioFormat[] = [];
  constructor(
    private readonly reply: Transcription | Error,
    private readonly configured = true,
  ) {
    super();
  }
  isConfigured() {
    return this.configured;
  }
  async transcribe(_audio: Buffer, format: AudioFormat) {
    this.calls.push(format);
    if (this.reply instanceof Error) throw this.reply;
    return this.reply;
  }
}

let app: NestExpressApplication | undefined;

async function createApp(recognizer: SpeechRecognizer, overrides: Partial<AppConfig> = {}) {
  const config: AppConfig = { ...loadConfig({}), openaiApiKey: "test", ...overrides };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(SpeechRecognizer)
    .useValue(recognizer)
    .compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, config);
  await app.init();
  return app.getHttpServer();
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const evaluate = (server: unknown, fields: Record<string, string>, audio?: Buffer) => {
  const req = request(server as never).post("/recitations/evaluate");
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  if (audio) req.attach("audio", audio, { filename: "rec.webm", contentType: "audio/webm" });
  return req;
};

describe("GET /health", () => {
  it("responds even when speech recognition is not configured", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }, false), { openaiApiKey: undefined });
    const res = await request(server).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff"); // helmet
  });
});

describe("POST /recitations/evaluate", () => {
  it("grades the recording against the server's own text", async () => {
    const recognizer = new FakeRecognizer({ text: "الحمد لل رب العالمين" });
    const server = await createApp(recognizer);
    const res = await evaluate(server, { surah: "1", ayah: "2" }, WEBM).expect(200);

    expect(recognizer.calls).toEqual(["webm"]);
    expect(res.body).toMatchObject({ surah: 1, ayah: 2, score: 75, waslChecked: false });
    expect(res.body.errors).toEqual([
      expect.objectContaining({ kind: "wording", type: "wrong-word", wordIndex: 1, recited: "لل" }),
    ]);
  });

  it("uses word timestamps for waṣl checks when available", async () => {
    const words = ["ذلك", "الكتاب", "لا", "ريب", "فيه", "هدى", "للمتقين"].map((text, k) => ({
      text,
      start: k + (k >= 2 ? 1.5 : 0), // long pause after الكتاب
      end: k + 0.5 + (k >= 2 ? 1.5 : 0),
    }));
    const server = await createApp(new FakeRecognizer({ text: words.map((w) => w.text).join(" "), words }));
    const res = await evaluate(server, { surah: "2", ayah: "2" }, WEBM).expect(200);
    expect(res.body.waslChecked).toBe(true);
    expect(res.body.score).toBe(100);
    expect(res.body.errors).toEqual([expect.objectContaining({ kind: "wasl", type: "improper-stop" })]);
  });

  it("detects Safari's MP4 recordings by their bytes", async () => {
    const recognizer = new FakeRecognizer({ text: "قل هو الله أحد" });
    const server = await createApp(recognizer);
    await evaluate(server, { surah: "112", ayah: "1" }, MP4).expect(200);
    expect(recognizer.calls).toEqual(["mp4"]);
  });

  it("rejects requests without a recording", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }));
    await evaluate(server, { surah: "1", ayah: "1" }).expect(400);
  });

  it("rejects non-audio uploads by content, not by declared type", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }));
    await evaluate(server, { surah: "1", ayah: "1" }, Buffer.from("<html>not audio at all</html>")).expect(415);
  });

  it("rejects invalid and unknown ayah references", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }));
    await evaluate(server, { surah: "one", ayah: "1" }, WEBM).expect(400);
    await evaluate(server, { surah: "1", ayah: "8" }, WEBM).expect(404);
    await evaluate(server, { surah: "115", ayah: "1" }, WEBM).expect(404);
  });

  it("rejects oversized uploads", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }), { maxAudioBytes: 32 });
    await evaluate(server, { surah: "1", ayah: "1" }, WEBM).expect(413);
  });

  it("returns 422 when no recitation was heard", async () => {
    const server = await createApp(new FakeRecognizer({ text: " . " }));
    const res = await evaluate(server, { surah: "1", ayah: "1" }, WEBM).expect(422);
    expect(res.body.message).toMatch(/couldn't hear/);
  });

  it("returns 503 when speech recognition is not configured", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }, false), { openaiApiKey: undefined });
    await evaluate(server, { surah: "1", ayah: "1" }, WEBM).expect(503);
  });

  it("passes provider failures through with a safe message", async () => {
    const server = await createApp(new FakeRecognizer(new SpeechRecognitionError("Speech recognition is busy.", 503)));
    const res = await evaluate(server, { surah: "1", ayah: "1" }, WEBM).expect(503);
    expect(res.body.message).toBe("Speech recognition is busy.");
  });

  it("rate-limits paid evaluations per client", async () => {
    const server = await createApp(new FakeRecognizer({ text: "قل هو الله أحد" }), { evaluationsPerMinute: 2 });
    await evaluate(server, { surah: "112", ayah: "1" }, WEBM).expect(200);
    await evaluate(server, { surah: "112", ayah: "1" }, WEBM).expect(200);
    await evaluate(server, { surah: "112", ayah: "1" }, WEBM).expect(429);
  });
});

describe("POST /recitations/check", () => {
  it("grades typed text without audio", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }));
    const res = await request(server)
      .post("/recitations/check")
      .send({ surah: 2, ayah: 1, text: "ألف لام ميم" })
      .expect(200);
    expect(res.body.score).toBe(100);
  });

  it("validates its input", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }));
    await request(server).post("/recitations/check").send({ surah: 2, ayah: 1 }).expect(400);
    await request(server)
      .post("/recitations/check")
      .send({ surah: 2, ayah: 1, text: "ا".repeat(5001) })
      .expect(400);
  });
});

describe("CORS", () => {
  it("allows configured origins only", async () => {
    const server = await createApp(new FakeRecognizer({ text: "" }), { corsOrigins: ["https://app.example"] });
    const ok = await request(server)
      .options("/recitations/evaluate")
      .set("Origin", "https://app.example")
      .set("Access-Control-Request-Method", "POST");
    expect(ok.headers["access-control-allow-origin"]).toBe("https://app.example");
    const blocked = await request(server)
      .options("/recitations/evaluate")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "POST");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
