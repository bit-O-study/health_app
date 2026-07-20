import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { goalProgress } from "@/features/profile/goal";
import { getMyCommitments } from "@/features/commitments/data-access";
import type { UserProfile } from "@/features/profile/data-access";
import type {
  GoalCardView,
  MissionCardView,
} from "@/features/routine/components/today-goal-card";
import { getDayDetail } from "@/features/calendar/data-access";
import { dailyTarget } from "@/features/diet/calorie-target";
import { seoulYmd, addDaysYmd } from "@/features/routine/data";
import { getWorkoutDurationsRange } from "@/features/workout-timer/workout-sessions";
import {
  buildContributionGrid,
  computeDietExerciseNeed,
  computeMacroRemaining,
  type ContributionDay,
  type DietExerciseNeed,
  type MacroRemaining,
} from "@/features/home/dashboard-metrics";

const CONTRIBUTION_WEEKS = 53;

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
  /** 오늘 식단 기준 필요 운동량(태워야 할 kcal · 남은 시간). */
  dietExerciseNeed: DietExerciseNeed;
  /** 탄단지 목표 대비 오늘 더 먹어야 하는 양(g). */
  macroRemaining: MacroRemaining;
  /** 오늘 식단 기록이 하나라도 있는지 — 없으면 카드에 '기록 없음'을 보여준다. */
  hasFoodLog: boolean;
  /** 잔디(컨트리뷰션) 그래프 — 최근 53주, 일요일 시작. */
  contributions: ContributionDay[];
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

  const todayYmd = seoulYmd();
  const fromYmd = addDaysYmd(todayYmd, -(CONTRIBUTION_WEEKS * 7 - 1));
  const [commitments, workoutCount, todayDetail, durationsByDate] = await Promise.all([
    getMyCommitments(),
    countWorkouts(),
    getDayDetail(todayYmd),
    getWorkoutDurationsRange(fromYmd, todayYmd),
  ]);

  const target = dailyTarget({
    gender: profile?.gender ?? "male",
    weightKg: profile?.weightKg ?? null,
    heightCm: profile?.heightCm ?? null,
  });
  const dietExerciseNeed = computeDietExerciseNeed({
    targetKcal: target.kcal,
    eatenKcal: todayDetail.intake,
    burnedKcal: todayDetail.burned,
    weightKg: profile?.weightKg ?? null,
  });
  const eatenMacro = todayDetail.foods.reduce(
    (s, f) => ({
      protein: s.protein + (f.protein ?? 0),
      carbs: s.carbs + (f.carbs ?? 0),
      fat: s.fat + (f.fat ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );
  const macroRemaining = computeMacroRemaining(
    { protein: target.protein, carbs: target.carbs, fat: target.fat },
    eatenMacro,
  );
  const contributions = buildContributionGrid(
    durationsByDate,
    todayYmd,
    CONTRIBUTION_WEEKS,
  );

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
    dietExerciseNeed,
    macroRemaining,
    hasFoodLog: todayDetail.foods.length > 0,
    contributions,
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
