import { describe, expect, it } from "vitest";

import { resolveMemberName } from "@/features/groups/member-name";

describe("resolveMemberName — 그룹 멤버 표시 이름", () => {
  it("닉네임이 있으면 항상 닉네임 우선", () => {
    expect(resolveMemberName("닉", "홍길동", "회원")).toBe("닉");
    expect(resolveMemberName("닉", null, null)).toBe("닉");
  });

  it("닉네임 없으면 프로필 이름", () => {
    expect(resolveMemberName(null, "홍길동", "회원")).toBe("홍길동");
    expect(resolveMemberName("  ", "홍길동", null)).toBe("홍길동");
  });

  it("닉네임·이름 없으면 가입 스냅샷(display_name)", () => {
    expect(resolveMemberName(null, null, "별명")).toBe("별명");
  });

  it("스냅샷이 기본값 '회원'이면 무시", () => {
    expect(resolveMemberName(null, null, "회원")).toBe("회원");
  });

  it("전부 없으면 '회원'", () => {
    expect(resolveMemberName(null, null, null)).toBe("회원");
    expect(resolveMemberName(undefined, undefined, undefined)).toBe("회원");
  });

  it("공백은 트림", () => {
    expect(resolveMemberName("  김철수 ", null, null)).toBe("김철수");
  });
});
