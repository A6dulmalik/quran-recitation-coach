// Parser for Tanzil translation/transliteration downloads (https://tanzil.net/trans/).
// Format: one ayah per line as `surah|ayah|text`; lines starting with `#` are the
// license/copyright header. The text is copied as-is.

/** @returns {{ entries: Map<string, string>, copyright: string }} */
export function parseTanzilTranslation(raw) {
  const entries = new Map();
  const header = [];
  for (const line of raw.replace(/^\u{FEFF}/u, "").split(/\r?\n/)) {
    if (line.startsWith("#")) {
      header.push(line.replace(/^#\s?/, ""));
      continue;
    }
    const match = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (match) entries.set(`${Number(match[1])}:${Number(match[2])}`, match[3].trim());
  }
  return { entries, copyright: header.join("\n").trim() };
}
