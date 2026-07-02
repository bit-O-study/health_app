/**
 * 커뮤니티(오운완 인증) 순수 로직 — 입력 검증 · 뷰 필터 · 상대시간.
 * 서버/DB 의존 없음(테스트 가능).
 */

export const MAX_CAPTION = 200;

export type PostInput = { photoUrl: string; caption: string };

export function validatePostInput(
  input: PostInput,
): { ok: true } | { ok: false; error: string } {
  const url = input.photoUrl?.trim() ?? "";
  if (!url) return { ok: false, error: "사진을 먼저 올려주세요." };
  if (!/^https?:\/\//.test(url))
    return { ok: false, error: "사진 주소가 올바르지 않습니다." };
  if ((input.caption ?? "").length > MAX_CAPTION)
    return { ok: false, error: `한마디는 ${MAX_CAPTION}자까지 쓸 수 있어요.` };
  return { ok: true };
}

/** 상단 '전체' 탭 — 공개글(groupId=null)만. 그룹글은 그룹 탭에서만 보인다. */
export function publicOnly<T extends { groupId: string | null }>(
  posts: T[],
): T[] {
  return posts.filter((p) => p.groupId === null);
}

/**
 * 선택된 그룹들의 글만(여러 개 선택 시 합집합). 공개글(groupId=null)은 제외.
 * 선택이 비어 있으면 아무것도 안 보인다. (그룹 탭의 '전체'는 모든 그룹 선택 = 그룹글 전부.)
 */
export function postsForFilter<T extends { groupId: string | null }>(
  posts: T[],
  selectedGroupIds: string[],
): T[] {
  const set = new Set(selectedGroupIds);
  return posts.filter((p) => p.groupId !== null && set.has(p.groupId));
}

/** 작성 시각 → "방금 전 / N분 전 / N시간 전 / N일 전 / N주 전". now 주입(테스트 가능). */
export function relativeTime(createdAtMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - createdAtMs);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const wk = Math.floor(day / 7);
  return `${wk}주 전`;
}
