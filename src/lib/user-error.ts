/**
 * 사용자에게 보여 줄 오류 문구(2026-10-14).
 *
 * 예전엔 서버 동작 140여 곳이 DB·인증 오류의 원문(영어, 내부 이름 포함)을 그대로 화면에 돌려줬다
 * ("duplicate key value violates unique constraint …"). 여기서 한 번 거른다.
 *  - 우리가 직접 쓴 한글 문구(DB 함수의 raise exception · 앱의 throw new Error("…"))는 그대로 보여 준다.
 *  - 그 밖의 원문은 서버 기록에만 남기고, 화면에는 다시 시도하라는 문구를 보여 준다.
 */
const HANGUL = /[가-힣]/;

export const GENERIC_USER_ERROR = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

export function toUserError(error: unknown, fallback: string = GENERIC_USER_ERROR): string {
  const e = (error ?? {}) as { message?: unknown; code?: unknown };
  const message = typeof error === "string" ? error : typeof e.message === "string" ? e.message : "";
  if (message && HANGUL.test(message)) return message;
  if (message) {
    // 원문은 서버 기록에만(사용자 화면에는 안 보낸다).
    console.error("[user-error]", typeof e.code === "string" ? e.code : "", message.slice(0, 300));
  }
  return fallback;
}
