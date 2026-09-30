/**
 * 통합 커뮤니티 피드 — 순수 로직(공개범위·탭·필터). 서버/DB 의존 없음(테스트 가능).
 * 사진 인증(photo) 글과 운동 티칭 영상(teaching) 글을 한 피드에서 다룬다.
 */

/** 글 종류. */
export type FeedKind = "photo" | "teaching";

/** 공개범위: 그룹만 / 전체 / 그룹 제외 전체. */
export type Visibility = "group" | "public" | "public_except_group";

export const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  /** 기준 그룹이 필요한가(그룹만·그룹제외). */
  needsGroup: boolean;
}[] = [
  { value: "public", label: "전체 공개", needsGroup: false },
  { value: "group", label: "그룹만 공개", needsGroup: true },
  { value: "public_except_group", label: "그룹 제외 공개", needsGroup: true },
];

/**
 * 공개범위 + 기준 그룹 정합성 검증/정규화(작성 액션 공용).
 * - 미지정/알수없음 → public.
 * - public → 그룹 무시(null).
 * - group·public_except_group → 기준 그룹 필수.
 */
export function resolveVisibility(
  visibility: Visibility | undefined,
  groupId: string | null,
): { ok: true; visibility: Visibility; groupId: string | null } | { ok: false; error: string } {
  const v: Visibility =
    visibility === "group" || visibility === "public_except_group" ? visibility : "public";
  if (v === "public") return { ok: true, visibility: "public", groupId: null };
  if (!groupId) {
    return {
      ok: false,
      error:
        v === "group"
          ? "그룹만 공개는 올릴 그룹을 골라주세요."
          : "그룹 제외 공개는 기준 그룹을 골라주세요.",
    };
  }
  return { ok: true, visibility: v, groupId };
}

/** 커뮤니티 게시판 탭 — 오운완(사진) / 그룹(사진) / 운동(티칭) / 내 글. */
export type BoardTab = "workout" | "teaching" | "routine" | "mine" | "popular";

export const BOARD_TABS: { value: BoardTab; label: string }[] = [
  { value: "workout", label: "오운완" },
  { value: "popular", label: "인기" },
  { value: "teaching", label: "운동" },
  // 루틴 소개(하루치 루틴 공유) — 통합 피드가 아니라 routine_shares 를 따로 그린다.
  { value: "routine", label: "루틴" },
  { value: "mine", label: "내 글" },
];

/** 두 종류 글을 작성시각 내림차순으로 병합. */
export function mergeByCreatedAt<T extends { createdAt: string }>(...lists: T[][]): T[] {
  return lists.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
