/** Audio container formats Whisper accepts, detected from the file's bytes. */
export type AudioFormat = "webm" | "ogg" | "wav" | "mp3" | "mp4" | "flac";

/**
 * Identify the container from its signature rather than trusting the
 * client-supplied MIME type. Returns null for anything that is not audio.
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat | null {
  if (buffer.length < 12) return null;
  const ascii = (start: number, end: number) => buffer.toString("latin1", start, end);

  if (buffer.readUInt32BE(0) === 0x1a45dfa3) return "webm"; // EBML (WebM/Matroska)
  if (ascii(0, 4) === "OggS") return "ogg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "wav";
  if (ascii(0, 4) === "fLaC") return "flac";
  if (ascii(4, 8) === "ftyp") return "mp4"; // MP4/M4A (Safari records audio/mp4)
  if (ascii(0, 3) === "ID3") return "mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3"; // MPEG frame sync
  return null;
}
