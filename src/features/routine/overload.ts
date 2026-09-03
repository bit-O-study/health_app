/**
 * 규칙 기반 점진적 과부하 추천 — 로드맵 2.2.
 *
 * "다음에 뭘 해야 하나"를 **설명 가능한 규칙**으로만 답한다. AI 도 통계 모형도 아니고,
 * 사용자가 읽고 납득하거나 무시할 수 있는 문장이 나와야 한다. 그래서 모든 판단에
 * `reason`(한국어 근거)이 따라붙고, 무게·횟수는 끝까지 사용자가 정한다.
 *
 * 규칙은 넷뿐이다.
 *  1) **목표 횟수를 채웠으면 증량.** 계획이 5회를 시켰고 5회를 했으면 다음엔 올린다.
 *  2) **못 채웠으면 같은 무게로 횟수부터.** 무게를 또 올리면 자세가 무너진다.
 *  3) **정체하면 볼륨을 줄인다(디로드).** 몇 세션째 최고치가 안 늘면 −10%.
 *  4) **오래 정체하면 쉰다.** 디로드로도 안 풀리면 그 종목은 휴식이 답이다.
 *
 * 판단 근거는 이 앱이 이미 가진 것만 쓴다(완료 기록 스냅샷) — 새 입력을 요구하지 않는다.
 */

import type { ExperienceLevel } from "@/features/profile/data";
import { loadClassOf } from "@/features/routine/exercise-load";
import { targetReps } from "@/features/routine/prescription";
import {
  exerciseHistory,
  weightStepKg,
  type ExerciseSession,
  type ProgressRecord,
} from "@/features/routine/progress";
import { isTimedExercise } from "@/features/routine/timed-exercises";

/** 최고치가 이 횟수만큼 연속으로 안 늘면 정체로 본다. */
export const STALL_SESSIONS = 3;
/** 디로드로도 안 풀리고 이만큼 이어지면 그 종목은 쉬는 게 낫다. */
export const REST_SESSIONS = 5;
/** 디로드 비율 — 한 주 가볍게 가고 다시 올라오는 폭. */
export const DELOAD_RATIO = 0.9;

export type OverloadAction =
  /** 목표를 채웠다 — 무게를 한 단계 올린다. */
  | "increase"
  /** 아직 목표 횟수에 못 미친다 — 같은 무게로 횟수를 채운다. */
  | "add-reps"
  /** 정체 — 무게를 낮춰 볼륨을 줄이고 다시 올라온다. */
  | "deload"
  /** 오래 정체 — 그 종목을 잠시 쉰다. */
  | "rest"
  /** 기록이 하나뿐 — 같은 무게로 한 번 더 해보고 판단한다. */
  | "first"
  /** 맨몸·시간 종목 — 무게가 아니라 횟수·시간으로 올린다. */
  | "bodyweight"
  /** 기록이 없다. */
  | "none";

export type OverloadPlan = {
  exerciseId: string;
  action: OverloadAction;
  /** 다음에 들 무게(kg). 무게로 올리는 종목이 아니면 null. */
  suggestedKg: number | null;
  /** 다음에 채울 횟수. */
  suggestedReps: number | null;
  /** 이 사람이 이 종목에서 채워야 하는 목표 횟수. */
  targetReps: number;
  /** 최고치가 안 늘어난 연속 세션 수(0 = 지난번에 늘었다). */
  stalledSessions: number;
  /** 화면에 그대로 보여줄 근거 한 줄. */
  reason: string;
};

/** 증량 단위의 배수로 맞춘다 — 2.5kg 단위 원판에 1.7kg 같은 값을 제안하면 못 든다. */
function roundToStep(kg: number, step: number): number {
  return Math.max(step, Math.round(kg / step) * step);
}

/**
 * 최고 추정 1RM 이 갱신되지 않고 이어진 세션 수.
 * 최신 세션이 그때까지의 최고치를 넘겼으면 0.
 */
export function stalledSessionCount(sessions: readonly ExerciseSession[]): number {
  if (sessions.length < 2) return 0;
  // sessions 는 최신순. 뒤(과거)에서부터 최고치를 쌓아 올리며 언제 마지막으로 늘었는지 본다.
  const oldestFirst = [...sessions].reverse();
  let best = 0;
  let lastImprovedIndex = -1;
  oldestFirst.forEach((s, i) => {
    if (s.oneRm > best) {
      best = s.oneRm;
      lastImprovedIndex = i;
    }
  });
  if (lastImprovedIndex < 0) return 0;
  return oldestFirst.length - 1 - lastImprovedIndex;
}

