// Copies the per-surah Qur'an data from @repo/quran-data into public/quran so the
// app can load one surah at a time (and a service worker can cache it offline).
// Runs automatically before `dev` and `build`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("@repo/quran-data/package.json")), "data", "surah");
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "quran");

if (!existsSync(source)) {
  throw new Error(`Qur'an data not found at ${source}. Run: npm run generate -w @repo/quran-data`);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const file of readdirSync(source)) {
  if (file.endsWith(".json")) cpSync(join(source, file), join(target, file));
}
console.log(`Synced ${readdirSync(target).length} surah files to public/quran`);
