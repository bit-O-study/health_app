/**
 * 시간(초) 기반 운동 — 횟수(reps)가 아니라 '버티는 시간'으로 하는 정적 홀드 운동.
 * 운동모드에서 초 타이머를 보여주고, 완료를 누르면 세트가 완료된다.
 *
 * 순수 모듈(server-only 없음) — 클라이언트/단위테스트 공용.
 */

/** 시간(초)로 재는 운동 id 집합. 새 홀드 운동을 추가하면 여기에 등록. */
export const TIMED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  "plank",
  "side-plank",
  "hollow-hold",
]);

/** 이 운동이 시간(초) 기반(홀드)인가? */
export function isTimedExercise(exerciseId: string | null | undefined): boolean {
  return !!exerciseId && TIMED_EXERCISE_IDS.has(exerciseId);
}

/** 홀드 목표 시간의 기본값(초). plan 값이 비정상이면 이걸 쓴다. */
export const DEFAULT_HOLD_SEC = 30;

/**
 * 저장된 plan 값에서 홀드 목표 시간(초)을 뽑는다. 시간 기반 운동은 reps 칸을 '초'로 쓴다
 * (별도 컬럼 없이 재사용). 5~600초 범위로 보정하고, 벗어나면 기본값.
 */
export function holdSecondsFromReps(reps: number | null | undefined): number {
  const n = typeof reps === "number" && Number.isFinite(reps) ? Math.round(reps) : NaN;
  if (!Number.isFinite(n) || n < 5 || n > 600) return DEFAULT_HOLD_SEC;
  return n;
}

/** 초 → "m:ss" (0 이상). */
export function formatHold(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
