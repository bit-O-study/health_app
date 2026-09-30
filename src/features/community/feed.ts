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

/**
 * 커뮤니티 게시판 보기. 위 탭 줄에는 큰 탭만(피드·질문·운동 영상·루틴·내 글) 보이고,
 * 인기·답변 기다리는 질문·저장한 글은 각 탭 안의 작은 선택지다(커뮤니티 3단계).
 */
export type BoardTab =
  | "workout"
  | "popular"
  | "question"
  | "question_open"
  | "teaching"
  | "routine"
  | "mine"
  | "commented"
  | "saved";

export const BOARD_TABS: { value: BoardTab; label: string }[] = [
  { value: "workout", label: "피드" },
  { value: "popular", label: "인기" },
  { value: "question", label: "질문" },
  { value: "question_open", label: "답변 기다리는" },
  { value: "teaching", label: "운동 영상" },
  // 루틴 소개(하루치 루틴 공유) — 통합 피드가 아니라 routine_shares 를 따로 그린다.
  { value: "routine", label: "루틴" },
  { value: "mine", label: "내 글" },
  { value: "commented", label: "댓글 단 글" },
  { value: "saved", label: "저장한 글" },
];

/** 이 보기가 속한 큰 탭(탭 줄의 밑줄 위치). */
export function mainTabOf(tab: BoardTab): BoardTab {
  if (tab === "popular") return "workout";
  if (tab === "question_open") return "question";
  if (tab === "saved" || tab === "commented") return "mine";
  return tab;
}

/** 탭 줄에 보이는 큰 탭들. */
export const MAIN_TABS = BOARD_TABS.filter((t) => mainTabOf(t.value) === t.value);

/** 보기 → 주소(뒤로 가기·새로고침에도 같은 보기). 검색어는 q. */
export function boardHref(tab: BoardTab, query = ""): string {
  const path: Record<BoardTab, string> = {
    workout: "/community",
    popular: "/community",
    question: "/community/questions",
    question_open: "/community/questions",
    teaching: "/community/teaching",
    routine: "/community/routines",
    mine: "/community/mine",
    commented: "/community/mine",
    saved: "/community/saved",
  };
  const params = new URLSearchParams();
  if (tab === "popular") params.set("view", "popular");
  if (tab === "question_open") params.set("open", "1");
  if (tab === "commented") params.set("view", "commented");
  if (query.trim()) params.set("q", query.trim());
  return path[tab] + (params.size ? `?${params}` : "");
}

/** 두 종류 글을 작성시각 내림차순으로 병합. */
export function mergeByCreatedAt<T extends { createdAt: string }>(...lists: T[][]): T[] {
  return lists.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
