import "server-only";

import { cache } from "react";

import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import {
  frequentlySkippedIds,
  weakSubsFromWeek,
} from "@/features/routine/recommend";

/**
 * 루틴 추천 2단계 — 내 기록에서 뽑는 추천 신호(서버 전용, 읽기만 한다).
 * - weakSubs : 이번 주 0세트 세부근육(운동 점수와 **같은 판정**, `getMyWeeklyTraining`).
 * - avoid    : 최근 4주에 2번 이상 건너뛴 운동.
 * 기록 조회가 실패해도 추천은 돼야 한다 — 빈 신호로 돌아간다.
 */
export const getRecommendSignals = cache(async function getRecommendSignals(): Promise<{
  weakSubs: Set<string>;
  avoid: Set<string>;
}> {
  try {
    const [week, recent] = await Promise.all([
      getMyWeeklyTraining(),
      getRecentExerciseCompletions(28),
    ]);
    return { weakSubs: weakSubsFromWeek(week), avoid: frequentlySkippedIds(recent) };
  } catch {
    return { weakSubs: new Set(), avoid: new Set() };
  }
});
