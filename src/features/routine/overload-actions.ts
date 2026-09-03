"use server";

import { getUserProfile } from "@/features/profile/data-access";
import { getRecentDoneRecords } from "@/features/routine/exercise-completions";
import {
  buildAdviceMap,
  type AdviceTarget,
  type OverloadAdvice,
} from "@/features/routine/overload-advice";

/** 한 번에 물어볼 수 있는 종목 수 — 한 일차의 본운동보다 넉넉하되 무제한은 아니게. */
const MAX_TARGETS = 40;

/**
 * 계획 편집 화면이 **필요할 때만** 받아가는 과부하 추천.
 *
 * 운동모드는 서버 컴포넌트가 큐를 만들 때 같이 실어 보내지만, 계획 편집은 클라이언트에서
 * 운동을 바꿔 가며 편집한다 — 첫 렌더에 다 실어 보내면 편집 중 바꾼 운동은 추천이 없고,
 * 페이지 초기 응답만 무거워진다. 그래서 여기서 받아온다.
 *
 * 조회는 `getRecentDoneRecords`(요청 단위 `cache()`) 하나뿐이고, 판단은 순수 함수다.
 * 실패해도 화면이 멈추면 안 되므로 **던지지 않고 빈 맵**을 준다 — 추천은 있으면 좋은
 * 것이지, 없다고 계획을 못 짜면 안 된다.
 */
export async function overloadAdviceAction(
  exerciseIds: string[],
  targetRepsById?: Record<string, number>,
): Promise<Record<string, OverloadAdvice>> {
  try {
    const ids = [...new Set(exerciseIds.filter((id) => typeof id === "string" && id))].slice(
      0,
      MAX_TARGETS,
    );
    if (ids.length === 0) return {};
    const [profile, records] = await Promise.all([
      getUserProfile(),
      getRecentDoneRecords(),
    ]);
    if (!profile) return {};
    const targets: AdviceTarget[] = ids.map((id) => ({
      exerciseId: id,
      targetReps: targetRepsById?.[id] ?? null,
    }));
    return buildAdviceMap(records, targets, profile.experience);
  } catch {
    return {};
  }
}
