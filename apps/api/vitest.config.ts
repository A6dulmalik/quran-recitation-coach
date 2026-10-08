import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));

// SWC (not esbuild) so Nest's decorator metadata is emitted and DI works in tests.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  resolve: {
    alias: [
      { find: "@repo/quran-data", replacement: fromRoot("packages/quran-data/src/index.ts") },
      { find: "@repo/types", replacement: fromRoot("packages/types/src/index.ts") },
      { find: "@repo/utils", replacement: fromRoot("packages/utils/src/index.ts") },
    ],
  },
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
