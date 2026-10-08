"use client";

import { useSyncExternalStore } from "react";
import { progressStore, type ProgressState } from "@/lib/progress";

/** Device-local practice progress; re-renders on change (including other tabs). */
export function useProgress(): ProgressState {
  return useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
    progressStore.getServerSnapshot,
  );
}
