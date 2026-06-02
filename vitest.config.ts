import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// BE tests: pure-logic unit tests + read-only schema-sync guard.
// Path alias mirrors tsconfig "@/*" → "src/*".
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/be/**/*.test.ts"],
    globals: true,
  },
});
