import { describe, expect, it, vi } from "vitest";

import { GENERIC_USER_ERROR, toUserError } from "@/lib/user-error";

describe("사용자에게 보여 줄 오류 문구(2026-10-14)", () => {
  it("DB·인증 원문(영어)은 화면에 안 보내고 다시 시도 문구로 바꾼다 — 원문은 서버 기록에만", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toUserError({ message: 'duplicate key value violates unique constraint "x"', code: "23505" })).toBe(GENERIC_USER_ERROR);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("우리가 쓴 한글 문구(DB 함수 raise · throw)는 그대로 보여 준다", () => {
    expect(toUserError({ message: "오늘 초대 한도를 넘었어요.", code: "P0001" })).toBe("오늘 초대 한도를 넘었어요.");
    expect(toUserError(new Error("추천 워밍업·마무리를 넣지 못했어요."))).toBe("추천 워밍업·마무리를 넣지 못했어요.");
  });

  it("값이 없거나 이상하면 대신 쓸 문구", () => {
    expect(toUserError(null)).toBe(GENERIC_USER_ERROR);
    expect(toUserError(undefined, "저장하지 못했어요.")).toBe("저장하지 못했어요.");
  });
});
