/**
 * 로그인/OAuth 콜백 후 이동할 경로 검증 — 외부 사이트로 튀는 open redirect 방지.
 * '/'로 시작하는 내부 경로만 허용하고, '//evil.com' 같은 프로토콜 상대 경로는 거부.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
