import type { WebSocketRoute } from "@playwright/test";
import { expect, mockEvaluate, skipThenPerfect, test } from "./fixtures";

const word = (page: import("@playwright/test").Page, index: number) => page.locator(`[data-word-index="${index}"]`);

test("words turn green and red live while reciting, then the full grading follows", async ({ page, onboarded }) => {
  void onboarded;
  const evaluations = await mockEvaluate(page, skipThenPerfect);
  await page.route("**/recitations/live-session", (route) =>
    route.fulfill({
      json: {
        clientSecret: "ek_test",
        url: "wss://realtime.test/stream",
        model: "gpt-realtime-whisper",
        sampleRate: 24000,
      },
    }),
  );

  // Stand-in for OpenAI Realtime: we decide what is "heard", and when.
  let socket!: WebSocketRoute;
  let heardAudio!: () => void;
  const audioStreaming = new Promise<void>((resolve) => (heardAudio = resolve));
  await page.routeWebSocket("wss://realtime.test/stream", (ws) => {
    socket = ws;
    ws.onMessage((message) => {
      if (String(message).includes("input_audio_buffer.append")) heardAudio();
    });
  });
  const say = (event: object) => socket.send(JSON.stringify(event));
  const delta = (text: string) =>
    say({ type: "conversation.item.input_audio_transcription.delta", item_id: "seg1", delta: text });

  // 1:1 — بسم الله الرحمن الرحيم
  await page.goto("/practice?surah=1&start=1&end=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible({ timeout: 20_000 });
  await audioStreaming; // microphone audio is being streamed
  await expect(word(page, 0)).toHaveAttribute("data-active", "true");

  delta("بسم");
  await expect(word(page, 0)).toHaveAttribute("data-status", "correct");
  await expect(word(page, 1)).toHaveAttribute("data-status", "pending");

  delta(" الله");
  await expect(word(page, 1)).toHaveAttribute("data-status", "correct");

  // A wrong word turns red at once…
  delta(" الرحمة");
  await expect(word(page, 2)).toHaveAttribute("data-status", "incorrect");
  await expect(word(page, 2)).toHaveAttribute("title", /الرحمة/);

  // …and goes green again if the recogniser corrects itself.
  say({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "seg1",
    transcript: "بسم الله الرحمن",
  });
  await expect(word(page, 2)).toHaveAttribute("data-status", "correct");

  // Finishing the last word stops the recording by itself and grades it.
  delta(" الرحيم");
  await expect(word(page, 3)).toHaveAttribute("data-status", "correct");
  await expect(page.getByRole("region", { name: "Feedback" })).toBeVisible({ timeout: 15_000 });
  expect(evaluations).toEqual([{ surah: 1, ayah: 1, hasAudio: true }]);
});

test("recording still works and says so when live feedback is unavailable", async ({ page, onboarded }) => {
  void onboarded;
  await mockEvaluate(page, skipThenPerfect);
  await page.route("**/recitations/live-session", (route) =>
    route.fulfill({ status: 503, json: { statusCode: 503, message: "Speech recognition is not configured on the server." } }),
  );

  await page.goto("/practice?surah=1&start=1&end=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("status")).toContainText("live feedback is unavailable", { timeout: 20_000 });

  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("region", { name: "Feedback" })).toBeVisible();
});
