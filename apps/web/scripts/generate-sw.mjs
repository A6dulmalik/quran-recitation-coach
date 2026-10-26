// Runs after `next build`: writes out/sw.js from scripts/sw-template.js with the
// exact list of pages and hashed assets in this export, so the precache can
// never go stale.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(webDir, "out");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(out).map((path) => "/" + relative(out, path).split(sep).join("/"));

const pages = [
  "/",
  ...files
    .filter((f) => f.endsWith(".html") && f !== "/index.html" && !/\/(404|_not-found)\.html$/.test(f))
    .map((f) => f.replace(/\.html$/, "")),
];
const staticAssets = files.filter(
  (f) => f.startsWith("/_next/static/") || /^\/(icon-.*\.png|apple-icon\.png|manifest\.webmanifest)$/.test(f),
);
const quranFiles = files.filter((f) => /^\/quran\/\d{3}\.json$/.test(f)).sort();

const hash = (input) => createHash("sha256").update(input).digest("hex").slice(0, 12);
const version = hash(staticAssets.join("\n") + pages.join("\n"));
const dataVersion = hash(quranFiles.map((f) => readFileSync(join(out, f))).join(""));

const sw = readFileSync(join(webDir, "scripts", "sw-template.js"), "utf8")
  .replace("__VERSION__", version)
  .replace("__DATA_VERSION__", dataVersion)
  .replace("__PAGES__", JSON.stringify(pages))
  .replace("__STATIC_ASSETS__", JSON.stringify(staticAssets))
  .replace("__QURAN_FILES__", JSON.stringify(quranFiles));

if (/__[A-Z_]+__/.test(sw.replace(/__next/g, ""))) throw new Error("Unfilled placeholder in sw.js");
writeFileSync(join(out, "sw.js"), sw);
console.log(
  `sw.js: version ${version}, ${pages.length} pages, ${staticAssets.length} assets, ${quranFiles.length} surah files`,
);
