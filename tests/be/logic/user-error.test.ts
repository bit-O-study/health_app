import { describe, expect, it } from "vitest";
import { userErrorMessage } from "@/lib/user-error";
describe("service error copy", () => {
  it("explains common auth failures in Korean", () => {
    expect(userErrorMessage({code:"email_not_confirmed"})).toContain("이메일 인증");
    expect(userErrorMessage({status:429})).toContain("잠시");
    expect(userErrorMessage({message:"Invalid login credentials"})).toContain("비밀번호");
    expect(userErrorMessage(new TypeError("Failed to fetch"))).toContain("인터넷");
  });
  it("never exposes arbitrary database or provider details", () => {
    expect(userErrorMessage({message:'relation private_table not found'}, "저장 실패")).toBe("저장 실패");
    expect(userErrorMessage(null,"다시 시도")).toBe("다시 시도");
  });
});
