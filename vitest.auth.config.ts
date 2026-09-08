import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";

// CI 환경변수를 우선하고 로컬에서는 Next와 동일한 설정 파일을 읽는다.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

/**
 * `pnpm test:auth` 전용 — 라이브 Supabase **Auth 콘솔 설정** 가드.
 *
 * 외부 콘솔 상태를 확인하므로 단위 스위트와 분리하고 CI의 별도 단계로 실행한다.
 * 인증 설정 실패는 CI 최종 판정에도 반영한다.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/be/auth-config.test.ts"],
    globals: true,
    testTimeout: 20_000,
  },
});
