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
 * 올리고 내리는 폭은 **무엇을 몇 개 드는지**(`load-implement.ts`)가 정한다 —
 * 덤벨 2개(양손) 4kg · 덤벨 1개 2kg · 바벨 5kg · 머신 5kg. 디로드도 이 단위로만 내린다
 * (−10% 가 한 단위보다 작으면 **한 단위**를 내린다 — 반올림하면 제자리가 돼 디로드가 안 된다).
 *
 * 판단 근거는 이 앱이 이미 가진 것만 쓴다(완료 기록 스냅샷) — 새 입력을 요구하지 않는다.
 */

import type { ExperienceLevel } from "@/features/profile/data";
import { loadClassOf } from "@/features/routine/exercise-load";
import { targetReps } from "@/features/routine/prescription";
import {
  exerciseHistory,
  implementFor,
  weightGridKg,
  weightStepKg,
  type ExerciseSession,
  type ProgressRecord,
} from "@/features/routine/progress";
import { implementInfo } from "@/features/routine/load-implement";
import { isTimedExercise } from "@/features/routine/timed-exercises";
import type { EquipmentId } from "@/features/routine/exercise-catalog-labels";

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
  /** 이번 판단에 쓴 증감 단위(kg). 무게 종목이 아니면 null. */
  stepKg: number | null;
  /** 무엇을 드는지("덤벨 2개(양손)") — 왜 이 단위인지 화면에 보여줄 때. */
  implementLabel: string;
  /** 최고치가 안 늘어난 연속 세션 수(0 = 지난번에 늘었다). */
  stalledSessions: number;
  /** 화면에 그대로 보여줄 근거 한 줄. */
  reason: string;
};

/** 눈금에 맞춘다 — 실제 조절할 수 없는 소수 중량을 제안하지 않는다. */
function roundToGrid(kg: number, grid: number): number {
  return Math.max(grid, fix(Math.round(kg / grid) * grid));
}

/** 부동소수 찌꺼기 제거(2.5 × 3 = 7.500000001 같은). */
function fix(kg: number): number {
  return Math.round(kg * 100) / 100;
}

/**
 * 디로드 무게. −10% 를 **단위의 배수로 올려** 뺀다 — 최소 한 단위.
 * 예) 바벨 100kg → 90kg, 덤벨 2개 20kg → 16kg(−10% 는 2kg 라 한 단위 4kg).
 * 더 내릴 수 없으면(가장 가벼운 무게) null.
 */
export function deloadKg(lastKg: number, step: number, grid: number): number | null {
  const cut = Math.max(step, Math.ceil(fix((lastKg * (1 - DELOAD_RATIO)) / step)) * step);
  const next = fix(lastKg - cut);
  return next >= grid ? next : null;
}

/** "4kg(한 손 2kg씩)" — 단위를 말로. */
function stepText(step: number, note: string): string {
  return note ? `${step}kg(${note})` : `${step}kg`;
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
  equipment?: EquipmentId | string | null,
  /** 사용자가 정한 그 종목의 증량 단위(kg). 없으면 기구·종목 크기로 정한 기본값. */
  stepOverrideKg?: number | null,
): OverloadPlan {
  const target =
    todayTargetReps && todayTargetReps > 0
      ? Math.round(todayTargetReps)
      : targetReps(exerciseId, experience);
  const sessions = exerciseHistory(records, exerciseId);
  const last = sessions[0];
  // 🔴 기구를 안 받았으면 **마지막 기록의 기구**를 쓴다. 예전엔 그냥 기본값(2kg)으로
  //    떨어져서, 같은 바벨 스쿼트인데 운동모드는 +5kg(바벨)를, 성장 그래프는 +2kg를
  //    권했다 — 화면마다 다른 증량을 말하는 셈이었다.
  const eq = equipment ?? last?.equipment;
  const info = implementInfo(implementFor(exerciseId, eq));
  const step = weightStepKg(exerciseId, eq, stepOverrideKg);
  const grid = weightGridKg(exerciseId, eq, stepOverrideKg) ?? step;
  // 사용자가 단위를 정했으면 "한 손 2kg씩" 같은 기본 설명은 더는 맞지 않는다.
  const note = stepOverrideKg ? "내 설정" : info.stepNote;
  const base = {
    exerciseId,
    targetReps: target,
    stalledSessions: 0,
    suggestedKg: null as number | null,
    suggestedReps: null as number | null,
    stepKg: step,
    implementLabel: info.label,
  };

  if (!last) {
    return { ...base, action: "none", reason: "아직 이 운동 기록이 없어요." };
  }

  // 맨몸·시간 종목은 무게로 올릴 수가 없다 — 횟수/시간이 올리는 축이다.
  const timed = isTimedExercise(exerciseId);
  if (timed || step === null || grid === null || (last.weightKg ?? 0) <= 0) {
    return {
      ...base,
      stepKg: null,
      action: "bodyweight",
      suggestedReps: Math.max(target, last.reps + 1),
      reason: timed
        ? `무게가 없는 종목이에요. 버티는 시간을 조금씩 늘려 보세요.`
        : `맨몸 종목이에요. 무게 대신 횟수를 ${Math.max(target, last.reps + 1)}회까지 늘려 보세요.`,
    };
  }

  // 지난 무게는 **눈금**에만 맞춘다(덤벨 10kg 은 10kg 그대로). 움직이는 폭은 단위(step).
  const lastKg = roundToGrid(last.weightKg ?? 0, grid);
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
    const deload = deloadKg(lastKg, step, grid);
    return {
      ...base,
      action: "deload",
      stalledSessions: stalled,
      suggestedKg: deload ?? lastKg,
      suggestedReps: target,
      reason:
        deload === null
          ? `${stalled}세션째 최고치가 안 늘었어요. ${lastKg}kg 보다 가벼운 무게가 없으니 무게는 두고 세트를 절반으로 줄여 한 주 쉬어 가요.`
          : `${stalled}세션째 최고치가 안 늘었어요. ${info.label} 기준 ${fix(lastKg - deload)}kg 내린 ${deload}kg 로 한 주 가볍게 가고 다시 올라와요.`,
    };
  }

  // 목표를 채웠으면 올린다. 못 채웠으면 무게는 그대로 두고 횟수부터 채운다.
  if (last.reps >= target) {
    const next = fix(lastKg + step);
    return {
      ...base,
      action: "increase",
      stalledSessions: stalled,
      suggestedKg: next,
      suggestedReps: target,
      reason: `지난번 ${lastKg}kg × ${last.reps}회로 목표(${target}회)를 채웠어요. ${info.label} 기준 ${stepText(step, note)} 올려 ${next}kg 로 해요.`,
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
