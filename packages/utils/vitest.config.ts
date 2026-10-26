import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@repo/quran-data": path("../quran-data/src/index.ts"),
      "@repo/types": path("../types/src/index.ts"),
    },
  },
  // Some tests evaluate every ayah of several surahs; allow for slow CI runners.
  test: { testTimeout: 60_000 },
});
