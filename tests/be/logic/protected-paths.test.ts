import { describe, expect, it } from "vitest";

import {
  PROTECTED_PREFIXES,
  isProtectedPath,
} from "@/features/auth/protected-paths";

describe("isProtectedPath", () => {
  it("프리픽스와 정확히 같으면 보호 대상", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(isProtectedPath(prefix)).toBe(true);
    }
  });

  it("하위 경로도 보호 대상", () => {
    expect(isProtectedPath("/plan/today")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
    expect(isProtectedPath("/exercises/bench-press")).toBe(true);
  });

  it("프리픽스로 '시작만' 하는 다른 경로는 보호 대상이 아니다", () => {
    expect(isProtectedPath("/planner")).toBe(false);
    expect(isProtectedPath("/homepage")).toBe(false);
    expect(isProtectedPath("/coaching")).toBe(false);
  });

  it("로그인 없이 볼 수 있는 경로는 그대로 통과", () => {
    for (const p of [
      "/",
      "/login",
      "/find-id",
      "/find-password",
      "/privacy",
      "/routine",
      "/calendar",
      "/diet",
      "/community",
      "/suspended",
    ]) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it("/home 은 보호 대상 — 스트리밍(loading.tsx) 때문에 페이지 안 redirect 로는 늦다", () => {
    // /home 은 loading.tsx 가 생기면서 응답이 200 으로 먼저 흘러나간다.
    // 그 뒤 페이지에서 redirect("/login") 를 하면 소프트 리다이렉트가 되므로
    // 미들웨어가 먼저 307 로 막아야 한다. (이 단언이 깨지면 그 보호가 사라진 것)
    expect(isProtectedPath("/home")).toBe(true);
  });
});
