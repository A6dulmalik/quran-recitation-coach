import { expect, test } from "./fixtures";

test.use({ serviceWorkers: "allow" });

test("is installable and keeps working offline after the first visit", async ({ page, context, onboarded }) => {
  void onboarded;
  await page.goto("/surahs");

  // Manifest is linked and valid JSON with install icons.
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    return href ? (await fetch(href)).json() : null;
  });
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain("512x512");

  // Wait for the service worker to take control and cache the Qur'an text.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
  // (expect.poll, not waitForFunction: an async predicate's Promise is always truthy.)
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const name = (await caches.keys()).find((k) => k.startsWith("quran-"));
          return name ? (await (await caches.open(name)).keys()).length : 0;
        }),
      { timeout: 60_000, intervals: [500] },
    )
    .toBe(114);

  await context.setOffline(true);

  // A surah that was never opened is readable offline.
  await page.goto("/read?surah=36&start=1&end=3");
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.goto("/surahs");
  await expect(page.getByRole("heading", { name: "The Qur'an" })).toBeVisible();

  await context.setOffline(false);
});
