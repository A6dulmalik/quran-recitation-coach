// Generates data/surahs.json and data/surah/NNN.json from the verbatim Tanzil
// sources in ../sources. The Qur'an text is copied character-for-character;
// the Tanzil license forbids changing it. Run: npm run generate -w @repo/quran-data
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, "sources", file), "utf8");

const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

function copyrightBlock(xml) {
  const comment = xml.match(/<!--([\s\S]*?)-->/);
  if (!comment) throw new Error("Tanzil copyright block not found");
  return comment[1].trim();
}

function parseText(xml) {
  const surahs = new Map();
  for (const sura of xml.matchAll(/<sura index="(\d+)"[^>]*>([\s\S]*?)<\/sura>/g)) {
    const ayahs = [...sura[2].matchAll(/<aya [^>]*\/>/g)].map((m) => attrs(m[0]));
    surahs.set(Number(sura[1]), ayahs);
  }
  return surahs;
}

const uthmaniXml = read("quran-uthmani.xml");
const cleanXml = read("quran-simple-clean.xml");
const metaXml = read("quran-data.xml");

const uthmani = parseText(uthmaniXml);
const clean = parseText(cleanXml);

const section = (name) => {
  const body = metaXml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!body) throw new Error(`metadata section <${name}> not found`);
  return [...body[1].matchAll(/<\w+ [^>]*\/>/g)].map((m) => attrs(m[0]));
};

const suraMeta = section("suras");
const juzStarts = section("juzs");
const pageStarts = section("pages");
const sajdas = section("sajdas");

// Ayah key → ordinal, so juz/page boundaries can be resolved with one pass.
const key = (s, a) => s * 1000 + a;
const assignBoundaries = (starts) => {
  const sorted = starts
    .map((b) => ({ index: Number(b.index), key: key(Number(b.sura), Number(b.aya)) }))
    .sort((x, y) => x.key - y.key);
  return (k) => {
    let current = sorted[0].index;
    for (const b of sorted) {
      if (b.key > k) break;
      current = b.index;
    }
    return current;
  };
};
const juzOf = assignBoundaries(juzStarts);
const pageOf = assignBoundaries(pageStarts);
const sajdahAt = new Map(sajdas.map((s) => [key(Number(s.sura), Number(s.aya)), s.type]));

const notice = {
  source: "Tanzil Project — https://tanzil.net",
  license: "Creative Commons Attribution 3.0",
  terms:
    "Verbatim copy. Changing the Qur'an text is not allowed. Source (Tanzil Project) must be indicated with a link to tanzil.net.",
  uthmaniCopyright: copyrightBlock(uthmaniXml),
  simpleCleanCopyright: copyrightBlock(cleanXml),
};

const outDir = join(root, "data");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "surah"), { recursive: true });

const surahIndex = [];
let totalAyahs = 0;

for (const meta of suraMeta) {
  const number = Number(meta.index);
  const uAyahs = uthmani.get(number);
  const cAyahs = clean.get(number);
  if (!uAyahs || !cAyahs || uAyahs.length !== Number(meta.ayas) || cAyahs.length !== uAyahs.length) {
    throw new Error(`Ayah count mismatch in surah ${number}`);
  }

  const ayahs = uAyahs.map((u, i) => {
    const ayahNumber = Number(u.index);
    if (Number(cAyahs[i].index) !== ayahNumber) throw new Error(`Index mismatch ${number}:${ayahNumber}`);
    const k = key(number, ayahNumber);
    const ayah = {
      number: ayahNumber,
      text: u.text,
      clean: cAyahs[i].text,
      juz: juzOf(k),
      page: pageOf(k),
    };
    const sajdah = sajdahAt.get(k);
    if (sajdah) ayah.sajdah = sajdah;
    return ayah;
  });
  totalAyahs += ayahs.length;

  const file = {
    notice,
    surah: number,
    bismillah: uAyahs[0].bismillah ?? null,
    ayahs,
  };
  writeFileSync(join(outDir, "surah", `${String(number).padStart(3, "0")}.json`), JSON.stringify(file));

  surahIndex.push({
    number,
    name: meta.name,
    transliteration: meta.tname,
    translation: meta.ename,
    revelation: meta.type === "Meccan" ? "meccan" : "medinan",
    revelationOrder: Number(meta.order),
    ayahCount: ayahs.length,
    startPage: ayahs[0].page,
  });
}

if (surahIndex.length !== 114 || totalAyahs !== 6236) {
  throw new Error(`Unexpected totals: ${surahIndex.length} surahs, ${totalAyahs} ayahs`);
}

writeFileSync(join(outDir, "surahs.json"), JSON.stringify(surahIndex, null, 2) + "\n");
console.log(`Generated 114 surahs / ${totalAyahs} ayahs into ${outDir}`);
