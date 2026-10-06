/**
 * 글쓰기 임시 저장 — 순수 로직(커뮤니티 4-1, 2026-09-30).
 * 쓰던 글(종류·제목·본문·공개 범위)을 이 기기에 남겨, 창을 닫았다 다시 열면 이어 쓰게 한다.
 * 서버에 올리지 않는다. 사진·운동 기록 선택은 남기지 않는다(파일은 저장할 수 없고, 기록은 다시 고르면 된다).
 */

export const DRAFT_KEY = "jimkkun:community-draft";
/** 7일 지난 초안은 버린다. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ComposeDraft = {
  mode: "photo" | "question";
  title: string;
  /** 질문 운동 태그(커뮤니티 4-2). */
  tag?: string;
  caption: string;
  visibility: "public" | "group" | "public_except_group";
  groupId: string | null;
  savedAt: number;
};

/** 남길 만한 내용이 있나(빈 초안은 저장하지 않는다). */
export function hasDraftContent(d: Pick<ComposeDraft, "title" | "caption">): boolean {
  return d.title.trim().length > 0 || d.caption.trim().length > 0;
}

/** 저장된 문자열 → 초안. 깨졌거나·비었거나·오래됐으면 null. */
export function parseDraft(raw: string | null, now: number): ComposeDraft | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const mode = o.mode === "question" ? "question" : o.mode === "photo" ? "photo" : null;
  const visibility =
    o.visibility === "group" || o.visibility === "public_except_group" || o.visibility === "public" ? o.visibility : null;
  if (!mode || !visibility || typeof o.savedAt !== "number" || !Number.isFinite(o.savedAt)) return null;
  if (now - o.savedAt > DRAFT_TTL_MS || o.savedAt > now + 60_000) return null;
  const draft: ComposeDraft = {
    mode,
    title: typeof o.title === "string" ? o.title.slice(0, 60) : "",
    tag: typeof o.tag === "string" ? o.tag.slice(0, 40) : "",
    caption: typeof o.caption === "string" ? o.caption.slice(0, 1000) : "",
    visibility,
    groupId: typeof o.groupId === "string" ? o.groupId : null,
    savedAt: o.savedAt,
  };
  return hasDraftContent(draft) ? draft : null;
}
