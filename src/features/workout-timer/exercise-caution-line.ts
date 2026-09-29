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
