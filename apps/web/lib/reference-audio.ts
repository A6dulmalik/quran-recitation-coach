// Reference recitation audio, one MP3 per ayah (EveryAyah-style URL layout:
// {base}/{SSS}{AAA}.mp3). Configure with NEXT_PUBLIC_RECITATION_AUDIO_BASE.
const BASE = (
  process.env.NEXT_PUBLIC_RECITATION_AUDIO_BASE ?? "https://everyayah.com/data/Alafasy_128kbps"
).replace(/\/$/, "");

export const RECITER_NAME = process.env.NEXT_PUBLIC_RECITER_NAME ?? "Mishary Rashid Alafasy";

const pad3 = (n: number) => String(n).padStart(3, "0");

export function referenceAudioUrl(surah: number, ayah: number): string {
  return `${BASE}/${pad3(surah)}${pad3(ayah)}.mp3`;
}
