/**
 * 로그인 없이는 못 들어가는 경로 — 미들웨어가 문서 요청에서 판정해 /login 으로 보낸다.
 * (순수 모듈: 미들웨어에서 떼어내 단위테스트할 수 있게.)
 */

export const PROTECTED_PREFIXES = [
  // /home 은 loading.tsx 로 스트리밍된다 — 페이지 안에서 redirect("/login") 를 하면
  // 이미 200 으로 흘려보낸 뒤라 '소프트 리다이렉트'(클라이언트 스크립트)가 된다.
  // 미들웨어에서 먼저 걸러야 비로그인 사용자가 깔끔하게 307 로 /login 에 간다.
  "/home",
  "/settings",
  "/onboarding",
  "/plan",
  "/admin",
  "/change-password",
  "/exercises", // 운동 찾기(목록·상세) — 로그인 후에만 노출
  "/commitments", // 다짐 — 개인 목표(로그인 필요)
  "/coach", // 헬쑤쌤(AI 코치) — 로그인 필요
  "/pet", // 늑대 키우기 — 로그인 필요
] as const;

/**
 * 보호 경로인지. 프리픽스와 **정확히 같거나** 그 하위 경로(`/plan/today`)면 보호 대상.
 * `/planner` 처럼 프리픽스로 시작만 하는 다른 경로는 보호 대상이 아니다.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
