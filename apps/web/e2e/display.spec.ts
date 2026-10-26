import { expect, test } from "./fixtures";

test("light and dark themes can be chosen and are remembered", async ({ page, onboarded }) => {
  void onboarded;
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/surahs");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Display settings" }).click();
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveClass(/dark/);
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Display settings" }).click();
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test("follows the system theme by default", async ({ page, onboarded }) => {
  void onboarded;
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/surahs");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("shows transliteration and translation under the ayah, and lets you hide them", async ({ page, onboarded }) => {
  void onboarded;
  // The bundled data has no English yet (see packages/quran-data/NOTICE.md): add some in transit.
  await page.route("**/quran/001.json", async (route) => {
    const response = await route.fetch();
    const file = await response.json();
    file.ayahs[1].transliteration = "Alhamdu lillahi rabbil 'alamin";
    file.ayahs[1].translation = "All praise is for Allah, Lord of all worlds.";
    await route.fulfill({ response, json: file });
  });

  await page.goto("/practice?surah=1&from=2");
  const readAloud = page.getByRole("region", { name: "Read in English" });
  const translation = page.getByRole("region", { name: "Translation" });
  await expect(readAloud).toContainText("Alhamdu lillahi rabbil 'alamin");
  await expect(translation).toContainText("All praise is for Allah");

  await page.getByRole("button", { name: "Display settings" }).click();
  await page.getByRole("switch", { name: "English translation" }).click();
  await page.keyboard.press("Escape");
  await expect(translation).toHaveCount(0);
  await expect(readAloud).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Translation" })).toHaveCount(0);
});

test("ayahs without English data simply omit the reading aids", async ({ page, onboarded }) => {
  void onboarded;
  await page.goto("/practice?surah=1&from=3");
  await expect(page.getByRole("article", { name: "Ayah 3" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Read in English" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Translation" })).toHaveCount(0);
});
