/**
 * 그룹탭 전역 모드 레지스트리 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 * DB 접근이 필요한 읽기 함수는 `group-mode.server.ts` 에 있다.
 *
 * 관리자(/admin/settings)가 앱 전체의 그룹탭을 두 기능 중 하나로 전환한다:
 *   - "gym"   → 기존 공유펫 헬스장(랭킹/챌린지/응원)  ← 기본
 *   - "proof" → 오늘 운동 인증 움짤(3초 무음영상) 피드
 */
export const GROUP_MODES = ["gym", "proof"] as const;

export type GroupMode = (typeof GROUP_MODES)[number];

/** app_settings 저장 키. */
export const GROUP_MODE_KEY = "group.mode";

/** 기본 모드 — 미설정이면 기존 헬스장. */
export const DEFAULT_GROUP_MODE: GroupMode = "gym";

export const GROUP_MODE_LABEL: Record<GroupMode, string> = {
  gym: "헬스장(공유펫·랭킹)",
  proof: "오늘 운동 인증(움짤)",
};

/**
 * 초대 카드(카카오톡 공유 · OG 미리보기)에 들어가는 한 줄 설명 — 모드별로 다르다.
 * 인증 모드인데 "랭킹대전"이라고 초대하면, 들어와서 보는 화면과 말이 안 맞는다.
 */
export const GROUP_INVITE_DESCRIPTION: Record<GroupMode, string> = {
  gym: "운동 랭킹대전에 함께 참여해요 💪 눌러서 그룹에 가입하세요.",
  proof: "오늘 운동 인증을 서로 남겨요 💪 눌러서 그룹에 가입하세요.",
};

export const GROUP_MODE_HINT: Record<GroupMode, string> = {
  gym: "기존 그룹 헬스장 — 공유펫·주간 랭킹·챌린지·응원",
  proof: "그룹원이 오늘 운동 인증을 3초 움짤로 올리는 피드",
};

export function isGroupMode(v: unknown): v is GroupMode {
  return v === "gym" || v === "proof";
}

/**
 * 그룹탭 정식 경로 — 여기로 보내면 현재 모드에 맞는 화면(헬스장/인증 피드)이 그려진다.
 * 그룹 진입은 항상 이 경로를 쓴다(딥링크 `/groups/[id]` 는 헬스장 전용).
 */
export function groupTabHref(groupId: string): string {
  return `/groups?g=${encodeURIComponent(groupId)}`;
}

/**
 * `/groups/[id]` 는 **헬스장(공유펫·랭킹) 전용** 화면이다.
 * 인증 모드에서는 열리면 안 되므로 보낼 곳(그룹탭 정식 경로)을 돌려주고,
 * 헬스장 모드면 null(그대로 렌더).
 *
 * 카카오톡 초대 링크로 들어와 가입하면 `/groups/[id]` 로 이동하는데,
 * 이 가드가 없으면 인증 모드인데도 '캐릭터 키우기'가 떴다.
 */
export function groupDetailRedirect(
  mode: GroupMode,
  groupId: string,
): string | null {
  return mode === "proof" ? groupTabHref(groupId) : null;
}

/**
 * app_settings['group.mode'] 값 → 모드. 기본 'gym'.
 * (jsonb 문자열이든 원시 문자열이든 안전하게 해석; 그 외/미설정 = 기본.)
 */
export function parseGroupMode(value: unknown): GroupMode {
  return value === "proof" ? "proof" : DEFAULT_GROUP_MODE;
}