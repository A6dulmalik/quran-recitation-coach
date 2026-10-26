import { defineConfig } from "vitest/config";

// The dataset tests walk all 6,236 ayahs; allow for slow CI runners.
export default defineConfig({
  test: { testTimeout: 60_000 },
});
