import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": path("./"),
      "@repo/quran-data": path("../../packages/quran-data/src/index.ts"),
      "@repo/types": path("../../packages/types/src/index.ts"),
      "@repo/utils": path("../../packages/utils/src/index.ts"),
    },
  },
  test: {
    include: ["**/*.spec.ts", "**/*.spec.tsx"],
    exclude: ["node_modules/**", ".next/**", "out/**", "e2e/**"],
    environment: "node",
  },
});
