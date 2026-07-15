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

export const GROUP_MODE_HINT: Record<GroupMode, string> = {
  gym: "기존 그룹 헬스장 — 공유펫·주간 랭킹·챌린지·응원",
  proof: "그룹원이 오늘 운동 인증을 3초 움짤로 올리는 피드",
};

export function isGroupMode(v: unknown): v is GroupMode {
  return v === "gym" || v === "proof";
}

/**
 * app_settings['group.mode'] 값 → 모드. 기본 'gym'.
 * (jsonb 문자열이든 원시 문자열이든 안전하게 해석; 그 외/미설정 = 기본.)
 */
export function parseGroupMode(value: unknown): GroupMode {
  return value === "proof" ? "proof" : DEFAULT_GROUP_MODE;
}