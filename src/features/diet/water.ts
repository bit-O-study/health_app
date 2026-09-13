/**
 * 수분 섭취 — 하루 목표량과 한 번에 담는 양.
 *
 * server-only 의존성 없는 순수 함수(서버 액션·화면·테스트 공용).
 * 저장은 하루 한 행의 **누적 ml** 이다 — "몇 시에 얼마" 까지는 아무도 안 본다.
 */

/** 한 번에 담는 양(ml) — 종이컵 · 텀블러/캔 · 생수병. */
export const WATER_CUPS = [
  { ml: 200, label: "컵" },
  { ml: 350, label: "텀블러" },
  { ml: 500, label: "생수" },
] as const;

/** 하루 최대 기록량(ml). 이 위는 오타이거나 물중독 영역이라 막는다. */
export const WATER_MAX_ML = 10000;

/**
 * 하루 목표 수분(ml) — 체중 1kg 당 33ml, 100ml 단위 반올림.
 *
 * 활동량·기온까지 반영하는 정밀한 공식이 있지만, 그건 입력을 더 받아야 하고
 * 맞춰도 사람이 그만큼 정확히 마시지 않는다. 흔히 쓰는 기준 하나로 둔다.
 * 체중을 모르면(온보딩 전) 성인 일반 권장인 2,000ml.
 */
export function dailyWaterTargetMl(weightKg: number | null | undefined): number {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) {
    return 2000;
  }
  const raw = weightKg * 33;
  const rounded = Math.round(raw / 100) * 100;
  return Math.min(4000, Math.max(1500, rounded));
}

/** 저장 전 정규화 — 0 아래로 안 내려가고 하루 최대를 안 넘는다. */
export function clampWaterMl(ml: number): number {
  if (!Number.isFinite(ml)) return 0;
  return Math.min(WATER_MAX_ML, Math.max(0, Math.round(ml)));
}

/** 목표 대비 달성률(%). 100 을 넘어도 그대로 돌려준다 — 화면에서 자른다. */
export function waterPercent(ml: number, targetMl: number): number {
  if (targetMl <= 0) return 0;
  return Math.round((ml / targetMl) * 100);
}

/** "1.2L" · "800ml" — L 은 소수 한 자리, 1L 미만은 ml 그대로. */
export function formatWater(ml: number): string {
  if (ml < 1000) return `${ml}ml`;
  const l = Math.round(ml / 100) / 10;
  return `${l}L`;
}
