import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { seoulYmd, addDaysYmd } from "@/features/routine/data";
import {
  commitmentProgress,
  isActiveOn,
  isCommitmentMetric,
  metricMeta,
  ymdDiff,
  type CommitmentAgg,
  type CommitmentMetric,
  type CommitmentProgress,
} from "@/features/commitments/commitment";
import {
  achievementForDay,
  missionLabel,
  MISSION_CATALOG,
  markerForPct,
  sanitizeMissions,
  EMPTY_DAY,
  type DayStats,
  type MarkerLevel,
  type MissionSpec,
} from "@/features/commitments/missions";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type CommitmentRow = {
  id: string;
  title: string;
  tag: string;
  metric: CommitmentMetric;
  target: number;
  startDate: string;
  deadline: string;
};

export type CommitmentView = CommitmentRow & {
  progress: CommitmentProgress;
  metricLabel: string;
  unit: string;
  kind: "workout" | "diet";
};

type ExRow = { for_date: string; exercise_id: string | null; sets: number | null };
type CondRow = {
  for_date: string;
  item_id: string | null;
  duration_min: number | null;
  speed: number | string | null;
};
type FoodRow = { for_date: string; kcal: number | string };

/** 한 다짐의 [start, min(deadline, today)] 창에 대해 기존 기록을 집계. */
function aggregateWindow(
  from: string,
  toInclusive: string,
  weight: number,
  ex: ExRow[],
  cond: CondRow[],
  food: FoodRow[],
): CommitmentAgg {
  const inWin = (d: string) => d >= from && d <= toInclusive;
  const workoutDates = new Set<string>();
  let workoutCount = 0;
  let burnKcal = 0;
  for (const r of ex) {
    if (!r.exercise_id || !inWin(r.for_date)) continue;
    burnKcal += strengthKcalForCompletion(weight, r.exercise_id, num(r.sets));
    workoutCount += 1;
    workoutDates.add(r.for_date);
  }
  for (const r of cond) {
    if (!r.item_id || !inWin(r.for_date)) continue;
    const d = conditioningDefaults(r.item_id);
    burnKcal += estimateConditioningKcal(
      weight,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
    workoutCount += 1;
    workoutDates.add(r.for_date);
  }
  const intakeByDay = new Map<string, number>();
  for (const r of food) {
    if (!inWin(r.for_date)) continue;
    intakeByDay.set(r.for_date, (intakeByDay.get(r.for_date) ?? 0) + num(r.kcal));
  }
  const intakeDays = intakeByDay.size;
  const intakeSum = [...intakeByDay.values()].reduce((s, v) => s + v, 0);
  return {
    workoutDays: workoutDates.size,
    workoutCount,
    burnKcal,
    dietDays: intakeDays,
    intakeAvg: intakeDays > 0 ? intakeSum / intakeDays : 0,
    intakeDays,
  };
}

/** 내 다짐 목록 + 자동 진행률(기존 운동/식단 기록 집계). */
export async function getMyCommitments(): Promise<CommitmentView[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("commitments")
    .select("id, title, tag, metric, target, start_date, deadline")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("deadline", { ascending: true });

  const commitments = ((rows ?? []) as {
    id: string;
    title: string;
    tag: string;
    metric: string;
    target: number | string;
    start_date: string;
    deadline: string;
  }[]).filter((c) => isCommitmentMetric(c.metric));
  if (commitments.length === 0) return [];

  const today = seoulYmd();
  const minStart = commitments.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    commitments[0].start_date,
  );

  // ⚡ 체중은 요청 캐시된 getUserProfile() 에서 가져온다 — 홈·캘린더는 이미 프로필을
  //   조회 중이라 같은 Promise 를 받아 **왕복 0회**. (예전엔 여기서 profiles 를 또
  //   따로 조회해 한 화면에서 profiles 를 세 번(미들웨어·페이지·여기) 긁었다.)
  const [profile, { data: exRows }, { data: condRows }, { data: foodRows }] =
    await Promise.all([
      getUserProfile(),
      supabase
        .from("exercise_completions")
        .select("for_date, exercise_id, sets")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", minStart)
        .lte("for_date", today),
      supabase
        .from("conditioning_completions")
        .select("for_date, item_id, duration_min, speed")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", minStart)
        .lte("for_date", today),
      supabase
        .from("food_logs")
        .select("for_date, kcal")
        .eq("user_id", user.id)
        .gte("for_date", minStart)
        .lte("for_date", today),
    ]);

  const weight = num(profile?.weightKg) || 65;
  const ex = (exRows ?? []) as ExRow[];
  const cond = (condRows ?? []) as CondRow[];
  const food = (foodRows ?? []) as FoodRow[];

  return commitments.map((c) => {
    const metric = c.metric as CommitmentMetric;
    const target = num(c.target);
    const winTo = c.deadline < today ? c.deadline : today; // 데드라인 넘겼으면 그때까지만
    const agg = aggregateWindow(c.start_date, winTo, weight, ex, cond, food);
    const meta = metricMeta(metric);
    return {
      id: c.id,
      title: c.title,
      tag: c.tag,
      metric,
      target,
      startDate: c.start_date,
      deadline: c.deadline,
      progress: commitmentProgress(
        { metric, target, startDate: c.start_date, deadline: c.deadline },
        agg,
        today,
      ),
      metricLabel: meta.label,
      unit: meta.unit,
      kind: meta.kind,
    };
  });
}

