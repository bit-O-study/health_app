import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// BE tests: pure-logic unit tests + read-only schema-sync guard.
// Path alias mirrors tsconfig "@/*" → "src/*".
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `import "server-only"` 는 Next 번들러 전용 가드라 node 에서 해석이 안 된다.
      // 서버 모듈 속 순수 로직을 테스트할 수 있게 빈 모듈로 갈아끼운다.
      "server-only": fileURLToPath(
        new URL("./tests/be/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/be/**/*.test.ts"],
    globals: true,
  },
});
