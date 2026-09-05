import { defineConfig } from "vitest/config";

/**
 * `pnpm test:auth` 전용 — 라이브 Supabase **Auth 콘솔 설정** 가드.
 *
 * 기본 스위트에서 분리한 이유: 여기서 나는 실패는 코드가 아니라 콘솔 설정이라
 * `pnpm build` 게이트를 막아도 코드로는 못 고친다. 설정을 만졌을 때 직접 돌린다.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/be/auth-config.test.ts"],
    globals: true,
    testTimeout: 20_000,
  },
});
