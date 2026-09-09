/** 트레이너 코멘트 — 순수 로직(검증·표시). 테스트 가능. */

/**
 * 최대 길이. 그룹 응원(10자)과 달리 **자세를 짚어 줄 수 있어야** 해서 넉넉하다.
 * DB `check (char_length(body) between 1 and 500)` 와 **같은 값**이어야 한다 —
 * 화면이 더 길게 받으면 저장 순간 원인 모를 오류가 나고, 더 짧게 받으면 DB 제약이
 * 아무 일도 안 한다.
 */
export const MAX_COMMENT_LEN = 500;

export type CommentCheck = { ok: true; body: string } | { ok: false; error: string };

/**
 * 저장 전 검증. 앞뒤 공백을 털고 길이를 본다.
 *
 * 공백만 있는 코멘트를 막는 이유: DB 제약은 `char_length >= 1` 이라 스페이스 하나도
 * 통과한다 — 회원 화면에 빈 말풍선이 뜬다.
 */
export function checkComment(raw: unknown): CommentCheck {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length === 0) return { ok: false, error: "내용을 입력해 주세요." };
  if (body.length > MAX_COMMENT_LEN)
    return { ok: false, error: `${MAX_COMMENT_LEN}자까지 쓸 수 있어요.` };
  return { ok: true, body };
}

export type TrainerComment = {
  id: string;
  body: string;
  /** 작성 시각(ISO). */
  createdAt: string;
  /** 쓴 사람 표시 이름(회원 화면용). */
  fromName: string;
};

/** "9월 9일" 같은 짧은 날짜 — 코멘트 목록의 구분선. 잘못된 값이면 빈 문자열. */
export function commentDateLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(t));
  return d;
}
