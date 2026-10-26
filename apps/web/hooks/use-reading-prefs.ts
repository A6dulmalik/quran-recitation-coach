"use client";

import { useSyncExternalStore } from "react";
import { readingPrefsStore, type ReadingPrefs } from "@/lib/reading-prefs";

export function useReadingPrefs(): ReadingPrefs {
  return useSyncExternalStore(
    readingPrefsStore.subscribe,
    readingPrefsStore.getSnapshot,
    readingPrefsStore.getServerSnapshot,
  );
}
