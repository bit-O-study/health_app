/**
 * 과부하 추천을 **화면에 그대로 실을 수 있는 모양**으로 바꾸는 계층 — 로드맵 2.2.
 *
 * `overload.ts` 는 규칙(판단)만 안다. 여기서 하는 일은 셋뿐이다.
 *  1) 판단을 **직렬화 가능한 값**으로 굳힌다 — 서버 컴포넌트가 클라이언트로 넘길 수 있게.
 *  2) 말머리(`증량`·`디로드`)와 강조 여부처럼 **화면이 매번 다시 정하던 것**을 한곳에 둔다.
 *     예전엔 성장 그래프 안에만 있어서, 다른 화면에 붙이면 같은 판단에 다른 말이 붙는다.
 *  3) 여러 종목을 한 번에 — 운동모드·계획 편집은 종목이 여러 개고, 화면마다 반복문을
 *     다시 쓰면 "어떤 화면은 오늘 목표 횟수를 안 넘긴다" 같은 차이가 조용히 생긴다.
 *
 * 순수 모듈이다(server-only 의존 없음) — 서버에서 만들어 넘기든, 서버 액션으로 받든 같다.
 */

import type { ExperienceLevel } from "@/features/profile/data";
import {
  needsAttention,
  overloadPlan,
  type OverloadAction,
  type OverloadPlan,
} from "@/features/routine/overload";
import type { ProgressRecord } from "@/features/routine/progress";

/** 종류별 말머리 — 무엇을 하라는 건지 한 눈에. */
export const ACTION_LABEL: Record<OverloadAction, string> = {
  increase: "증량",
  "add-reps": "횟수 채우기",
  deload: "디로드",
  rest: "휴식 권장",
  first: "한 번 더",
  bodyweight: "횟수·시간",
  none: "",
};

/** 화면에 그대로 실리는 추천 한 건. 서버 → 클라이언트로 넘어가므로 원시값만 담는다. */
export type OverloadAdvice = {
  exerciseId: string;
  action: OverloadAction;
  /** 말머리(`증량`·`디로드` …). */
  label: string;
  /** 사용자가 바로 손봐야 하는 신호인가(정체·휴식) — 강조색 결정용. */
  attention: boolean;
  suggestedKg: number | null;
  suggestedReps: number | null;
  /** 왜 이 제안인지 한 줄. 숫자만 던지면 따를지 무시할지 판단을 못 한다. */
  reason: string;
};

/**
 * 판단 → 화면값. 기록이 없으면(`none`) **null** — 붙일 말이 없는데 빈 칸을 만들면
 * 화면만 늘어난다.
 */
export function toAdvice(plan: OverloadPlan): OverloadAdvice | null {
  if (plan.action === "none") return null;
  return {
    exerciseId: plan.exerciseId,
    action: plan.action,
    label: ACTION_LABEL[plan.action],
    attention: needsAttention(plan),
    suggestedKg: plan.suggestedKg,
    suggestedReps: plan.suggestedReps,
    reason: plan.reason,
  };
}

/** 제안을 입력란에 그대로 넣을 수 있는가 — 넣을 값이 하나도 없으면 '적용' 버튼을 안 단다. */
export function isApplicable(advice: OverloadAdvice): boolean {
  return advice.suggestedKg !== null || advice.suggestedReps !== null;
}

/** 한 종목에 대한 추천 요청. `targetReps` 는 계획이 시킨 횟수(없으면 처방 기준). */
export type AdviceTarget = {
  exerciseId: string;
  /**
   * 오늘 계획이 시킨 횟수.
   *
   * ⚠ **지난번 실제 값으로 미리 채운 횟수를 여기 넣으면 안 된다.** 그러면 목표가 항상
   * 지난번과 같아져 "목표를 채웠으니 증량" 이 매번 걸린다(스스로를 만족시키는 목표).
   * 넣을 값은 **등록된 계획값**이거나, 없으면 생략해서 처방 기준을 쓴다.
   */
  targetReps?: number | null;
};

/**
 * 여러 종목을 한 번에. 같은 종목이 여러 줄에 있어도 판단은 한 번만 한다(기록이 같으므로).
 *
 * @returns 종목 id → 추천. 기록이 없는 종목은 **키 자체가 없다**.
 */
export function buildAdviceMap(
  records: ProgressRecord[],
  targets: readonly AdviceTarget[],
  experience: ExperienceLevel,
): Record<string, OverloadAdvice> {
  const out: Record<string, OverloadAdvice> = {};
  for (const t of targets) {
    if (!t.exerciseId || out[t.exerciseId]) continue;
    const advice = toAdvice(
      overloadPlan(records, t.exerciseId, experience, t.targetReps ?? undefined),
    );
    if (advice) out[t.exerciseId] = advice;
  }
  return out;
}
