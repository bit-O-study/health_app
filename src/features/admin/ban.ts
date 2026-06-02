/**
 * 회원 정지/차단 상태 판정 — 순수 함수(서버·미들웨어·UI 공용, server-only 의존성 없음).
 *
 * - banned_at 이 있으면 영구정지(banned) — 수동 해제 전까지.
 * - suspended_until 이 미래면 기간정지(suspended) — 그 시각 지나면 자동으로 active.
 * - 둘 다 아니면 active.
 */
export type BanState = "active" | "suspended" | "banned";

export type BanFields = {
  suspendedUntil: string | null;
  bannedAt: string | null;
};

export function banStateOf(p: BanFields, now: Date = new Date()): BanState {
  if (p.bannedAt) return "banned";
  if (p.suspendedUntil && new Date(p.suspendedUntil).getTime() > now.getTime()) {
    return "suspended";
  }
  return "active";
}

/** 앱 접근이 차단돼야 하는지(정지 또는 영구정지). */
export function isBlocked(p: BanFields, now: Date = new Date()): boolean {
  return banStateOf(p, now) !== "active";
}

export const BAN_STATE_LABEL: Record<BanState, string> = {
  active: "정상",
  suspended: "정지",
  banned: "영구정지",
};
