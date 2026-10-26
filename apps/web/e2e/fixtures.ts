import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { getAyahWords, surahFileName, type SurahFile } from "@repo/quran-data";
import type { AyahEvaluation } from "@repo/types";
import { evaluateRecitation } from "@repo/utils";

/** Grade a transcript with the real engine, as the API would. */
export function gradeTranscript(surah: number, ayah: number, transcript: (plain: string[]) => string): AyahEvaluation {
  const dataDir = join(dirname(require.resolve("@repo/quran-data/package.json")), "data", "surah");
  const file: SurahFile = JSON.parse(readFileSync(join(dataDir, surahFileName(surah)), "utf8"));
  const words = getAyahWords(file.ayahs[ayah - 1]);
  return evaluateRecitation(words, transcript(words.clean.map((c) => c.text)), { surah, ayah });
}

type Responder = (surah: number, ayah: number, attempt: number) => { status: number; body: unknown };

/** Mock POST /recitations/evaluate. Returns the list of requests received. */
export async function mockEvaluate(page: Page, respond: Responder) {
  const calls: Array<{ surah: number; ayah: number; hasAudio: boolean }> = [];
  const attempts = new Map<string, number>();
  await page.route("**/recitations/evaluate", async (route) => {
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const field = (name: string) => Number(body.match(new RegExp(`name="${name}"\\r\\n\\r\\n(\\d+)`))?.[1]);
    const surah = field("surah");
    const ayah = field("ayah");
    calls.push({ surah, ayah, hasAudio: /name="audio"; filename=/.test(body) });
    const key = `${surah}:${ayah}`;
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    const { status, body: json } = respond(surah, ayah, attempt);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  return calls;
}

/** First attempt skips the 2nd word; later attempts are perfect. */
export const skipThenPerfect: Responder = (surah, ayah, attempt) => ({
  status: 200,
  body: gradeTranscript(surah, ayah, (plain) =>
    (attempt === 1 && plain.length > 1 ? plain.filter((_, i) => i !== 1) : plain).join(" "),
  ),
});

export async function recordOnce(page: Page, ms = 1200) {
  await page.getByRole("button", { name: "Start recording" }).click();
  const stop = page.getByRole("button", { name: "Stop recording" });
  // Opening the (fake) microphone can take several seconds when browsers run in parallel.
  await expect(stop).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(ms);
  await stop.click();
}

/** Skip onboarding by seeding device progress. */
export const test = base.extend<{ onboarded: void }>({
  onboarded: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem("qrc.progress.v1")) {
          localStorage.setItem(
            "qrc.progress.v1",
            JSON.stringify({ version: 1, onboarded: true, ayahs: {}, sessions: [], activityDays: [] }),
          );
        }
      });
      await use();
    },
    { auto: false },
  ],
});

export { expect };
