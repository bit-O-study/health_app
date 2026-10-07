import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { cardioDoneKcal, strengthDoneKcal, weightOrDefault, type CardioDone } from "@/features/routine/burn";
import { getWorkoutDurationsRange } from "@/features/workout-timer/workout-sessions";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { getConditioningItem } from "@/features/routine/conditioning-catalog";
import { basalMetabolicRate } from "@/features/diet/calorie-target";
import { getFoodLogsForDate, type FoodLog } from "@/features/diet/data-access";
import { getStepsRange, getStepsForDate } from "@/features/health/steps-data";
import { getWaterForDate } from "@/features/diet/data-access";
import { getRunSessionsRange } from "@/features/running/run-history-data";
import type { RunHistoryRow } from "@/features/running/run-history-summary";
import { seoulDateOf, seoulDayRangeUtc } from "@/features/calendar/calendar-labels";
import { streakByChunks } from "@/features/calendar/month-stats";
import { stepsToKcal } from "@/features/health/steps-calories";
import { ageOf } from "@/features/profile/survey-extra";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type DaySummary = {
  intake: number;
  burned: number; // 활동 소비(운동 + 걸음 칼로리) — 달력 칸의 '−' 숫자
  exerciseKcal: number; // 그중 운동(근력·유산소)
  stepsKcal: number; // 그중 걷기
  durationSec: number;
  steps: number; // 그날 걸음수
  didWeight: boolean; // 실제로 웨이트(근력 운동)을 완료한 날 — 캘린더 덤벨 마커
  /**
   * 그날 런닝 거리 합(m). 칼로리는 이미 컨디셔닝 완료 기록으로 `exerciseKcal` 에 들어가
   * 있어서 **거리만** 보여 준다(여기서 또 더하면 두 번 센다).
   */
  runM: number;
  /** 그날 마지막으로 잰 체중(kg). 안 잰 날은 null — 달력 칸의 체중 점. */
  weighedKg: number | null;
};

export type MonthlyCalendar = {
  byDate: Map<string, DaySummary>;
  intakeTotal: number;
  /** 운동만(근력·유산소). 걷기는 `stepsBurnedTotal` 로 따로 — '운동 소비' 에 걷기가 섞이지 않게. */
  workoutBurnedTotal: number;
  stepsBurnedTotal: number;
  bmr: number;
};

function profileGender(g: unknown): "male" | "female" {
  return g === "female" ? "female" : "male";
}

/** 한 달(from~to) 일자별 섭취·운동소비·운동시간 집계 + 기초대사량. */
export async function getMonthlyCalendar(
  from: string,
  to: string,
): Promise<MonthlyCalendar> {
  const user = await getCurrentUser();

  const byDate = new Map<string, DaySummary>();
  const ensure = (d: string): DaySummary => {
    let s = byDate.get(d);
    if (!s) {
      s = { intake: 0, burned: 0, exerciseKcal: 0, stepsKcal: 0, durationSec: 0, steps: 0, didWeight: false, runM: 0, weighedKg: null };
      byDate.set(d, s);
    }
    return s;
  };

  if (!user) return { byDate, intakeTotal: 0, workoutBurnedTotal: 0, stepsBurnedTotal: 0, bmr: 1500 };
  const supabase = await createSupabaseServerClient();

  // ⚡ 프로필(체중·키)은 kcal **산수**에만 쓰인다 — 기록 조회와 한 묶음으로 동시에 쏜다.
  //   예전엔 프로필을 먼저 기다리고 나서 기록을 조회해 왕복이 두 번 직렬로 쌓였다.
  const weightRange = seoulDayRangeUtc(from, to);
  const [profile, foodRes, exRes, condRes, durMap, stepsMap, runs, weightRes] = await Promise.all([
    getUserProfile(),
    supabase
      .from("food_logs")
      .select("for_date, kcal")
      .eq("user_id", user.id)
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("exercise_completions")
      .select("for_date, exercise_id, sets")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("conditioning_completions")
      .select("for_date, item_id, duration_min, speed, incline")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    getWorkoutDurationsRange(from, to),
    getStepsRange(from, to),
    getRunSessionsRange(from, to),
    supabase
      .from("weight_logs")
      .select("weight_kg, created_at")
      .eq("user_id", user.id)
      .gte("created_at", weightRange.gte)
      .lt("created_at", weightRange.lt)
      .order("created_at", { ascending: true }),
  ]);

  const weight = weightOrDefault(profile?.weightKg);
  const bmr = profile
    ? basalMetabolicRate({
        gender: profileGender(profile.gender),
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: ageOf(profile.ageGroup),
      })
    : 1500;

  for (const r of runs) ensure(r.forDate).runM += Math.max(0, r.distanceM);
  // 오래된→최신 순이라 같은 날 여러 번 쟀으면 마지막 값이 남는다.
  for (const r of (weightRes.data ?? []) as { weight_kg: number | string | null; created_at: string }[]) {
    const kg = r.weight_kg === null ? null : num(r.weight_kg);
    const day = seoulDateOf(r.created_at);
    if (kg && day) ensure(day).weighedKg = kg;
  }

  for (const r of (foodRes.data ?? []) as { for_date: string; kcal: number | string }[]) {
    ensure(r.for_date).intake += num(r.kcal);
  }
  for (const r of (exRes.data ?? []) as {
    for_date: string;
    exercise_id: string | null;
    sets: number | null;
  }[]) {
    if (!r.exercise_id) continue;
    const s = ensure(r.for_date);
    s.exerciseKcal += strengthDoneKcal(weight, r);
    s.didWeight = true; // 근력 운동을 실제로 완료 → 그날 '웨이트한 날'
  }
  for (const r of (condRes.data ?? []) as (CardioDone & { for_date: string })[]) {
    if (!r.item_id) continue;
    // 스냅샷이 비면 카탈로그 기본값(경사 포함) — 모든 화면이 burn.ts 한 규칙.
    ensure(r.for_date).exerciseKcal += cardioDoneKcal(weight, r);
  }
  for (const [date, sec] of durMap) ensure(date).durationSec = sec;
  // 걸음수 → 그날 소비 칼로리에 가산 + 걸음수 저장.
  for (const [date, steps] of stepsMap) {
    const s = ensure(date);
    s.steps = steps;
    s.stepsKcal += stepsToKcal(steps, weight);
  }

  let intakeTotal = 0;
  let workoutBurnedTotal = 0;
  let stepsBurnedTotal = 0;
  for (const s of byDate.values()) {
    // 운동 kcal 은 raw 합산 후 한 번만 반올림 — 운동모드 '총 kcal' 과 같은 방식(kcal-parity.test).
    s.burned = Math.round(s.exerciseKcal + s.stepsKcal);
    s.intake = Math.round(s.intake);
    s.exerciseKcal = Math.round(s.exerciseKcal);
    s.stepsKcal = Math.round(s.stepsKcal);
    intakeTotal += s.intake;
    workoutBurnedTotal += s.exerciseKcal;
    stepsBurnedTotal += s.stepsKcal;
  }

  return { byDate, intakeTotal, workoutBurnedTotal, stepsBurnedTotal, bmr };
}

