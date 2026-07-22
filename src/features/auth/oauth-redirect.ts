/** OAuth(구글·카카오) 인증 후 돌아오는 콜백 경로. */
export const OAUTH_CALLBACK_PATH = "/auth/callback";

/**
 * 미들웨어가 세션에 손대면 안 되는 경로인지 — OAuth 콜백이 그렇다.
 *
 * 콜백 시점엔 아직 세션이 없어 미들웨어의 self-heal 이
 * signOut({ scope: 'local' }) 로 supabase 쿠키를 전부 지우는데, 거기에 PKCE
 * code verifier 쿠키가 포함된다. 그러면 곧이어 라우트 핸들러의
 * exchangeCodeForSession 이 "PKCE code verifier not found in storage" 로 실패한다.
 */
export function isOAuthCallbackPath(pathname: string): boolean {
  return pathname === OAUTH_CALLBACK_PATH;
}

/**
 * 로그인/OAuth 콜백 후 이동할 경로 검증 — 외부 사이트로 튀는 open redirect 방지.
 * '/'로 시작하는 내부 경로만 허용하고, '//evil.com' 같은 프로토콜 상대 경로는 거부.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/** 통합 관리자 콘솔(별도 앱) URL — 참고용. 관리자는 이 주소로 직접 접속해 관리한다. */
export const ADMIN_CONSOLE_URL = "https://heltch-admin.vercel.app/admin";

/**
 * 로그인 후 이동할 목적지(순수 로직).
 * 관리자·일반 구분 없이 open-redirect 안전 처리된 내부 경로로 보낸다.
 * (관리자를 외부 콘솔로 자동 이동시키면 앱 WebView 에서 로그인이 버퍼링/실패해서
 *  제거했다. 관리자 콘솔은 브라우저로 위 URL 에 직접 접속한다.)
 */
export function destinationForUser(
  _isAdmin: boolean,
  requested: string | null | undefined,
): string {
  return safeRedirectPath(requested);
}
