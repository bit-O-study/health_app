/**
 * 운동 티칭 커뮤니티 순수 로직 — 입력 검증 · 태그 정규화 · 태그 필터/집계.
 * 서버/DB 의존 없음(테스트 가능).
 */

export const MAX_TEACHING_CAPTION = 200;
export const MAX_TAG = 40;
/** 티칭 영상 권장 최대 길이(초). 30초 목표 + 업로드 여유. */
export const TEACHING_MAX_SECONDS = 35;

/** 게시판 규칙 안내(비방·욕설·이상한 내용 → 정지). */
export const TEACHING_RULES =
  "비방·욕설·음란물·광고 등 부적절한 게시물은 예고 없이 삭제되며, 반복 시 계정이 정지될 수 있습니다.";

export type TeachingInput = {
  videoUrl: string;
  exerciseTag: string;
  caption: string;
};

/** 태그 정규화 — 앞뒤 공백 제거 + 연속 공백 하나로. */
export function normalizeTag(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_TAG);
}

export function validateTeachingPost(
  input: TeachingInput,
): { ok: true } | { ok: false; error: string } {
  const url = input.videoUrl?.trim() ?? "";
  if (!url) return { ok: false, error: "영상을 먼저 올려주세요." };
  if (!/^https?:\/\//.test(url))
    return { ok: false, error: "영상 주소가 올바르지 않습니다." };
  const tag = normalizeTag(input.exerciseTag);
  if (!tag) return { ok: false, error: "어떤 운동인지 태그를 입력해주세요." };
  if ((input.caption ?? "").length > MAX_TEACHING_CAPTION)
    return { ok: false, error: `한마디는 ${MAX_TEACHING_CAPTION}자까지 쓸 수 있어요.` };
  return { ok: true };
}

/** 태그(운동명)로 필터 — 대소문자·공백 무시 부분일치. 빈 검색어면 전체. */
export function filterByTag<T extends { exerciseTag: string }>(
  posts: T[],
  query: string,
): T[] {
  const q = (query ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return posts;
  return posts.filter((p) =>
    p.exerciseTag.toLowerCase().replace(/\s+/g, "").includes(q),
  );
}

/** 피드에 등장한 태그 목록(빈도 높은 순, 상단 칩용). */
export function popularTags<T extends { exerciseTag: string }>(
  posts: T[],
  limit = 12,
): string[] {
  const count = new Map<string, number>();
  for (const p of posts) {
    const t = normalizeTag(p.exerciseTag);
    if (!t) continue;
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}