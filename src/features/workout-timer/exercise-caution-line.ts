/**
 * 휴식 카드의 '조심' 한 줄 — 한 줄 코치(2026-09-29).
 *
 * 1순위: 운동별 주의 사항(`EXERCISE_CAUTIONS`, 부위 표시와 함께 만든 33개 — 그동안 아무 데서도
 *        안 쓰였다). 2순위: 운동 가이드의 '초보가 흔히 놓치는 점' 첫 줄(운동별 23개 +
 *        동작 유형별 기본값이라 1,237개 전부 뭔가는 나온다).
 * 서버에서 큐를 만들 때 붙인다 — 가이드 데이터를 클라이언트 번들에 싣지 않으려고.
 */

import { EXERCISE_CAUTIONS } from "@/features/workout-timer/exercise-cautions";
import { guideFor } from "@/features/workout-timer/exercise-guides";

export function cautionFor(exerciseId: string): string | null {
  const own = EXERCISE_CAUTIONS[exerciseId]?.[0]?.tip;
  if (own) return own;
  return guideFor(exerciseId).beginnerTips[0] ?? null;
}

/**
 * 처음 하는 운동인가 — 최근 완료 기록(오늘 제외)에 그 운동이 없으면 처음이다(한 줄 코치 2단계).
 * 최근 기록은 과부하 추천과 **같은 조회**(최근 180일)라 왕복이 늘지 않는다. 반년 넘게 안 한
 * 운동은 다시 준비 카드를 보여 주는 편이 오히려 맞다.
 */
export function isFirstTimeExercise(
  records: readonly { exerciseId: string | null; forDate: string }[],
  exerciseId: string,
  today: string,
): boolean {
  return !records.some((r) => r.exerciseId === exerciseId && r.forDate < today);
}

/**
 * 처음 하는 운동의 '준비 3가지' — 첫 세트 전 준비 카드용.
 * 1순위: 운동별 준비 단계(약 110개). 2순위: 가이드 셋업 문장을 나눈 것(운동별 23 + 동작 유형별
 * 기본값). 3순위: 운동법 첫 줄. 최대 3개 — 카드도 한눈에 들어와야 한다.
 */
export function introStepsFor(exerciseId: string, method: readonly string[]): string[] {
  const guide = guideFor(exerciseId);
  if (guide.setupSteps && guide.setupSteps.length > 0) return guide.setupSteps.slice(0, 3);
  const fromSetup = guide.setup
    .split(/(?<=[.!?。])\s+|(?<=다\.)\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter((x) => x.length > 2);
  if (fromSetup.length > 0) return fromSetup.slice(0, 3);
  return method.slice(0, 1);
}