export type DayMarker = { pct: number; marker: MarkerLevel };

/**
 * 설문 기반 다짐의 하루 미션 달성 마커(캘린더용). [from, min(to, today)] 각 날짜에 대해
 * 그날 활성 설문다짐들의 미션을 기록으로 자동 판정 → 70% ○ / 40% △ / 그미만 ✕.
 * 미션 없는(활성 설문다짐 없는) 날은 결과에 없음.
 */
/**
 * 날짜별 DayStats 집계 — 미션 자동 판정의 입력.
 *
 * 캘린더(한 달치)와 오늘 체크리스트(하루)가 **같은 판정을 써야** 하므로 한 곳에 둔다.
 * 따로 구현하면 '캘린더는 ○ 인데 오늘 화면은 미달성' 같은 어긋남이 생긴다.
 */
async function dayStatsRange(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  fromYmd: string,
  toYmd: string,
): Promise<Map<string, DayStats>> {
  const [profile, { data: exRows }, { data: condRows }, { data: foodRows }] =
    await Promise.all([
      getUserProfile(), // 요청 캐시 — 같은 화면에서 profiles 를 두 번 긁지 않는다.
      supabase
        .from("exercise_completions")
        .select("for_date, exercise_id, sets")
        .eq("user_id", userId)
        .eq("status", "done")
        .gte("for_date", fromYmd)
        .lte("for_date", toYmd),
      supabase
        .from("conditioning_completions")
        .select("for_date, item_id, duration_min, speed")
        .eq("user_id", userId)
        .eq("status", "done")
        .gte("for_date", fromYmd)
        .lte("for_date", toYmd),
      supabase
        .from("food_logs")
        .select("for_date, meal, kcal, protein_g")
        .eq("user_id", userId)
        .gte("for_date", fromYmd)
        .lte("for_date", toYmd),
    ]);

  const weight = num(profile?.weightKg) || 65;

  // 날짜별 DayStats 집계.
  const stats = new Map<string, DayStats>();
  const meals = new Map<string, Set<string>>();
  const get = (d: string): DayStats => {
    let s = stats.get(d);
    if (!s) {
      s = { ...EMPTY_DAY };
      stats.set(d, s);
    }
    return s;
  };

  for (const r of (exRows ?? []) as ExRow[]) {
    if (!r.exercise_id) continue;
    const s = get(r.for_date);
    s.workedOut = true;
    s.workoutCount += 1;
    s.burnKcal += strengthKcalForCompletion(weight, r.exercise_id, num(r.sets));
  }
  for (const r of (condRows ?? []) as CondRow[]) {
    if (!r.item_id) continue;
    const d = conditioningDefaults(r.item_id);
    const dur = r.duration_min ?? d.durationMin;
    const s = get(r.for_date);
    s.workedOut = true;
    s.workoutCount += 1;
    s.cardioMin += num(dur);
    s.burnKcal += estimateConditioningKcal(
      weight,
      r.item_id,
      dur,
      r.speed === null ? d.speed : num(r.speed),
    );
  }
  for (const r of (foodRows ?? []) as {
    for_date: string;
    meal: string | null;
    kcal: number | string;
    protein_g: number | string | null;
  }[]) {
    const s = get(r.for_date);
    s.loggedDiet = true;
    s.intakeKcal += num(r.kcal);
    s.proteinG += num(r.protein_g);
    if (r.meal) {
      let set = meals.get(r.for_date);
      if (!set) {
        set = new Set();
        meals.set(r.for_date, set);
      }
      set.add(r.meal);
    }
  }
  for (const [d, set] of meals) get(d).mealCount = set.size;
  return stats;
}

