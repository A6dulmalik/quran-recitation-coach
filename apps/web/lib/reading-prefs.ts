import { z } from "zod";

// Reading aids shown under each ayah. Device-local, like progress.

const schema = z.object({
  transliteration: z.boolean().catch(true),
  translation: z.boolean().catch(true),
});

export type ReadingPrefs = z.infer<typeof schema>;

export const DEFAULT_PREFS: ReadingPrefs = { transliteration: true, translation: true };
const STORAGE_KEY = "qrc.reading.v1";

type Listener = () => void;
const listeners = new Set<Listener>();
let current: ReadingPrefs | undefined;

export function parseStoredPrefs(raw: string | null): ReadingPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

function read(): ReadingPrefs {
  if (current) return current;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: defaults for this visit.
  }
  current = parseStoredPrefs(raw);
  return current;
}

export const readingPrefsStore = {
  getSnapshot: read,
  getServerSnapshot: () => DEFAULT_PREFS,
  subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      current = parseStoredPrefs(e.newValue);
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  update(patch: Partial<ReadingPrefs>) {
    current = { ...read(), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Storage full or blocked: keep the choice in memory for this visit.
    }
    listeners.forEach((l) => l());
  },
};
