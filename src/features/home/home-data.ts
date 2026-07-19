import "server-only";

import { goalProgress } from "@/features/profile/goal";
import { getMyCommitments } from "@/features/commitments/data-access";
import type { UserProfile } from "@/features/profile/data-access";
import type {
  GoalCardView,
  MissionCardView,
} from "@/features/routine/components/today-goal-card";

export type GoalAndMissions = {
  goalCard: GoalCardView | null;
  missionCards: MissionCardView[];
  totalMissions: number;
  current: {
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
  };
};

/**
 * 홈 대시보드용 — 체형 목표 진행(goalCard) + 내다짐 미션(missionCards)을 한 번에 만든다.
 * (운동탭 상단에 있던 로직을 홈으로 옮기며 재사용하려고 순수 서버 헬퍼로 분리.)
 */
export async function getGoalAndMissions(
  profile: UserProfile | null,
): Promise<GoalAndMissions> {
  const gp = goalProgress(
    profile?.goal ?? null,
    {
      weightKg: profile?.weightKg ?? null,
      bodyFatPct: profile?.bodyFatPct ?? null,
      muscleMassKg: profile?.muscleMassKg ?? null,
    },
    {
      targetWeightKg: profile?.targetWeightKg ?? null,
      targetBodyFatPct: profile?.targetBodyFatPct ?? null,
      targetMuscleKg: profile?.targetMuscleKg ?? null,
    },
  );
  const goalCard: GoalCardView | null = gp
    ? {
        metricLabel: gp.metricLabel,
        directionLabel: gp.direction === "up" ? "증량" : "감량",
        currentText: gp.currentText,
        targetText: `${gp.target}${gp.unit}`,
        remainingText: gp.remainingText,
        reached: gp.reached,
      }
    : null;

  const commitments = await getMyCommitments();
  const missionCards: MissionCardView[] = commitments.slice(0, 4).map((c) => {
    const p = c.progress;
    const statusText = p.done
      ? "달성"
      : p.expired
        ? "종료"
        : p.upcoming
          ? "예정"
          : p.daysLeft <= 0
            ? "오늘 마감"
            : `D-${p.daysLeft}`;
    return {
      id: c.id,
      title: c.title,
      valueText: `${p.current}/${p.target}${c.unit}`,
      pct: p.pct,
      statusText,
      done: p.done,
    };
  });

  return {
    goalCard,
    missionCards,
    totalMissions: commitments.length,
    current: {
      weightKg: profile?.weightKg ?? null,
      heightCm: profile?.heightCm ?? null,
      bodyFatPct: profile?.bodyFatPct ?? null,
      muscleMassKg: profile?.muscleMassKg ?? null,
    },
  };
}
