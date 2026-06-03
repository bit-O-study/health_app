/**
 * 휴식 타이머 순수 로직 — 의존성 없는 계산(컴포넌트·테스트 공용).
 * 시간 포맷·기본 휴식 시간·세트 진행 계산 등.
 */

/** 사용자가 따로 설정하지 않았을 때 기본 휴식(초). 기본 1:30. */
export const DEFAULT_REST_SEC = 90;
/** 설정 가능한 휴식 범위(초). */
export const REST_MIN_SEC = 10;
export const REST_MAX_SEC = 600;
/** 빠른 선택 프리셋(초). */
export const REST_PRESETS = [30, 60, 90, 120, 180] as const;

/** localStorage 키 — 사용자 기본 휴식 시간. */
export const REST_DEFAULT_KEY = "rest:defaultSec";

/** 휴식 시간을 허용 범위로 보정. 유효하지 않으면 기본값. */
export function clampRest(sec: number | null | undefined): number {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) {
    return DEFAULT_REST_SEC;
  }
  return Math.min(REST_MAX_SEC, Math.max(REST_MIN_SEC, Math.round(sec)));
}

/** 초 → "m:ss". */
export function formatRest(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** "세트 2/4" 라벨. done 은 0-base 완료 수, total 은 총 세트. */
export function setProgressLabel(done: number, total: number): string {
  const cur = Math.min(done + 1, Math.max(1, total));
  return `세트 ${cur}/${Math.max(1, total)}`;
}

/** 현재 세트가 마지막 세트인지(0-base done 기준). */
export function isLastSet(done: number, total: number): boolean {
  return done >= Math.max(1, total) - 1;
}
