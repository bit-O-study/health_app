/**
 * 커뮤니티(오운완 인증) 순수 로직 — 입력 검증 · 뷰 필터 · 상대시간.
 * 서버/DB 의존 없음(테스트 가능).
 */

export const MAX_CAPTION = 200;

export type PostInput = { photoUrl: string; caption: string; hasWorkout?: boolean };

export function validatePostInput(
  input: PostInput,
): { ok: true } | { ok: false; error: string } {
  const url = input.photoUrl?.trim() ?? "";
  if (!url && !input.hasWorkout) return { ok: false, error: "사진을 먼저 올려주세요." };
  if (url && !/^https?:\/\//.test(url))
    return { ok: false, error: "사진 주소가 올바르지 않습니다." };
  if ((input.caption ?? "").length > MAX_CAPTION)
    return { ok: false, error: `한마디는 ${MAX_CAPTION}자까지 쓸 수 있어요.` };
  return { ok: true };
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

/**
 * 글 쓰기 속도 한도 — DB 트리거(community_rate_guard: 10분에 5개)와 같은 값.
 * 운동 기록 카드 글은 서비스 롤로 저장해 트리거를 건너뛰므로 서버 코드가 이 값으로 먼저 확인한다.
 */
export const POST_RATE_LIMIT = 5;
export const POST_RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * 인증 사진 공개 주소 → 저장소 경로("<작성자 id>/<파일>"). 글을 지울 때 파일도 지우려고.
 * 🔴 작성자 폴더 밖 경로는 돌려주지 않는다 — 엉뚱한 파일을 지우지 않게.
 */
export function communityPhotoPath(url: string | null | undefined, ownerId: string | null | undefined): string | null {
  if (!url || !ownerId) return null;
  const marker = "/community-photos/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  if (!path.startsWith(`${ownerId}/`) || path.includes("..")) return null;
  return path;
}

/**
 * 질문 글(커뮤니티 3단계) — 사진 없이 제목 + 본문. DB 제약(community_posts_title_check·caption_check)과 같은 한도.
 */
export const MAX_QUESTION_TITLE = 60;
export const MAX_QUESTION_BODY = 1000;

export function validateQuestionInput(input: {
  title: string;
  body: string;
}): { ok: true; title: string; body: string | null } | { ok: false; error: string } {
  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (!title) return { ok: false, error: "질문 제목을 써 주세요." };
  if (title.length > MAX_QUESTION_TITLE)
    return { ok: false, error: `제목은 ${MAX_QUESTION_TITLE}자까지 쓸 수 있어요.` };
  if (body.length > MAX_QUESTION_BODY)
    return { ok: false, error: `본문은 ${MAX_QUESTION_BODY}자까지 쓸 수 있어요.` };
  return { ok: true, title, body: body || null };
}

/** 글 종류별 본문 한도 — 수정 화면·수정 액션이 같이 쓴다. */
export function captionLimit(postType: "photo" | "question"): number {
  return postType === "question" ? MAX_QUESTION_BODY : MAX_CAPTION;
}

/** 질문 운동 태그(커뮤니티 4-2) — 앞뒤 공백·'#' 을 떼고 40자까지. 비면 null(DB 제약과 같은 한도). */
export function normalizeQuestionTag(tag: string | null | undefined): string | null {
  const t = (tag ?? "").trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").slice(0, 40);
  return t || null;
}

/**
 * 댓글 목록 → 화면 순서(커뮤니티 4-2). 답글은 부모 바로 아래(오래된 순), 부모가 이 페이지에 없으면
 * 그냥 제자리에(오래된 댓글을 더 불러오면 부모 아래로 간다).
 */
export function threadComments<T extends { id: string; parentId: string | null }>(list: readonly T[]): { item: T; reply: boolean }[] {
  const ids = new Set(list.map((c) => c.id));
  const repliesOf = new Map<string, T[]>();
  for (const c of list) {
    if (c.parentId && ids.has(c.parentId)) {
      const arr = repliesOf.get(c.parentId) ?? [];
      arr.push(c);
      repliesOf.set(c.parentId, arr);
    }
  }
  const out: { item: T; reply: boolean }[] = [];
  for (const c of list) {
    if (c.parentId && ids.has(c.parentId)) continue;
    out.push({ item: c, reply: !!c.parentId });
    for (const r of repliesOf.get(c.id) ?? []) out.push({ item: r, reply: true });
  }
  return out;
}
