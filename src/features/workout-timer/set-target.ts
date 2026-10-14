/**
 * 운동모드 — 지금 세트의 무게·횟수(2026-10-14) · 순수 로직.
 *
 * 피라미드·드롭처럼 세트마다 무게와 횟수가 다른 운동도, 운동모드는 예전엔 칸 하나(무게·횟수)만
 * 들고 있어서 **모든 세트가 같은 횟수**로 보이고 그대로 기록됐다("피라미드인데 10개 고정").
 * 여기서 '몇 번째 세트의 값'을 한곳에서 정한다 — 화면 · 음성 · 휴식 안내 · 기록이 같은 값을 쓴다.
 */
import type { SetDetail } from "@/features/routine/set-details";

export type SetValue = { w: number | null; reps: number };

/**
 * i 번째(0부터) 세트의 값.
 * - 세트별 계획이 없으면 칸의 값(`flat`) 그대로.
 * - 있으면 그 세트의 계획. 운동모드에서 그 세트를 고쳤으면(`bySet`) 고친 값.
 * - 세트를 계획보다 늘렸으면 마지막 세트의 값을 이어 쓴다.
 */
export function setValueAt(
  i: number,
  plan: readonly SetDetail[] | null | undefined,
  flat: SetValue,
  bySet?: Record<string, SetValue> | null,
): SetValue {
  if (!plan || plan.length === 0) return flat;
  const mine = bySet?.[String(i)];
  if (mine) return mine;
  const p = plan[Math.min(Math.max(0, i), plan.length - 1)];
  return { w: p.weightKg, reps: p.reps };
}

/** 끝낸 운동을 기록할 세트별 값. 세트별 계획이 없는 운동은 null(균일 세트로 기록). */
export function recordedSetDetails(
  sets: number,
  plan: readonly SetDetail[] | null | undefined,
  flat: SetValue,
  bySet?: Record<string, SetValue> | null,
): SetDetail[] | null {
  if (!plan || plan.length === 0 || !(sets > 0)) return null;
  return Array.from({ length: Math.min(20, Math.floor(sets)) }, (_, i) => {
    const v = setValueAt(i, plan, flat, bySet);
    return { weightKg: v.w, reps: Math.min(100, Math.max(1, Math.round(v.reps))) };
  });
}

/** 값을 끌어서 바꾸기 시작하는 거리(px) — 이보다 덜 움직인 건 스친 것으로 본다. */
export const SCRUB_DEAD_PX = 16;
/** 한 단위가 바뀌는 거리(px). */
export const SCRUB_PX_PER_STEP = 18;

/**
 * 손가락이 움직인 만큼 몇 단위를 바꿀지.
 * 🔴 예전엔 12px 마다 한 단위였고 시작 여유가 없어서, 화면을 넘기다 스치기만 해도 무게가
 *    몇 단위씩 올랐다(45kg → 80kg). 그 값이 그대로 기록돼 다음 운동의 '지난번 값'이 됐다.
 * @returns "wait" 아직 끌기가 아니다 · "cancel" 위아래로 움직였다(끌기가 아니다) · 숫자 = 바꿀 단위
 */
export function scrubSteps(dx: number, dy: number, engaged: boolean): number | "wait" | "cancel" {
  if (!engaged) {
    if (Math.abs(dy) > SCRUB_DEAD_PX && Math.abs(dy) >= Math.abs(dx)) return "cancel";
    if (Math.abs(dx) < SCRUB_DEAD_PX) return "wait";
    return 0;
  }
  return Math.round(dx / SCRUB_PX_PER_STEP);
}
