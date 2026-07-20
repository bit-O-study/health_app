import { describe, expect, it } from "vitest";

import {
  isOAuthCallbackPath,
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