/**
 * 다음 세션 추천. 기록이 없으면 `none`.
 *
 * @param todayTargetReps 목표 횟수를 밖에서 정하고 싶을 때(계획값 등). 없으면 처방 기준.
 */
export function overloadPlan(
  records: ProgressRecord[],
  exerciseId: string,
  experience: ExperienceLevel,
  todayTargetReps?: number,
): OverloadPlan {
  const target =
    todayTargetReps && todayTargetReps > 0
      ? Math.round(todayTargetReps)
      : targetReps(exerciseId, experience);
  const sessions = exerciseHistory(records, exerciseId);
  const base = {
    exerciseId,
    targetReps: target,
    stalledSessions: 0,
    suggestedKg: null as number | null,
    suggestedReps: null as number | null,
  };

  const last = sessions[0];
  if (!last) {
    return { ...base, action: "none", reason: "아직 이 운동 기록이 없어요." };
  }

  // 맨몸·시간 종목은 무게로 올릴 수가 없다 — 횟수/시간이 올리는 축이다.
  const step = weightStepKg(exerciseId);
  const timed = isTimedExercise(exerciseId);
  if (timed || step === null || (last.weightKg ?? 0) <= 0) {
    return {
      ...base,
      action: "bodyweight",
      suggestedReps: Math.max(target, last.reps + 1),
      reason: timed
        ? `무게가 없는 종목이에요. 버티는 시간을 조금씩 늘려 보세요.`
        : `맨몸 종목이에요. 무게 대신 횟수를 ${Math.max(target, last.reps + 1)}회까지 늘려 보세요.`,
    };
  }

  const lastKg = last.weightKg ?? 0;
  if (sessions.length === 1) {
    return {
      ...base,
      action: "first",
      suggestedKg: lastKg,
      suggestedReps: target,
      reason: `기록이 하나뿐이라 비교할 게 없어요. ${lastKg}kg 로 한 번 더 하고 판단해요.`,
    };
  }

  const stalled = stalledSessionCount(sessions);

  // 오래 정체 — 디로드로도 안 풀렸다는 뜻이라 그 종목은 쉬는 게 낫다.
  if (stalled >= REST_SESSIONS) {
    return {
      ...base,
      action: "rest",
      stalledSessions: stalled,
      suggestedKg: null,
      suggestedReps: null,
      reason: `${stalled}세션째 기록이 그대로예요. 이 종목은 한 주 쉬거나 다른 운동으로 바꿔 보세요.`,
    };
  }

  // 정체 — 볼륨을 줄여 회복하고 다시 올라온다.
  if (stalled >= STALL_SESSIONS) {
    const deload = roundToStep(lastKg * DELOAD_RATIO, step);
    return {
      ...base,
      action: "deload",
      stalledSessions: stalled,
      suggestedKg: deload,
      suggestedReps: target,
      reason: `${stalled}세션째 최고치가 안 늘었어요. ${deload}kg 로 낮춰 한 주 가볍게 가고 다시 올라와요.`,
    };
  }

  // 목표를 채웠으면 올린다. 못 채웠으면 무게는 그대로 두고 횟수부터 채운다.
  if (last.reps >= target) {
    const next = roundToStep(lastKg + step, step);
    return {
      ...base,
      action: "increase",
      stalledSessions: stalled,
      suggestedKg: next,
      suggestedReps: target,
      reason: `지난번 ${lastKg}kg × ${last.reps}회로 목표(${target}회)를 채웠어요. ${next}kg 로 올려요.`,
    };
  }
  return {
    ...base,
    action: "add-reps",
    stalledSessions: stalled,
    suggestedKg: lastKg,
    suggestedReps: target,
    reason: `지난번 ${last.reps}회였어요. 무게는 그대로 두고 ${target}회를 먼저 채워요.`,
  };
}

/** 화면 강조용 — 사용자가 바로 손봐야 하는 신호인가(정체·휴식). */
export function needsAttention(plan: OverloadPlan): boolean {
  return plan.action === "deload" || plan.action === "rest";
}

/** 강도 등급 라벨 — 왜 이 증량 단위인지 보여줄 때. */
export function loadClassLabel(exerciseId: string): string {
  switch (loadClassOf(exerciseId)) {
    case "heavy":
      return "복합 고중량";
    case "medium":
      return "일반 중량";
    case "light":
      return "고립 저중량";
    default:
      return "맨몸";
  }
}
