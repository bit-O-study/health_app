import { describe, expect, it } from "vitest";

import { normalizePhone } from "@/features/auth/phone";

describe("normalizePhone", () => {
  it("0으로 시작하는 한국 번호는 +82 로", () => {
    expect(normalizePhone("010-1234-5678")).toBe("+821012345678");
    expect(normalizePhone("01012345678")).toBe("+821012345678");
    expect(normalizePhone("010 1234 5678")).toBe("+821012345678");
  });

  it("이미 +82 면 그대로(기호만 제거)", () => {
    expect(normalizePhone("+82 10-1234-5678")).toBe("+821012345678");
    expect(normalizePhone("+821012345678")).toBe("+821012345678");
  });

  it("DB norm_phone 과 동일 규칙이라 같은 입력은 같은 결과", () => {
    // 가입(+82 저장) vs 찾기 화면(010 입력)이 매칭되려면 둘이 같아야 한다.
    expect(normalizePhone("010-1234-5678")).toBe(normalizePhone("+821012345678"));
  });
});
