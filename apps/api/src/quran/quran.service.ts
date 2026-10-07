import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  getAyahWords,
  isValidAyahRef,
  surahFileName,
  type AyahRecord,
  type AyahWords,
  type SurahFile,
} from "@repo/quran-data";

export interface LoadedAyah {
  record: AyahRecord;
  words: AyahWords;
}

/** Serves the bundled Qur'an text so expected words are never taken from clients. */
@Injectable()
export class QuranService {
  private readonly dataDir = join(
    dirname(require.resolve("@repo/quran-data/package.json")),
    "data",
    "surah",
  );
  private readonly surahs = new Map<number, Promise<SurahFile>>();

  async getAyah(surah: number, ayah: number): Promise<LoadedAyah> {
    if (!isValidAyahRef(surah, ayah)) {
      throw new NotFoundException(`Ayah ${surah}:${ayah} does not exist`);
    }
    const file = await this.loadSurah(surah);
    const record = file.ayahs[ayah - 1];
    return { record, words: getAyahWords(record) };
  }

  private loadSurah(surah: number): Promise<SurahFile> {
    let file = this.surahs.get(surah);
    if (!file) {
      file = readFile(join(this.dataDir, surahFileName(surah)), "utf8").then(
        (json) => JSON.parse(json) as SurahFile,
      );
      file.catch(() => this.surahs.delete(surah));
      this.surahs.set(surah, file);
    }
    return file;
  }
}
