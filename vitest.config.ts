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
    // 🔴 pool 은 **threads**. Vitest 4 기본값은 forks(테스트 파일마다 자식 프로세스)인데,
    // 이 스위트는 파일당 실제 실행이 7.8초뿐이고 나머지가 전부 프로세스 기동·모듈
    // 재적재 비용이었다 — 같은 157파일이 forks 309초 / threads 43초다(2026-09-07 측정).
    // 이 시간은 `predev`·`prebuild` 게이트로 **`pnpm dev` 를 켤 때마다** 물린다.
    // 파일 간 격리(`isolate`)는 기본값 그대로 켜 둔다 — 여기서 더 줄이겠다고 격리를
    // 끄면 앞 파일이 남긴 모듈 상태가 뒤 파일 결과를 바꾼다(카탈로그 캐시가 특히).
    pool: "threads",
    // 무거운 모듈(exercise-catalog-extra 727KB 등)을 물고 있던 워커가 기본 10초 안에
    // 안 죽으면 종료 경고가 뜨고 마무리가 늦어진다. 다른 빌드가 같이 도는 등 CPU 가
    // 붐빌 때 재현된다.
    teardownTimeout: 30_000,
  },
});
