import { describe, expect, it } from "vitest";

import {
  destinationForUser,
  isOAuthCallbackPath,
  publicOrigin,
  safeRedirectPath,
} from "@/features/auth/oauth-redirect";

// 회귀 방지: OAuth 콜백에서 미들웨어가 세션을 건드리면 PKCE code verifier 쿠키가
// 지워져 "PKCE code verifier not found in storage" 로 소셜 로그인이 통째로 깨진다.
describe("isOAuthCallbackPath", () => {
  it("★ /auth/callback 은 미들웨어가 건너뛴다", () => {
    expect(isOAuthCallbackPath("/auth/callback")).toBe(true);
  });

  it("다른 경로는 평소대로 미들웨어를 탄다", () => {
    expect(isOAuthCallbackPath("/")).toBe(false);
    expect(isOAuthCallbackPath("/login")).toBe(false);
    expect(isOAuthCallbackPath("/auth")).toBe(false);
    expect(isOAuthCallbackPath("/auth/callback/extra")).toBe(false);
  });
});

// OAuth 콜백/로그인 후 이동 경로 — 외부 사이트로 튀는 open redirect 방지.
describe("safeRedirectPath", () => {
  it("정상 내부 경로는 그대로 통과", () => {
    expect(safeRedirectPath("/plan")).toBe("/plan");
    expect(safeRedirectPath("/commitments?tab=all")).toBe("/commitments?tab=all");
  });

  it("없거나 빈 값은 홈으로", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("'/'로 시작하지 않는 값(외부 절대 URL 등)은 거부 → 홈으로", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("evil.com")).toBe("/");
  });

  it("★ 프로토콜 상대 경로('//evil.com')는 '/'로 시작해도 거부 → 홈으로", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("//evil.com/phishing")).toBe("/");
  });
});

// 관리자·일반 구분 없이 open-redirect 안전 처리된 내부 경로로(관리자 자동 콘솔이동
// 은 앱 WebView 버퍼링 때문에 제거 — 콘솔은 직접 접속).
describe("destinationForUser", () => {
  it("관리자도 앱에서는 내부 경로로(콘솔 자동이동 안 함)", () => {
    expect(destinationForUser(true, "/plan")).toBe("/plan");
    expect(destinationForUser(true, "//evil.com")).toBe("/");
    expect(destinationForUser(true, null)).toBe("/");
  });

  it("일반 사용자도 open-redirect 안전 처리된 내부 경로로", () => {
    expect(destinationForUser(false, "/plan")).toBe("/plan");
    expect(destinationForUser(false, "//evil.com")).toBe("/");
    expect(destinationForUser(false, "https://evil.com")).toBe("/");
    expect(destinationForUser(false, null)).toBe("/");
  });
});

// 회귀 방지(2026-10-31): 서버(0.0.0.0:4100 으로 뜬 Next)에서 소셜 로그인 뒤
// https://0.0.0.0:4100/login 으로 튀어 ERR_ADDRESS_INVALID — 브라우저가 쓴 주소로 돌려보낸다.
describe("publicOrigin", () => {
  const h = (o: Record<string, string>) => new Headers(o);

  it("★ 서버 내부 주소 대신 브라우저가 접속한 도메인", () => {
    expect(publicOrigin("https://0.0.0.0:4100/auth/callback?code=x", h({ host: "www.helthssu.co.kr", "x-forwarded-proto": "https" }))).toBe("https://www.helthssu.co.kr");
  });

  it("프록시가 넘긴 x-forwarded-host 를 먼저 쓴다", () => {
    expect(publicOrigin("http://0.0.0.0:4100/auth/callback", h({ host: "127.0.0.1:4100", "x-forwarded-host": "www.helthssu.co.kr", "x-forwarded-proto": "https" }))).toBe("https://www.helthssu.co.kr");
  });

  it("로컬 개발은 그대로(http://localhost:3000)", () => {
    expect(publicOrigin("http://localhost:3000/auth/callback", h({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("호스트가 없거나 이상하면 request.url 의 origin", () => {
    expect(publicOrigin("https://health-app-five-iota.vercel.app/auth/callback", h({}))).toBe("https://health-app-five-iota.vercel.app");
    expect(publicOrigin("https://a.example/auth/callback", h({ host: "evil.com/path" }))).toBe("https://a.example");
  });
});
