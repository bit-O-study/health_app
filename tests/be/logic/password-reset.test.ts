import { describe, expect, it } from "vitest";

import { genTempPassword, tempPasswordEmail } from "@/features/auth/password-reset";

describe("genTempPassword", () => {
  it("기본 10자, 길이 지정 가능, 최소 6자 보장", () => {
    expect(genTempPassword()).toHaveLength(10);
    expect(genTempPassword(12)).toHaveLength(12);
    // 6자 미만 요청해도 6자로 끌어올림(RPC 의 length>=6 검증과 일치).
    expect(genTempPassword(3).length).toBeGreaterThanOrEqual(6);
  });

  it("혼동 글자(0,O,1,l,I)는 포함하지 않고 영숫자만", () => {
    const pw = genTempPassword(200);
    expect(pw).toMatch(/^[a-zA-Z0-9]+$/);
    expect(pw).not.toMatch(/[0O1lI]/);
  });

  it("매번 다른 값을 생성(충돌 거의 없음)", () => {
    const set = new Set(Array.from({ length: 50 }, () => genTempPassword()));
    expect(set.size).toBe(50);
  });
});

describe("tempPasswordEmail", () => {
  it("제목과 본문(html/text)에 임시 비밀번호가 들어간다", () => {
    const { subject, html, text } = tempPasswordEmail("Ab2Cd3Ef4G");
    expect(subject).toContain("임시 비밀번호");
    expect(html).toContain("Ab2Cd3Ef4G");
    expect(text).toContain("Ab2Cd3Ef4G");
  });
});