export async function getMissionCalendar(
  fromYmd: string,
  toYmd: string,
): Promise<Record<string, DayMarker>> {
  const user = await getCurrentUser();
  if (!user) return {};
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const to = toYmd < today ? toYmd : today; // 미래는 마커 없음
  if (to < fromYmd) return {};

  const { data: crows } = await supabase
    .from("commitments")
    .select("start_date, deadline, missions")
    .eq("user_id", user.id)
    .eq("archived", false)
    .eq("mode", "survey");

  const surveys = ((crows ?? []) as {
    start_date: string;
    deadline: string;
    missions: unknown;
  }[])
    .map((c) => ({
      startDate: c.start_date,
      deadline: c.deadline,
      missions: sanitizeMissions(c.missions),
    }))
    .filter((c) => c.missions.length > 0);
  if (surveys.length === 0) return {};

  const stats = await dayStatsRange(supabase, user.id, fromYmd, to);

  // 날짜별 마커.
  const out: Record<string, DayMarker> = {};
  const days = ymdDiff(fromYmd, to);
  for (let i = 0; i <= days; i++) {
    const d = addDaysYmd(fromYmd, i);
    const active = surveys.filter((s) => isActiveOn(s, d));
    if (active.length === 0) continue;
    const missions: MissionSpec[] = active.flatMap((s) => s.missions);
    const { pct } = achievementForDay(missions, stats.get(d) ?? EMPTY_DAY);
    const marker = markerForPct(pct, missions.length > 0);
    if (marker) out[d] = { pct, marker };
  }
  return out;
}

/** 캘린더 표시용 — 활성/예정 다짐의 기간(경량, 진행률 계산 없음). */
export async function getCommitmentBands(): Promise<
  { id: string; title: string; startDate: string; deadline: string; kind: "workout" | "diet" }[]
> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("commitments")
    .select("id, title, metric, start_date, deadline")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("deadline", { ascending: true });
  return ((data ?? []) as {
    id: string;
    title: string;
    metric: string;
    start_date: string;
    deadline: string;
  }[])
    .filter((c) => isCommitmentMetric(c.metric))
    .map((c) => ({
      id: c.id,
      title: c.title,
      startDate: c.start_date,
      deadline: c.deadline,
      kind: metricMeta(c.metric as CommitmentMetric).kind,
    }));
}

/* ── 오늘 체크리스트 ─────────────────────────────────────────────────── */

export type TodayMission = {
  id: string;
  label: string;
  why: string | null;
  /** 앱이 판정하는가(자동) 아니면 사용자가 체크하는가(수동). */
  manual: boolean;
  done: boolean;
};

export type TodayCommitment = {
  id: string;
  title: string;
  /** 이번 주 며칠 달성이 목표인지. */
  weeklyTarget: number;
  missions: TodayMission[];
  done: number;
  total: number;
};

/**
 * 오늘 지킬 다짐 — 자동 미션은 오늘 기록으로, 수동 미션은 체크 여부로 판정한다.
 *
 * 캘린더와 **같은 집계**(`dayStatsRange`)를 쓴다. 따로 계산하면 "캘린더는 ○ 인데
 * 오늘 화면은 미달성" 처럼 화면마다 다른 말을 하게 된다.
 */
export async function getTodayChecklist(): Promise<TodayCommitment[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();

  const [{ data: crows }, { data: drows }, stats] = await Promise.all([
    supabase
      .from("commitments")
      .select("id, title, missions, weekly_target, start_date, deadline")
      .eq("user_id", user.id)
      .eq("archived", false)
      .eq("mode", "survey")
      .lte("start_date", today)
      .gte("deadline", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("commitment_days")
      .select("commitment_id, checked_ids")
      .eq("user_id", user.id)
      .eq("for_date", today),
    dayStatsRange(supabase, user.id, today, today),
  ]);

  const checkedBy = new Map<string, Set<string>>();
  for (const r of (drows ?? []) as {
    commitment_id: string;
    checked_ids: unknown;
  }[]) {
    const ids = Array.isArray(r.checked_ids)
      ? (r.checked_ids as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    checkedBy.set(r.commitment_id, new Set(ids));
  }

  const day = stats.get(today) ?? EMPTY_DAY;
  const out: TodayCommitment[] = [];
  for (const c of (crows ?? []) as {
    id: string;
    title: string;
    missions: unknown;
    weekly_target: number | null;
  }[]) {
    const missions = sanitizeMissions(c.missions);
    if (missions.length === 0) continue;
    const checked = checkedBy.get(c.id) ?? new Set<string>();
    const rows: TodayMission[] = missions.map((m) => {
      const manual = m.type === "manual_check";
      return {
        id: m.id ?? "",
        label: missionLabel(m),
        why: m.why ?? null,
        manual,
        done: manual
          ? !!m.id && checked.has(m.id)
          : MISSION_CATALOG[m.type].check(day, m.target),
      };
    });
    out.push({
      id: c.id,
      title: c.title,
      weeklyTarget: c.weekly_target ?? 5,
      missions: rows,
      done: rows.filter((r) => r.done).length,
      total: rows.length,
    });
  }
  return out;
}