export type DayDetail = {
  intake: number;
  burned: number;
  durationSec: number;
  steps: number;
  stepsKcal: number;
  /** 그날 런닝(최신순). 칼로리는 conditioning 쪽에 이미 들어 있다 — 거리·시간·페이스만. */
  runs: RunHistoryRow[];
  /** 마신 물(ml). */
  waterMl: number;
  /** 그날 마지막으로 잰 체중(kg). */
  weighedKg: number | null;
  /** 그날 먹은 단백질·탄수화물·지방(g). 적힌 음식만 합한다. */
  macros: { protein: number; carbs: number; fat: number };
  foods: FoodLog[];
  workouts: { name: string; sets: number; reps: number; weightKg: number | null; kcal: number }[];
  conditioning: { name: string; detail: string; kcal: number }[];
};

/** 한 날짜의 상세: 식단 + 완료 운동 + 컨디셔닝 + 운동시간. */
export async function getDayDetail(dateYmd: string): Promise<DayDetail> {
  const user = await getCurrentUser();
  if (!user) {
    const foods = await getFoodLogsForDate(dateYmd);
    return {
      intake: Math.round(foods.reduce((s, f) => s + f.kcal, 0)),
      burned: 0,
      durationSec: 0,
      steps: 0,
      stepsKcal: 0,
      runs: [],
      waterMl: 0,
      weighedKg: null,
      macros: sumMacros(foods),
      foods,
      workouts: [],
      conditioning: [],
    };
  }

  // ⚡ 왕복 2파 → 1파. 여섯 조회는 서로 **완전히 독립**이다(체중은 받은 뒤 산수에만
  //   쓰인다). 예전엔 식단·걸음수를 먼저 await 하고 나서 완료기록을 쏴서, 원거리
  //   리전(싱가포르) 왕복이 두 번 직렬로 쌓였다. 한 묶음으로 동시에 시작한다.
  const supabase = await createSupabaseServerClient();
  const dayRange = seoulDayRangeUtc(dateYmd, dateYmd);
  const [profile, foods, stepsRaw, exRes, condRes, durRes, runs, waterMl, weightRes] = await Promise.all([
    getUserProfile(),
    getFoodLogsForDate(dateYmd),
    getStepsForDate(dateYmd),
    supabase
      .from("exercise_completions")
      .select("exercise_id, sets, reps, weight_kg")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("item_id, duration_min, speed, incline, sets, reps")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .eq("status", "done"),
    supabase
      .from("workout_sessions")
      .select("duration_sec")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .maybeSingle(),
    getRunSessionsRange(dateYmd, dateYmd),
    getWaterForDate(dateYmd),
    supabase
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", user.id)
      .gte("created_at", dayRange.gte)
      .lt("created_at", dayRange.lt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const weight = weightOrDefault(profile?.weightKg);
  const intake = Math.round(foods.reduce((s, f) => s + f.kcal, 0));
  const steps = stepsRaw ?? 0;
  const stepsKcal = stepsToKcal(steps, weight);

  // 합계는 raw로 누적해 마지막에 한 번만 반올림한다(월간 집계·운동모드 총합과 동일한 방식).
  // 항목별 표시 kcal은 보기 좋게 개별 반올림하되, burned 총합에는 raw를 더한다.
  let burnedRaw = 0;
  const workouts = ((exRes.data ?? []) as {
    exercise_id: string | null;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
  }[])
    .filter((r) => r.exercise_id)
    .map((r) => {
      const raw = strengthDoneKcal(weight, r);
      burnedRaw += raw;
      const kcal = Math.round(raw);
      return {
        name: getCatalogExercise(r.exercise_id!)?.name ?? r.exercise_id!,
        sets: num(r.sets),
        reps: num(r.reps),
        weightKg: r.weight_kg === null ? null : num(r.weight_kg),
        kcal,
      };
    });

  const conditioning = ((condRes.data ?? []) as {
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
    incline: number | string | null;
    sets: number | null;
    reps: number | null;
  }[])
    .filter((r) => r.item_id)
    .map((r) => {
      const raw = cardioDoneKcal(weight, r);
      burnedRaw += raw;
      const kcal = Math.round(raw);
      const item = getConditioningItem(r.item_id!);
      const parts: string[] = [];
      if (r.duration_min != null) parts.push(`${r.duration_min}분`);
      if (r.sets != null) parts.push(`${r.sets}세트`);
      if (r.reps != null) parts.push(`${r.reps}회`);
      return {
        name: item?.name ?? r.item_id!,
        detail: parts.join(" · "),
        kcal,
      };
    });

  const durationSec = Math.max(
    0,
    num((durRes.data as { duration_sec?: number } | null)?.duration_sec),
  );

  const burned = Math.round(burnedRaw) + stepsKcal; // 운동 + 걸음 칼로리
  const wk = (weightRes.data as { weight_kg?: number | string | null } | null)?.weight_kg;
  return {
    intake,
    burned,
    durationSec,
    steps,
    stepsKcal,
    runs,
    waterMl,
    weighedKg: wk === null || wk === undefined ? null : num(wk) || null,
    macros: sumMacros(foods),
    foods,
    workouts,
    conditioning,
  };
}

/** 적힌 영양소만 더한다(빈 값은 0). 소수 한 자리. */
function sumMacros(foods: FoodLog[]): { protein: number; carbs: number; fat: number } {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    protein: r1(foods.reduce((s, f) => s + (f.protein ?? 0), 0)),
    carbs: r1(foods.reduce((s, f) => s + (f.carbs ?? 0), 0)),
    fat: r1(foods.reduce((s, f) => s + (f.fat ?? 0), 0)),
  };
}

/**
 * 운동한 날짜 모음(from~to) — 캘린더 연속 운동 일수용(3단계).
 * 근력·유산소 완료, 운동 시간 기록, 런닝 중 하나라도 있으면 그날은 운동한 날이다
 * (`month-stats.isActiveDay` 와 같은 기준 — 걷기만 한 날은 뺀다).
 * 날짜 칸만 읽어서 가볍다. 네 조회는 서로 독립이라 한 번에 쏜다.
 */
export async function getActiveDates(from: string, to: string): Promise<Set<string>> {
  const user = await getCurrentUser();
  const out = new Set<string>();
  if (!user) return out;
  const supabase = await createSupabaseServerClient();
  const [ex, cond, sess, runs] = await Promise.all([
    supabase.from("exercise_completions").select("for_date").eq("user_id", user.id).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("conditioning_completions").select("for_date").eq("user_id", user.id).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("workout_sessions").select("for_date, duration_sec").eq("user_id", user.id).gt("duration_sec", 0).gte("for_date", from).lte("for_date", to),
    supabase.from("run_sessions").select("for_date").eq("user_id", user.id).gte("for_date", from).lte("for_date", to),
  ]);
  for (const res of [ex, cond, sess, runs]) {
    for (const r of (res.data ?? []) as { for_date: string }[]) out.add(r.for_date);
  }
  return out;
}

/**
 * 지금 연속 운동 일수 — 60일씩 거꾸로 필요한 만큼만 조회한다(캘린더 속도 정리).
 *
 * 🔴 예전엔 1년치 운동 기록을 한 번에 읽었다. 조회 한 번은 **최대 1,000행**까지만 오므로
 *    매일 운동하는 사람은 기록이 잘려 연속이 틀리게 나올 수 있었고, 대부분의 사람에게는
 *    쓰지도 않을 1년치를 매번 읽었다. 이제 최근 60일 안에서 끊기면(거의 모든 경우) 거기서 끝.
 */
export async function getCurrentStreak(today: string): Promise<number> {
  return streakByChunks(today, getActiveDates);
}
