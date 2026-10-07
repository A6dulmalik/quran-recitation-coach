import { getSurahMeta, type SurahMeta } from "@repo/quran-data";

export interface AyahRange {
  meta: SurahMeta;
  start: number;
  end: number;
  /** Optional ayah to open first (within start–end) */
  from?: number;
}

/** Parse ?surah=&start=&end=&from= into a valid range, or null if invalid. */
export function parseRange(params: Pick<URLSearchParams, "get" | "has">): AyahRange | null {
  const meta = getSurahMeta(Number(params.get("surah")));
  if (!meta) return null;
  const start = params.has("start") ? Number(params.get("start")) : 1;
  const end = params.has("end") ? Number(params.get("end")) : meta.ayahCount;
  const valid =
    Number.isInteger(start) && Number.isInteger(end) && start >= 1 && start <= end && end <= meta.ayahCount;
  if (!valid) return null;

  const from = params.has("from") ? Number(params.get("from")) : undefined;
  const fromValid = from !== undefined && Number.isInteger(from) && from >= start && from <= end;
  return { meta, start, end, ...(fromValid ? { from } : {}) };
}

export function rangeQuery({ surah, start, end, from }: { surah: number; start?: number; end?: number; from?: number }) {
  const params = new URLSearchParams({ surah: String(surah) });
  if (start !== undefined) params.set("start", String(start));
  if (end !== undefined) params.set("end", String(end));
  if (from !== undefined) params.set("from", String(from));
  return params.toString();
}

export function describeRange(range: { start: number; end: number }, ayahCount: number): string {
  if (range.start === 1 && range.end === ayahCount) return `All ${ayahCount} ayahs`;
  return range.start === range.end ? `Ayah ${range.start}` : `Ayahs ${range.start}–${range.end}`;
}
