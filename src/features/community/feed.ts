/**
 * 통합 커뮤니티 피드 — 순수 로직(공개범위·탭·필터). 서버/DB 의존 없음(테스트 가능).
 * 사진 인증(photo) 글과 운동 티칭 영상(teaching) 글을 한 피드에서 다룬다.
 */

import { normalizeTag } from "@/features/teaching/teaching";

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

export function visibilityLabel(v: Visibility): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? "전체 공개";
}

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

/** 필터 상태. scope=전체/티칭만, hideTeaching=티칭 숨김, tags=선택 태그(빈 배열=전체 태그). */
export type FeedFilter = {
  scope: "all" | "teaching";
  hideTeaching: boolean;
  tags: string[];
};

export const EMPTY_FILTER: FeedFilter = { scope: "all", hideTeaching: false, tags: [] };

type MinItem = {
  kind: FeedKind;
  visibility: Visibility;
  groupId: string | null;
  exerciseTag: string | null;
};

/**
 * 상단 탭 분리 — 전체 탭: 그룹전용(group) 아닌 글(전체·그룹제외). 그룹 탭: 선택 그룹의 그룹전용 글.
 */
export function forTab<T extends MinItem>(
  items: T[],
  tab: "all" | "group",
  selectedGroupIds: string[],
): T[] {
  if (tab === "all") return items.filter((it) => it.visibility !== "group");
  const set = new Set(selectedGroupIds);
  return items.filter(
    (it) => it.visibility === "group" && it.groupId !== null && set.has(it.groupId),
  );
}

/** 커뮤니티 게시판 탭 — 오운완(사진) / 그룹(사진) / 운동(티칭) / 내 글. */
export type BoardTab = "workout" | "teaching" | "routine" | "mine";

export const BOARD_TABS: { value: BoardTab; label: string }[] = [
  { value: "workout", label: "오운완" },
  { value: "teaching", label: "운동" },
  // 루틴 소개(하루치 루틴 공유) — 통합 피드가 아니라 routine_shares 를 따로 그린다.
  { value: "routine", label: "루틴" },
  { value: "mine", label: "내 글" },
];

type BoardItem = MinItem & { isMine: boolean };

/**
 * 게시판 탭별 분류(+운동 탭 검색). 순수 로직.
 * - workout(오운완): 사진 인증 전부(공개 + 그룹전용도 포함 — 그룹전용은 그룹명 태그로 구분).
 *   그룹 게시판을 없애고, 그룹원 공개 글도 오운완에 섞어 보여준다(가시성은 서버 RLS가 필터).
 * - teaching(운동): 티칭 영상 전부(그룹전용 포함). search 있으면 운동 태그 부분일치.
 * - mine(내 글): 내가 쓴 모든 글(사진+티칭).
 *
 * (selectedGroupIds 인자는 옛 그룹 탭 호환용 — 지금은 무시.)
 */
export function forBoard<T extends BoardItem>(
  items: T[],
  tab: BoardTab,
  _selectedGroupIds: string[] = [],
  search = "",
): T[] {
  switch (tab) {
    case "workout":
      return items.filter((it) => it.kind === "photo");
    case "teaching": {
      const q = normalizeTag(search).toLowerCase();
      return items.filter((it) => {
        if (it.kind !== "teaching") return false;
        if (!q) return true;
        return it.exerciseTag
          ? normalizeTag(it.exerciseTag).toLowerCase().includes(q)
          : false;
      });
    }
    // 루틴 소개는 통합 피드(사진·티칭)에 안 들어간다 — 별도 컴포넌트가 그린다.
    case "routine":
      return [];
    case "mine":
      return items.filter((it) => it.isMine);
  }
}

/**
 * 종류/태그 필터 적용.
 * - scope "teaching" → 티칭 글만.
 * - hideTeaching → 티칭 글 제거.
 * - tags 비어있지 않으면 → 해당 태그의 티칭 글만(사진글은 제외).
 */
export function applyFeedFilter<T extends MinItem>(items: T[], f: FeedFilter): T[] {
  const wantTags = f.tags.map(normalizeTag).filter(Boolean);
  const tagSet = new Set(wantTags);
  return items.filter((it) => {
    if (f.hideTeaching && it.kind === "teaching") return false;
    if (f.scope === "teaching" && it.kind !== "teaching") return false;
    if (tagSet.size > 0) {
      if (it.kind !== "teaching" || !it.exerciseTag) return false;
      if (!tagSet.has(normalizeTag(it.exerciseTag))) return false;
    }
    return true;
  });
}

/** 피드에 등장한 티칭 태그 목록(빈도순, 칩용). */
export function feedTags<T extends { kind: FeedKind; exerciseTag: string | null }>(
  items: T[],
  limit = 20,
): string[] {
  const count = new Map<string, number>();
  for (const it of items) {
    if (it.kind !== "teaching" || !it.exerciseTag) continue;
    const t = normalizeTag(it.exerciseTag);
    if (!t) continue;
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

/** 두 종류 글을 작성시각 내림차순으로 병합. */
export function mergeByCreatedAt<T extends { createdAt: string }>(...lists: T[][]): T[] {
  return lists.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
