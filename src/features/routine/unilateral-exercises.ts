/**
 * 단측(한쪽씩) 운동 — 한 번에 한 팔·한 다리로 하는 종목.
 *
 * 성장 기록에서 중요한 이유: 사용자는 **한쪽 기준으로** 기록한다("원암 로우 20kg × 10회").
 * 그 값을 그대로 세면 실제 한 세션에서 한 일이 절반으로 잡혀, 양측 운동과 나란히
 * 놓았을 때 순위·부위 분포가 왜곡된다. 그래서 볼륨만 ×2 한다.
 *
 * **추정 1RM 은 두 배로 하지 않는다** — 한쪽이 든 무게가 곧 그 팔의 최대 능력이고,
 * 그게 이 지표가 답하려는 질문이기 때문이다. (볼륨=한 일의 총량, 1RM=한쪽의 힘.)
 *
 * 순수 모듈(server-only 없음) — 클라이언트/단위테스트 공용.
 */

/**
 * 한쪽씩 하는 종목 id.
 *
 * **명백한 것만 넣는다.** 런지·스텝업처럼 "10회"가 한쪽인지 합쳐서인지 사람마다
 * 다르게 적는 종목은 일부러 뺐다 — 틀리게 두 배로 세는 것보다 그대로 두는 게 낫다.
 * (한 사람의 기록 안에서는 어느 쪽이든 일관되므로 추세는 흔들리지 않는다.)
 */
export const UNILATERAL_EXERCISE_IDS: ReadonlySet<string> = new Set([
  "one-arm-dumbbell-row",
  "meadows-row",
  "concentration-curl",
  "triceps-kickback",
  "cable-kickback",
  "single-leg-leg-press",
  "pistol-squat",
  "side-plank",
]);

/** 이 운동이 한쪽씩 하는 종목인가? */
export function isUnilateralExercise(
  exerciseId: string | null | undefined,
): boolean {
  return !!exerciseId && UNILATERAL_EXERCISE_IDS.has(exerciseId);
}

/** 볼륨 배수 — 단측이면 2(양쪽 합), 아니면 1. */
export function volumeSideFactor(
  exerciseId: string | null | undefined,
): number {
  return isUnilateralExercise(exerciseId) ? 2 : 1;
}
