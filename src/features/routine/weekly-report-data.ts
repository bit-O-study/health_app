import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { getStepsRange } from "@/features/health/steps-data";
import { getWorkoutDurationsRange } from "@/features/workout-timer/workout-sessions";
import { shiftYmd, weekStartYmd } from "@/features/routine/progress";
import {
  weeklyReport,
  type DailyValue,
  type WeeklyInput,
  type WeeklyReport,
} from "@/features/routine/weekly-report";

/**
 * 주간 통합 리포트의 데이터 수집 — 로드맵 2.3.
 *
 * 조회 창은 **이번 주 월요일의 일주일 전부터 오늘까지**(최대 14일). 지난주와 견주려면
 * 두 주가 다 필요하고, 그보다 넓게 읽을 이유는 없다.
 *
 * 다섯 곳을 **동시에** 읽는다 — 순서대로 기다리면 원거리 리전(싱가포르) 왕복이
 * 다섯 파가 된다. 집계·판단은 전부 순수 모듈(`weekly-report.ts`)이 한다.
 */

function toDaily(map: Map<string, number>): DailyValue[] {
  return [...map.entries()].map(([forDate, value]) => ({ forDate, value }));
}

/** 러닝 거리(m) — 날짜별. */
async function getRunMetersRange(
  from: string,
  to: string,
): Promise<DailyValue[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("daily_run_distance")
    .select("for_date, meters")
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", to);
  return ((data ?? []) as { for_date: string; meters: number | string }[])
    .map((r) => ({ forDate: r.for_date, value: Number(r.meters) }))
    .filter((r) => Number.isFinite(r.value));
}

/**
 * 식단을 **한 줄이라도 적은 날짜**들. 몇 줄을 적었는지는 안 본다 —
 * 기록률은 "그날 기록을 남겼나" 이지 "많이 적었나" 가 아니다.
 */
async function getDietLoggedDates(from: string, to: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("food_logs")
    .select("for_date")
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", to);
  return [
    ...new Set(((data ?? []) as { for_date: string }[]).map((r) => r.for_date)),
  ];
}

/** 이번 주 리포트 + 지난주 비교. 로그인 전이면 전부 0인 리포트. */
export async function getWeeklyReport(
  todayYmd: string = seoulYmd(),
): Promise<WeeklyReport> {
  // 지난주 월요일 ~ 오늘. (지난주 구간을 자르는 건 순수 모듈이 한다.)
  const from = shiftYmd(weekStartYmd(todayYmd), -7);

  const [completions, durations, steps, runMeters, dietLoggedDates] =
    await Promise.all([
      // 14일이면 충분한데 헬퍼가 '며칠 전부터' 를 받으므로 넉넉히 15일.
      getRecentExerciseCompletions(15),
      getWorkoutDurationsRange(from, todayYmd),
      getStepsRange(from, todayYmd),
      getRunMetersRange(from, todayYmd),
      getDietLoggedDates(from, todayYmd),
    ]);

  const input: WeeklyInput = {
    completions: completions.map((c) => ({
      forDate: c.forDate,
      exerciseId: c.exerciseId,
      status: c.status,
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
      // 드롭세트·피라미드 — 안 넘기면 균일 세트로만 세어 볼륨이 틀어진다.
      setDetails: c.setDetails,
    })),
    workoutSeconds: toDaily(durations),
    steps: toDaily(steps),
    runMeters,
    dietLoggedDates,
  };
  return weeklyReport(input, todayYmd);
}
