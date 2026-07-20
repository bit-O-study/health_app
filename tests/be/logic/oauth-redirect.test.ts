import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/features/auth/oauth-redirect";

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
