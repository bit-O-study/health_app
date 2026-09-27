import { randomBytes } from "node:crypto";

/** Missing/malformed ownership must never fall back to deleting all test users. */
export function runEmailPrefix(): string | null {
  const id = process.env.E2E_RUN_ID;
  return id && /^[a-f0-9]{32}$/.test(id) ? `e2e_${id}_` : null;
}

/** Unique throwaway email owned by this Playwright invocation. */
export function freshEmail(): string {
  const prefix = runEmailPrefix();
  if (!prefix) throw new Error("Missing/invalid E2E_RUN_ID — run Playwright global setup first");
  // 61-character local part stays within the email limit of 64.
  return `${prefix}${randomBytes(12).toString("hex")}@example.com`;
}

export const TEST_PASSWORD = "test123456";

/**
 * 이 Playwright 실행만의 이름 — 그룹처럼 **이름으로 되찾는** 데이터에 쓴다.
 *
 * 이메일은 `E2E_RUN_ID` 로 이미 격리돼 있었지만, 그룹 이름은 고정 문자열이었다.
 * 그래서 다른 에이전트가 같은 라이브 DB 로 E2E 를 **동시에** 돌리면
 * `where name='E2E 주간분석'` 이 2건을 물어 와 테스트가 깨졌다(2026-09-21).
 * 실행 id 를 이름에 붙여 서로 안 섞이게 한다.
 */
export function scopedName(base: string): string {
  const id = process.env.E2E_RUN_ID;
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    throw new Error("Missing/invalid E2E_RUN_ID — run Playwright global setup first");
  }
  return `${base} ${id.slice(0, 8)}`;
}
