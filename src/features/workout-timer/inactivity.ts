/**
 * 운동 무활동 감지 임계값과 순수 판정 함수.
 *
 * - 운동 타이머가 도는 중 30분 동안 '완료/스킵'이 한 번도 없으면 종료 여부를 묻는다.
 * - 알림에 10분 동안 응답이 없으면 타이머만 자동 종료(휴식 처리는 하지 않음).
 *
 * 시간 값을 인자로 주입받아 테스트가 쉽도록 순수 함수로 둔다.
 */

/** 무활동으로 보는 시간 — 마지막 완료 이후 30분. */
export const INACTIVITY_LIMIT_MS = 30 * 60_000;

/** 알림 무응답으로 보는 시간 — 알림 띄운 뒤 10분. */
export const NO_RESPONSE_LIMIT_MS = 10 * 60_000;

/** 마지막 활동(완료/시작/재개) 이후 limit 이상 지났으면 무활동. */
export function isInactive(
  lastActivityMs: number,
  nowMs: number,
  limitMs: number = INACTIVITY_LIMIT_MS,
): boolean {
  return nowMs - lastActivityMs >= limitMs;
}

/** 알림 띄운 시각 이후 limit 이상 응답이 없으면 무응답(자동 종료 대상). */
export function noResponseExpired(
  promptedAtMs: number,
  nowMs: number,
  limitMs: number = NO_RESPONSE_LIMIT_MS,
): boolean {
  return nowMs - promptedAtMs >= limitMs;
}

/**
 * 지금 종료 알림을 띄워야 하는가.
 * - 타이머가 실행 중(running)이고
 * - 아직 알림이 떠 있지 않고(alreadyPrompted=false)
 * - 남은 운동이 있고(remainingCount>0)
 * - 마지막 활동 후 무활동 임계를 넘겼을 때.
 */
export function shouldPrompt(opts: {
  running: boolean;
  alreadyPrompted: boolean;
  remainingCount: number;
  lastActivityMs: number;
  nowMs: number;
  limitMs?: number;
}): boolean {
  if (!opts.running || opts.alreadyPrompted || opts.remainingCount <= 0) {
    return false;
  }
  return isInactive(opts.lastActivityMs, opts.nowMs, opts.limitMs);
}
