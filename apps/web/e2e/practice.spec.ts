import { expect, mockEvaluate, recordOnce, skipThenPerfect, test } from "./fixtures";

test("first visit: onboarding → choose a surah → practice → fix a mistake → progress saved", async ({ page }) => {
  const calls = await mockEvaluate(page, skipThenPerfect);

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/surahs/);

  await page.getByRole("searchbox", { name: "Search surahs" }).fill("fatiha");
  await page.getByRole("button", { name: /Al-Faatiha/ }).click();
  await page.getByRole("link", { name: "Practice" }).click();

  await expect(page).toHaveURL(/\/practice\?surah=1/);
  await expect(page.getByRole("heading", { name: "Al-Faatiha" })).toBeVisible();
  await expect(page.getByText("1/7")).toBeVisible();

  // First attempt: the mock skips the second word.
  await recordOnce(page);
  const feedback = page.getByRole("region", { name: "Feedback" });
  await expect(feedback).toContainText("75");
  await expect(feedback).toContainText("Wording · 1");
  await expect(feedback).toContainText("was skipped");
  await expect(page.locator('[data-word-index="1"]')).toHaveAttribute("data-status", "missing");
  await expect(page.getByRole("button", { name: "Hear your recitation" })).toBeVisible();

  // Second attempt: perfect.
  await recordOnce(page);
  await expect(feedback).toContainText("Perfect recitation");
  await expect(page.locator('[data-status="missing"]')).toHaveCount(0);
  expect(calls).toEqual([
    { surah: 1, ayah: 1, hasAudio: true },
    { surah: 1, ayah: 1, hasAudio: true },
  ]);

  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.getByText("2/7")).toBeVisible();

  // Progress is on the home screen.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Al-Faatiha" })).toBeVisible();
  await expect(page.getByText("1 of 7 ayahs perfect")).toBeVisible();
  await page.getByRole("link", { name: /Resume practice/ }).click();
  await expect(page).toHaveURL(/from=2/);
});

test("session summary offers to practice the remaining ayahs", async ({ page, onboarded }) => {
  void onboarded;
  await mockEvaluate(page, skipThenPerfect);
  await page.goto("/practice?surah=112&start=1&end=2");

  await recordOnce(page); // ayah 1: one mistake
  await expect(page.getByRole("region", { name: "Feedback" })).toContainText("Almost there");
  await page.getByRole("button", { name: "Next ayah" }).click();
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await page.getByRole("button", { name: /Practice the 2 remaining ayahs/ }).click();
  await expect(page.getByText("1/2")).toBeVisible();
});

test("shows a clear message when the recitation service is unavailable", async ({ page, onboarded }) => {
  void onboarded;
  await mockEvaluate(page, () => ({
    status: 503,
    body: { statusCode: 503, message: "Speech recognition is not configured on the server." },
  }));
  await page.goto("/practice?surah=112&start=1&end=1");
  await recordOnce(page);
  await expect(page.locator("[data-slot=alert]")).toContainText("Speech recognition is not configured");
  await expect(page.getByText("Tap the microphone to try again")).toBeVisible();
});

test("explains how to fix a blocked microphone", async ({ page, onboarded }) => {
  void onboarded;
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await page.goto("/practice?surah=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.locator("[data-slot=alert]")).toContainText("Microphone access is blocked");
});

test("rejects an invalid surah or range", async ({ page, onboarded }) => {
  void onboarded;
  await page.goto("/practice?surah=115");
  await expect(page.getByText("That surah or ayah range does not exist.")).toBeVisible();
  await page.goto("/read?surah=2&start=10&end=5");
  await expect(page.getByText("That surah or ayah range does not exist.")).toBeVisible();
});

test("reading view lists the ayahs and links into practice", async ({ page, onboarded }) => {
  void onboarded;
  await page.goto("/read?surah=1");
  await expect(page.getByRole("article")).toHaveCount(7);
  await page.getByRole("link", { name: "Practice from ayah 5" }).click();
  await expect(page).toHaveURL(/from=5/);
  await expect(page.getByText("5/7")).toBeVisible();
});
