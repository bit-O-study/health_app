import { configDefaults, defineConfig } from "vitest/config";
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
    // 라이브 Auth **콘솔 설정** 가드는 기본 스위트에서 뺀다 — 거기서 나는 실패는
    // 코드가 아니라 Supabase 콘솔 설정이라, 빌드 게이트를 막아도 코드로는 못 고친다.
    // 설정을 만졌을 때 `pnpm test:auth` 로 직접 돌린다.
    exclude: [...configDefaults.exclude, "tests/be/auth-config.test.ts"],
    globals: true,
    // beforeEach 안에서 무거운 모듈을 동적 import 하는 테스트가 있다
    // (exercise-catalog-extra 727KB 등). 워커가 여러 개 붙는 순간 기본 10초를
    // 넘겨 "Hook timed out in 10000ms" 로 간헐 실패했다 — 로직 문제가 아니라
    // 로딩 시간이라 여유를 준다. (근본 해결은 카탈로그를 서버로 옮기는 1.2)
    hookTimeout: 30_000,
    testTimeout: 20_000,
    // Vitest 4 의 기본 pool 은 forks 다. 무거운 모듈을 물고 있던 자식 프로세스가
    // 기본 10초 안에 안 죽으면
    //   `[vitest-pool]: Timeout terminating forks worker for test files …`
    // 가 뜬다(결과는 통과인데 로그만 지저분해지고, 종료가 늦어진다).
    // 다른 빌드가 같이 도는 등 CPU 가 붐빌 때 재현된다.
    teardownTimeout: 30_000,
  },
});
