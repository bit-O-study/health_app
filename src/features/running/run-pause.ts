/**
 * 런닝 일시정지·신호 — 순수 로직(2026-09-28 런닝 모드 고도화 2단계).
 *
 * 시간 계산 방식: 시작 시각을 '가상 시작'으로 들고 다니다가, 다시 시작할 때 멈춰 있던 만큼
 * 앞으로 민다. 그러면 (지금 − 가상 시작)이 곧 **달린 시간**이고, 서버에는 끝 − 달린 시간을
 * 시작으로 보내 저장되는 시간에서도 멈춘 시간이 빠진다(이어하기 체크포인트와 같은 방식).
 */

/** 이만큼 이동 신호가 없으면 자동 일시정지. */
export const AUTO_PAUSE_MS = 10_000;

export type PauseKind = "manual" | "auto";

/** 지금까지 달린 시간(ms) — 멈춰 있으면 멈춘 순간에서 고정. */
export function activeElapsedMs(virtualStart: number, now: number, pausedAt: number | null): number {
  return Math.max(0, (pausedAt ?? now) - virtualStart);
}

/** 다시 시작할 때의 새 가상 시작 — 멈춰 있던 시간만큼 앞으로. */
export function resumedStart(virtualStart: number, pausedAt: number, now: number): number {
  return virtualStart + Math.max(0, now - pausedAt);
}

/** 자동 일시정지 여부 — 이미 멈췄거나 아직 한 번도 안 움직였으면 아니다. */
export function shouldAutoPause(now: number, lastMoveAt: number, pausedAt: number | null, hasMoved: boolean): boolean {
  return pausedAt === null && hasMoved && now - lastMoveAt >= AUTO_PAUSE_MS;
}

/**
 * GPS 신호 막대(0–3). 마지막 위치의 정확도와 받은 지 얼마나 됐는지로.
 * 3: ±10m 이내 · 2: ±25m · 1: 그보다 나쁨 · 0: 5초 넘게 위치 없음(또는 한 번도 없음).
 */
export function gpsSignalLevel(accuracyM: number | null, ageMs: number | null): 0 | 1 | 2 | 3 {
  if (ageMs === null || ageMs > 5_000) return 0;
  if (accuracyM !== null && accuracyM <= 10) return 3;
  if (accuracyM !== null && accuracyM <= 25) return 2;
  return 1;
}
