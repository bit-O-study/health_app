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

/* ── 기록 단위 보조(2026-09-25) ───────────────────────────────────────── */

/** 직접 입력으로 받을 수 있는 한 번 양(ml). */
export const WATER_ONE_MIN_ML = 1;
export const WATER_ONE_MAX_ML = 3000;

/** 직접 입력 값 검증 — 화면과 서버가 같은 기준을 쓴다. */
export function isValidOneShotMl(ml: number): boolean {
  return (
    Number.isFinite(ml) &&
    Number.isInteger(ml) &&
    ml >= WATER_ONE_MIN_ML &&
    ml <= WATER_ONE_MAX_ML
  );
}

/**
 * "방금" · "20분 전" · "3시간 전" — 마지막으로 마신 지 얼마나 됐는지.
 * 물은 몰아 마시는 것보다 나눠 마시는 게 중요해서, 총량보다 이 문장이 더 도움이 된다.
 */
export function sinceLabel(atIso: string, nowMs = Date.now()): string {
  const t = Date.parse(atIso);
  if (!Number.isFinite(t)) return "";
  const min = Math.floor((nowMs - t) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

/** "오후 3:20" — 기록 목록의 시각 표시(한국 시간). */
export function timeLabel(atIso: string): string {
  const t = new Date(atIso);
  if (Number.isNaN(t.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
  }).format(t);
}

/**
 * 남은 양과 컵 수 — "1.1L 남음 · 컵 6잔" 처럼 **무엇을 더 하면 되는지**로 바꿔 준다.
 * 목표를 채웠으면 남은 양은 0.
 */
export function remainingBy(
  ml: number,
  targetMl: number,
  cupMl: number,
): { ml: number; cups: number } {
  const left = Math.max(0, targetMl - ml);
  const cups = cupMl > 0 ? Math.ceil(left / cupMl) : 0;
  return { ml: left, cups };
}
