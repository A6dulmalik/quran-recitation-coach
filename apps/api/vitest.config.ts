import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));

// SWC (not esbuild) so Nest's decorator metadata is emitted and DI works in tests.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  resolve: {
    alias: {
      "@repo/types": fromRoot("packages/types/src/index.ts"),
      "@repo/utils": fromRoot("packages/utils/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
