"use client";

import { useCallback, useEffect, useState } from "react";
import { surahFileName, type SurahFile } from "@repo/quran-data";

const cache = new Map<number, Promise<SurahFile>>();

/** Load one surah's text (served from /quran, copied from @repo/quran-data). */
export function loadSurah(surah: number): Promise<SurahFile> {
  const cached = cache.get(surah);
  if (cached) return cached;

  const request = fetch(`/quran/${surahFileName(surah)}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load surah ${surah} (HTTP ${res.status})`);
      return res.json() as Promise<SurahFile>;
    })
    .catch((error: unknown) => {
      cache.delete(surah); // let a retry try the network again
      throw error;
    });

  cache.set(surah, request);
  return request;
}

export type SurahState =
  | { status: "loading" }
  | { status: "error"; error: string; retry: () => void }
  | { status: "ready"; surah: SurahFile };

export function useSurah(surah: number): SurahState {
  const [result, setResult] = useState<{ surah: number; data?: SurahFile; error?: string }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadSurah(surah).then(
      (data) => !cancelled && setResult({ surah, data }),
      (error: unknown) =>
        !cancelled &&
        setResult({
          surah,
          error: error instanceof Error ? error.message : "Could not load this surah",
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [surah, attempt]);

  const retry = useCallback(() => {
    setResult(undefined);
    setAttempt((n) => n + 1);
  }, []);

  if (!result || result.surah !== surah) return { status: "loading" };
  if (result.error || !result.data) {
    return { status: "error", error: result.error ?? "Could not load this surah", retry };
  }
  return { status: "ready", surah: result.data };
}
