import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { goalProgress } from "@/features/profile/goal";
import { getMyCommitments } from "@/features/commitments/data-access";
import type { UserProfile } from "@/features/profile/data-access";
import type {
  GoalCardView,
  MissionCardView,
} from "@/features/routine/components/today-goal-card";

/** 홈 '오늘의 다짐' 체크리스트 한 줄. */
export type TodayCommitment = {
  id: string;
  title: string;
  /** 목표 달성(완료) 여부. */
  done: boolean;
  /** "12/20일" 등 현재/목표. */
  valueText: string;
};

export type HomeDashboard = {
  goalCard: GoalCardView | null;
  missionCards: MissionCardView[];
  totalMissions: number;
  current: {
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
  };
  /** 오늘 진행 중인 다짐(예정·종료 제외) — 체크리스트용. */
  todayCommitments: TodayCommitment[];
  /** 지금까지 운동한 횟수(운동한 날 수). */
  workoutCount: number;
};

/** 홈 대시보드 — 체형 목표 + 오늘의 다짐 체크리스트 + 누적 운동 횟수. */
export async function getHomeDashboard(
  profile: UserProfile | null,
): Promise<HomeDashboard> {
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

  const [commitments, workoutCount] = await Promise.all([
    getMyCommitments(),
    countWorkouts(),
  ]);

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

  // 오늘 진행 중(예정·종료 아님)인 다짐만 체크리스트로.
  const todayCommitments: TodayCommitment[] = commitments
    .filter((c) => !c.progress.expired && !c.progress.upcoming)
    .map((c) => ({
      id: c.id,
      title: c.title,
      done: c.progress.done,
      valueText: `${c.progress.current}/${c.progress.target}${c.unit}`,
    }));

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
    todayCommitments,
    workoutCount,
  };
}

/** 지금까지 운동한 날 수 — workout_sessions(하루 1행) 개수. */
async function countWorkouts(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("workout_sessions")
    .select("for_date", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("duration_sec", 0);
  return count ?? 0;
}
