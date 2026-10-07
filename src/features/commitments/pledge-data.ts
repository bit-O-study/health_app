import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { ageOf } from "@/features/profile/survey-extra";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan, type PlanId } from "@/features/billing/plans";
import { cardioDoneKcal, strengthDoneKcal, weightOrDefault, type CardioDone, type StrengthDone } from "@/features/routine/burn";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { bodyPartsFor } from "@/features/routine/exercise-body-parts";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import { seoulYmd } from "@/features/routine/data";
import { sanitizePledge, pledgeLines, type PledgeSpec } from "@/features/commitments/pledge";
import {
  EMPTY_PLEDGE_DAY,
  addDays,
  dayDiff,
  evaluatePledge,
  failReasons,
  pledgeBlocks,
  pledgeEndDate,
  type PledgeDay,
  type PledgeEval,
} from "@/features/commitments/evaluation";
import { WEIGHT_AVG_DAYS, averageWeight, dataQuality } from "@/features/commitments/quality";
import {
  calibrationFrom,
  missingBodyFields,
  observedMetabolicFactor,
  type BodyInput,
  type Calibration,
  type InbodyInput,
} from "@/features/commitments/prediction";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const sum2 = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b);

type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/* ── 몸 정보 ─────────────────────────────────────────────────────────── */

export type BodyContext = {
  body: BodyInput | null;
  /** 다짐을 만들려면 채워야 하는 값. 비면 만들 수 있다. */
  missing: ReturnType<typeof missingBodyFields>;
  /** 화면 표시용 — 어디서 온 값인지. */
  source: {
    heightCm: number | null;
    weightKg: number | null;
    weightFrom: "weight_avg7" | "weight_log" | "inbody" | "profile" | null;
    /** 최근 7일 체중 기록 수(평균에 쓴 점 수). */
    weightPoints: number;
    inbodyDate: string | null;
  };
  calibration: Calibration | null;
  plan: PlanId;
};

/** 최근 InBody(직접 입력 포함) 1건. */
async function latestInbody(supabase: Supa, userId: string): Promise<InbodyInput | null> {
  const { data } = await supabase
    .from("body_compositions")
    .select(
      "measured_at, weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct, muscle_right_arm, muscle_left_arm, muscle_trunk, muscle_right_leg, muscle_left_leg",
    )
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, number | string | null>;
  return {
    measuredAt: String(r.measured_at),
    weightKg: num(r.weight_kg),
    bodyFatKg: num(r.body_fat_kg),
    bodyFatPct: num(r.body_fat_pct),
    skeletalMuscleKg: num(r.skeletal_muscle_kg),
    armsKg: sum2(num(r.muscle_right_arm), num(r.muscle_left_arm)),
    trunkKg: num(r.muscle_trunk),
    legsKg: sum2(num(r.muscle_right_leg), num(r.muscle_left_leg)),
  };
}

/**
 * 다짐 계산에 쓰는 내 몸 — 키(프로필), 체중(최근 체중 기록 > InBody > 프로필),
 * InBody(체지방·골격근·부위), 개인 대사 보정(최근 28일 기록), 지난 다짐 보정.
 */
export const getBodyContext = cache(async (): Promise<BodyContext> => {
  const user = await getCurrentUser();
  const empty: BodyContext = {
    body: null,
    missing: ["height", "weight", "bodyFat", "skeletalMuscle"],
    source: { heightCm: null, weightKg: null, weightFrom: null, weightPoints: 0, inbodyDate: null },
    calibration: null,
    plan: "free",
  };
  if (!user) return empty;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from28 = addDays(today, -28);

  const [profile, plan, inbody, { data: wRows }, { data: foodRows }, { data: outRows }] =
    await Promise.all([
      getUserProfile(),
      resolvePlan(),
      latestInbody(supabase, user.id),
      supabase
        .from("weight_logs")
        .select("weight_kg, body_fat_pct, created_at")
        .eq("user_id", user.id)
        .not("weight_kg", "is", null)
        .gte("created_at", `${from28}T00:00:00+09:00`)
        .order("created_at", { ascending: true }),
      supabase
        .from("food_logs")
        .select("for_date, kcal")
        .eq("user_id", user.id)
        .gte("for_date", from28)
        .lt("for_date", today),
      supabase
        .from("commitment_outcomes")
        .select("predicted_weight_change_kg, actual_weight_change_kg, predicted_muscle_change_kg, actual_muscle_change_kg")
        .eq("user_id", user.id)
        .not("finalized_at", "is", null),
    ]);
  if (!profile) return { ...empty, plan };

  const weights = ((wRows ?? []) as { weight_kg: number | string; created_at: string }[])
    .map((r) => ({ kg: num(r.weight_kg)!, at: r.created_at }))
    .filter((r) => r.kg > 0);
  // 최근 체중 기록이 28일 안에 없으면 전체에서 마지막 하나.
  let latestLogKg = weights.at(-1)?.kg ?? null;
  if (latestLogKg === null) {
    const { data } = await supabase
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestLogKg = num((data as { weight_kg: number | string } | null)?.weight_kg);
  }
  // 시작 체중은 **최근 7일 평균**(기록 2번 이상일 때) — 하루 수분 변동(±1~2kg)을 줄인다.
  // 끝날 때도 같은 방식으로 재야 시작·끝을 비교할 수 있다(finalizeOutcome).
  const last7 = weights.filter((w) => Date.parse(w.at) >= Date.parse(`${addDays(today, -WEIGHT_AVG_DAYS)}T00:00:00+09:00`));
  const avg7 = last7.length >= 2 ? averageWeight(last7.map((w) => w.kg)) : null;
  const weightKg = avg7 ?? latestLogKg ?? inbody?.weightKg ?? profile.weightKg ?? null;
  const weightFrom =
    avg7 !== null ? "weight_avg7" : latestLogKg !== null ? "weight_log" : inbody?.weightKg ? "inbody" : profile.weightKg ? "profile" : null;
  const heightCm = profile.heightCm ?? null;
  const missing = missingBodyFields({ heightCm, weightKg, inbody });

  const calibration = calibrationFrom(
    ((outRows ?? []) as Record<string, number | string | null>[]).flatMap((r) => [
      { kind: "weight" as const, predicted: num(r.predicted_weight_change_kg), actual: num(r.actual_weight_change_kg) },
      { kind: "muscle" as const, predicted: num(r.predicted_muscle_change_kg), actual: num(r.actual_muscle_change_kg) },
    ]),
  );

  if (!weightKg) {
    return { ...empty, missing, plan, source: { heightCm, weightKg, weightFrom, weightPoints: last7.length, inbodyDate: inbody?.measuredAt ?? null } };
  }

  const body: BodyInput = {
    gender: profile.gender === "female" ? "female" : "male",
    age: ageOf(profile.ageGroup) ?? 30,
    heightCm,
    weightKg,
    bodyFatPct: profile.bodyFatPct ?? null,
    experience: profile.experience,
    inbody,
  };

  // 개인 대사 보정 — 최근 28일 식단 기록 + 체중 두 점.
  const intakeByDay = new Map<string, number>();
  for (const r of (foodRows ?? []) as { for_date: string; kcal: number | string }[]) {
    intakeByDay.set(r.for_date, (intakeByDay.get(r.for_date) ?? 0) + (num(r.kcal) ?? 0));
  }
  if (weights.length >= 2 && intakeByDay.size >= 14) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const span = Math.round((Date.parse(last.at) - Date.parse(first.at)) / 86_400_000);
    const exercise = await avgExerciseKcal(supabase, user.id, from28, today, weightKg);
    body.metabolicFactor = observedMetabolicFactor({
      body,
      avgIntakeKcal: [...intakeByDay.values()].reduce((s, v) => s + v, 0) / intakeByDay.size,
      loggedDays: intakeByDay.size,
      weightChangeKg: last.kg - first.kg,
      spanDays: span,
      avgExerciseKcal: exercise,
    });
  }

  return {
    body,
    missing,
    source: { heightCm, weightKg, weightFrom, weightPoints: last7.length, inbodyDate: inbody?.measuredAt ?? null },
    calibration: calibration.samples > 0 ? calibration : null,
    plan,
  };
});

async function avgExerciseKcal(supabase: Supa, userId: string, from: string, to: string, weight: number): Promise<number> {
  const [{ data: ex }, { data: cond }] = await Promise.all([
    supabase.from("exercise_completions").select("exercise_id, sets").eq("user_id", userId).eq("status", "done").gte("for_date", from).lt("for_date", to),
    supabase.from("conditioning_completions").select("item_id, duration_min, speed, incline").eq("user_id", userId).eq("status", "done").gte("for_date", from).lt("for_date", to),
  ]);
  let kcal = 0;
  for (const r of (ex ?? []) as StrengthDone[]) kcal += strengthDoneKcal(weight, r);
  for (const r of (cond ?? []) as CardioDone[]) kcal += cardioDoneKcal(weight, r);
  return kcal / Math.max(1, dayDiff(from, to));
}

export function canReverse(plan: PlanId): boolean {
  return hasPlan(plan, "lite");
}

/* ── 하루 기록 ──────────────────────────────────────────────────────── */

type Stamped<T> = T & { created_at: string };
type RawDays = {
  ex: Stamped<{ for_date: string; exercise_id: string | null; sets: number | null }>[];
  cond: Stamped<{ for_date: string; item_id: string | null; duration_min: number | null; speed: number | string | null; incline: number | string | null }>[];
  food: Stamped<{ for_date: string; meal: string | null; kcal: number | string; protein_g: number | string | null; photo_url: string | null }>[];
  steps: { for_date: string; steps: number }[];
  weight: number;
};

async function loadRawDays(supabase: Supa, userId: string, from: string, to: string, weight: number): Promise<RawDays> {
  const [{ data: ex }, { data: cond }, { data: food }, { data: steps }] = await Promise.all([
    supabase.from("exercise_completions").select("for_date, exercise_id, sets, created_at").eq("user_id", userId).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("conditioning_completions").select("for_date, item_id, duration_min, speed, incline, created_at").eq("user_id", userId).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("food_logs").select("for_date, meal, kcal, protein_g, photo_url, created_at").eq("user_id", userId).gte("for_date", from).lte("for_date", to),
    supabase.from("daily_steps").select("for_date, steps").eq("user_id", userId).gte("for_date", from).lte("for_date", to),
  ]);
  return {
    ex: (ex ?? []) as RawDays["ex"],
    cond: (cond ?? []) as RawDays["cond"],
    food: (food ?? []) as RawDays["food"],
    steps: (steps ?? []) as RawDays["steps"],
    weight,
  };
}

/**
 * 날짜 → 하루 기록. `cutoffFor(d)` 이후에 **올린** 기록은 세지 않는다 — 구간 판정이
 * 끝난 뒤 지난 날짜를 채워서 결과를 뒤집지 못하게(판정 시각 = 구간 끝 다음날 00:00 KST).
 */
export function dayOfFromRaw(raw: RawDays, cutoffFor: (ymd: string) => string | null): (ymd: string) => PledgeDay {
  const memo = new Map<string, PledgeDay>();
  const ok = (d: string, created: string) => {
    const c = cutoffFor(d);
    return c === null || Date.parse(created) < Date.parse(`${c}T00:00:00+09:00`);
  };
  return (d: string) => {
    const hit = memo.get(d);
    if (hit) return hit;
    const day: PledgeDay = { ...EMPTY_PLEDGE_DAY, strengthParts: [] };
    const parts = new Set<string>();
    for (const r of raw.ex) {
      if (r.for_date !== d || !r.exercise_id || !ok(d, r.created_at)) continue;
      day.workedOut = true;
      day.strength = true;
      day.burnKcal += strengthDoneKcal(raw.weight, r);
      for (const p of bodyPartsFor(r.exercise_id)) parts.add(p);
    }
    for (const r of raw.cond) {
      if (r.for_date !== d || !r.item_id || !ok(d, r.created_at)) continue;
      const def = conditioningDefaults(r.item_id);
      const dur = r.duration_min ?? def.durationMin;
      day.workedOut = true;
      day.cardioMin += dur ?? 0;
      day.burnKcal += cardioDoneKcal(raw.weight, r);
    }
    const meals = new Set<string>();
    for (const r of raw.food) {
      if (r.for_date !== d || !ok(d, r.created_at)) continue;
      day.intakeKcal += num(r.kcal) ?? 0;
      day.proteinG += num(r.protein_g) ?? 0;
      if (r.meal) meals.add(r.meal);
    }
    day.mealCount = meals.size;
    day.steps = raw.steps.find((s) => s.for_date === d)?.steps ?? 0;
    day.strengthParts = [...parts] as PledgeDay["strengthParts"];
    memo.set(d, day);
    return day;
  };
}

/* ── 다짐 목록 ──────────────────────────────────────────────────────── */

export type PledgeView = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  spec: PledgeSpec;
  lines: string[];
  eval: PledgeEval;
  /** 1부터. 진행 중 구간 번호(끝났으면 마지막 구간). */
  week: number;
  totalWeeks: number;
  /** 저장된 예상(생성 시점). */
  predicted: { weightKg: number | null; fatKg: number | null; muscleKg: number | null } | null;
  direction: "forward" | "reverse";
  sharedGroupIds: string[];
  /** 시작 전이면 항목·수치도 편집할 수 있다. */
  editableSpec: boolean;
};

export const partLabel = (p: keyof typeof BODY_PART_LABEL) => BODY_PART_LABEL[p];

/**
 * 내 행동 다짐 목록 + 판정. 판정이 바뀐(실패·성공) 다짐은 결과 테이블과 그룹 공유에
 * **이 자리에서 확정 저장**한다(크론 없이 — 앱을 열 때 늦게라도 확정). 한 번 확정된
 * 상태는 다시 계산하지 않는다.
 */
export const getMyPledges = cache(async (): Promise<PledgeView[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();

  const [{ data: rows }, { data: outs }, { data: shares }, ctx] = await Promise.all([
    supabase
      .from("commitments")
      .select("id, title, start_date, deadline, pledge, created_at")
      .eq("user_id", user.id)
      .eq("mode", "pledge")
      .eq("archived", false)
      .order("start_date", { ascending: false }),
    supabase
      .from("commitment_outcomes")
      .select("commitment_id, status, failed_reason, failed_at, failed_block, direction, predicted_weight_change_kg, predicted_fat_change_kg, predicted_muscle_change_kg, baseline, finalized_at")
      .eq("user_id", user.id),
    supabase.from("commitment_shares").select("commitment_id, group_id, status, week").eq("user_id", user.id),
    getBodyContext(),
  ]);

  const list = ((rows ?? []) as { id: string; title: string; start_date: string; deadline: string; pledge: unknown }[])
    .map((r) => ({ ...r, spec: sanitizePledge(r.pledge) }))
    .filter((r): r is typeof r & { spec: PledgeSpec } => r.spec !== null);
  if (list.length === 0) return [];

  const outBy = new Map(
    ((outs ?? []) as Record<string, unknown>[]).map((o) => [String(o.commitment_id), o]),
  );
  const shareBy = new Map<string, { group_id: string; status: string; week: number }[]>();
  for (const s of (shares ?? []) as { commitment_id: string; group_id: string; status: string; week: number }[]) {
    shareBy.set(s.commitment_id, [...(shareBy.get(s.commitment_id) ?? []), s]);
  }

  const minStart = list.reduce((m, r) => (r.start_date < m ? r.start_date : m), list[0].start_date);
  const maxEnd = list.reduce((m, r) => (r.deadline > m ? r.deadline : m), list[0].deadline);
  const raw = await loadRawDays(supabase, user.id, minStart, maxEnd < today ? maxEnd : today, weightOrDefault(ctx.body?.weightKg));

  const views: PledgeView[] = [];
  for (const r of list) {
    const blocks = pledgeBlocks(r.start_date, r.spec.days);
    const cutoffFor = (d: string) => {
      const b = blocks.find((x) => x.start <= d && d <= x.end);
      return b ? addDays(b.end, 1) : null;
    };
    const ev = evaluatePledge(r.spec, r.start_date, dayOfFromRaw(raw, cutoffFor), today);
    const out = outBy.get(r.id);
    const lockedStatus = out?.finalized_at ? (out.status as "success" | "failed") : null;
    const status = lockedStatus ?? ev.status;
    const evFinal: PledgeEval = lockedStatus ? { ...ev, status: lockedStatus } : ev;
    const weekIdx = ev.current?.index ?? (ev.failedBlock?.index ?? blocks.length - 1);

    // 상태가 새로 확정됐으면 결과 테이블·공유에 저장.
    if (!lockedStatus && (ev.status === "failed" || ev.status === "success") && out) {
      await finalizeOutcome(supabase, user.id, r.id, r.spec, r.start_date, ev, raw, out);
    }
    const shared = shareBy.get(r.id) ?? [];
    const shareStatus = status === "upcoming" ? "upcoming" : status;
    if (shared.some((s) => s.status !== shareStatus || s.week !== weekIdx + 1)) {
      await supabase
        .from("commitment_shares")
        .update({ status: shareStatus, week: weekIdx + 1 })
        .eq("commitment_id", r.id)
        .eq("user_id", user.id);
    }

    views.push({
      id: r.id,
      title: r.title,
      startDate: r.start_date,
      endDate: pledgeEndDate(r.start_date, r.spec.days),
      spec: r.spec,
      lines: pledgeLines(r.spec, partLabel),
      eval: evFinal,
      week: weekIdx + 1,
      totalWeeks: blocks.length,
      predicted: out
        ? {
            weightKg: num(out.predicted_weight_change_kg as number | null),
            fatKg: num(out.predicted_fat_change_kg as number | null),
            muscleKg: num(out.predicted_muscle_change_kg as number | null),
          }
        : null,
      direction: (out?.direction as "forward" | "reverse") ?? "forward",
      sharedGroupIds: shared.map((s) => s.group_id),
      editableSpec: today < r.start_date,
    });
  }
  return views;
});

/**
 * 결과 확정 — 상태·실패 사유·실천 기록(adherence)·종료 실측·신뢰도(data_quality).
 *
 * 종료 체중은 **마지막 7일 체중 기록 평균**(2번 이상). 없으면 종료일 ±3일 중 가장 가까운 한 번.
 * 근육은 종료일 ±3일 인바디. 학습에 쓸지는 `data_quality.usableFor*` 가 정한다.
 */
async function finalizeOutcome(
  supabase: Supa,
  userId: string,
  commitmentId: string,
  spec: PledgeSpec,
  startDate: string,
  ev: PledgeEval,
  raw: RawDays,
  out: Record<string, unknown>,
) {
  const dayOf = dayOfFromRaw(raw, () => null);
  const endSeen = ev.status === "failed" ? ev.failedBlock!.end : ev.endDate;
  const n = dayDiff(startDate, endSeen) + 1;
  const dates = Array.from({ length: n }, (_, i) => addDays(startDate, i));
  const days = dates.map(dayOf);
  const fed = days.filter((d) => d.mealCount > 0);
  const partCounts: Record<string, number> = {};
  for (const d of days) for (const p of d.strengthParts) partCounts[p] = (partCounts[p] ?? 0) + 1;
  const mealNeed = spec.mealsPerDay ?? 1;
  const adherence = {
    days: n,
    workoutDays: days.filter((d) => d.workedOut).length,
    burnDaysMet: spec.burnKcal ? days.filter((d) => d.burnKcal >= spec.burnKcal!).length : null,
    mealDaysMet: days.filter((d) => d.mealCount >= mealNeed).length,
    avgIntakeKcal: fed.length ? Math.round(fed.reduce((s, d) => s + d.intakeKcal, 0) / fed.length) : null,
    avgProteinG: fed.length ? Math.round(fed.reduce((s, d) => s + d.proteinG, 0) / fed.length) : null,
    avgBurnKcal: Math.round(days.reduce((s, d) => s + d.burnKcal, 0) / n),
    strengthDays: days.filter((d) => d.strength).length,
    strengthParts: partCounts,
    cardioMin: Math.round(days.reduce((s, d) => s + d.cardioMin, 0)),
    avgSteps: Math.round(days.reduce((s, d) => s + d.steps, 0) / n),
  };

  const patch: Record<string, unknown> = {
    status: ev.status,
    adherence,
    finalized_at: new Date().toISOString(),
  };
  if (ev.status === "failed") {
    patch.failed_reason = failReasons(ev.failedBlock!);
    patch.failed_at = ev.failedBlock!.checkAt;
    patch.failed_block = ev.failedBlock!.index + 1;
  }

  const base = (out.baseline ?? {}) as {
    weightKg?: number;
    weightPoints?: number;
    skeletalMuscleKg?: number | null;
    bmr?: number;
    inbody?: { measuredAt?: string } | null;
  };
  const [measure, photoMeals, skippedMeals] = await Promise.all([
    measureEnd(supabase, userId, endSeen),
    countPhotoMeals(supabase, userId, startDate, endSeen, raw),
    supabase
      .from("meal_skips")
      .select("meal", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("for_date", startDate)
      .lte("for_date", endSeen)
      .then((r) => r.count ?? 0),
  ]);
  if (measure.weightKg !== null || measure.skeletalMuscleKg !== null) {
    patch.end_measure = measure;
    if (measure.weightKg !== null && typeof base.weightKg === "number") {
      patch.actual_weight_change_kg = Math.round((measure.weightKg - base.weightKg) * 100) / 100;
    }
    if (measure.skeletalMuscleKg !== null && typeof base.skeletalMuscleKg === "number") {
      patch.actual_muscle_change_kg = Math.round((measure.skeletalMuscleKg - base.skeletalMuscleKg) * 100) / 100;
    }
  }
  patch.data_quality = dataQuality({
    days: n,
    mealsPerDay: spec.mealsPerDay ?? null,
    mealDaysMet: adherence.mealDaysMet,
    loggedMeals: days.reduce((s, d) => s + d.mealCount, 0),
    photoMeals,
    skippedMeals,
    avgIntakeKcal: adherence.avgIntakeKcal,
    bmr: base.bmr ?? 0,
    startWeightPoints: base.weightPoints ?? 0,
    endWeightPoints: measure.weightPoints,
    inbodyStart: base.inbody?.measuredAt ?? null,
    inbodyEnd: measure.inbodyDate,
  });
  await supabase.from("commitment_outcomes").update(patch).eq("commitment_id", commitmentId).eq("user_id", userId);
}

/** 사진이 붙은 끼니 칸 수 — 음식 사진(food_logs.photo_url) 또는 끼니 사진(meal_photos). */
async function countPhotoMeals(supabase: Supa, userId: string, from: string, to: string, raw: RawDays): Promise<number> {
  const slots = new Set<string>();
  for (const r of raw.food) {
    if (r.photo_url && r.for_date >= from && r.for_date <= to && r.meal) slots.add(`${r.for_date}:${r.meal}`);
  }
  const { data } = await supabase
    .from("meal_photos")
    .select("for_date, meal")
    .eq("user_id", userId)
    .gte("for_date", from)
    .lte("for_date", to);
  for (const r of (data ?? []) as { for_date: string; meal: string }[]) slots.add(`${r.for_date}:${r.meal}`);
  return slots.size;
}

export type EndMeasure = {
  weightKg: number | null;
  /** 평균에 쓴 체중 기록 수(0 이면 평균 아님). */
  weightPoints: number;
  weightMethod: "avg7" | "nearest" | "inbody" | null;
  skeletalMuscleKg: number | null;
  bodyFatPct: number | null;
  inbodyDate: string | null;
};

/**
 * 종료 실측 — 체중은 마지막 7일 기록 평균(2번 이상), 아니면 종료일 ±3일 중 가장 가까운 한 번,
 * 그것도 없으면 인바디 체중. 근육·체지방은 종료일 ±3일 인바디.
 */
async function measureEnd(supabase: Supa, userId: string, endYmd: string): Promise<EndMeasure> {
  const from7 = addDays(endYmd, -(WEIGHT_AVG_DAYS - 1));
  const from = addDays(endYmd, -3);
  const to = addDays(endYmd, 3);
  const [{ data: ib }, { data: wl }] = await Promise.all([
    supabase
      .from("body_compositions")
      .select("measured_at, weight_kg, skeletal_muscle_kg, body_fat_pct")
      .eq("user_id", userId)
      .gte("measured_at", from)
      .lte("measured_at", to),
    supabase
      .from("weight_logs")
      .select("created_at, weight_kg")
      .eq("user_id", userId)
      .not("weight_kg", "is", null)
      .gte("created_at", `${from7 < from ? from7 : from}T00:00:00+09:00`)
      .lte("created_at", `${to}T23:59:59+09:00`),
  ]);
  const dist = (d: string) => Math.abs(dayDiff(endYmd, d));
  const ibBest = ((ib ?? []) as Record<string, string | number | null>[])
    .map((r) => ({
      date: String(r.measured_at),
      weightKg: num(r.weight_kg),
      skeletalMuscleKg: num(r.skeletal_muscle_kg),
      bodyFatPct: num(r.body_fat_pct),
    }))
    .sort((a, b) => dist(a.date) - dist(b.date))[0];
  const logs = ((wl ?? []) as { created_at: string; weight_kg: number | string }[]).map((r) => ({
    date: seoulYmd(new Date(r.created_at)),
    kg: num(r.weight_kg) ?? 0,
  }));
  const last7 = logs.filter((l) => l.date >= from7 && l.date <= endYmd);
  const avg = last7.length >= 2 ? averageWeight(last7.map((l) => l.kg)) : null;
  const nearest = logs.filter((l) => l.date >= from).sort((a, b) => dist(a.date) - dist(b.date))[0];

  let weightKg: number | null = null;
  let weightMethod: EndMeasure["weightMethod"] = null;
  if (avg !== null) {
    weightKg = avg;
    weightMethod = "avg7";
  } else if (nearest) {
    weightKg = nearest.kg;
    weightMethod = "nearest";
  } else if (ibBest?.weightKg) {
    weightKg = ibBest.weightKg;
    weightMethod = "inbody";
  }
  return {
    weightKg,
    weightPoints: last7.length,
    weightMethod,
    skeletalMuscleKg: ibBest?.skeletalMuscleKg ?? null,
    bodyFatPct: ibBest?.bodyFatPct ?? null,
    inbodyDate: ibBest?.date ?? null,
  };
}

/* ── 그룹별 다짐 ────────────────────────────────────────────────────── */

export type GroupPledge = {
  id: string;
  userId: string;
  name: string;
  mine: boolean;
  title: string;
  lines: string[];
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "success" | "failed";
  week: number;
};

/** 그룹들에 공유된 다짐(멤버 이름 포함). RLS 가 내 그룹 것만 보여 준다. */
export async function getGroupPledges(groupIds: string[]): Promise<Record<string, GroupPledge[]>> {
  const user = await getCurrentUser();
  if (!user || groupIds.length === 0) return {};
  const supabase = await createSupabaseServerClient();
  const [{ data: shares }, { data: members }] = await Promise.all([
    supabase
      .from("commitment_shares")
      .select("id, group_id, user_id, title, lines, start_date, end_date, status, week")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id, user_id, display_name").in("group_id", groupIds),
  ]);
  const nameOf = new Map<string, string>();
  for (const m of (members ?? []) as { group_id: string; user_id: string; display_name: string | null }[]) {
    nameOf.set(`${m.group_id}:${m.user_id}`, m.display_name || "멤버");
  }
  const out: Record<string, GroupPledge[]> = {};
  for (const s of (shares ?? []) as Record<string, unknown>[]) {
    const gid = String(s.group_id);
    const uid = String(s.user_id);
    (out[gid] ??= []).push({
      id: String(s.id),
      userId: uid,
      name: uid === user.id ? "나" : nameOf.get(`${gid}:${uid}`) ?? "멤버",
      mine: uid === user.id,
      title: String(s.title),
      lines: Array.isArray(s.lines) ? (s.lines as unknown[]).map(String) : [],
      startDate: String(s.start_date),
      endDate: String(s.end_date),
      status: s.status as GroupPledge["status"],
      week: Number(s.week) || 1,
    });
  }
  return out;
}

/** 오늘 이전 날짜 중 끼니 '안 먹었어요' 체크 — 식단 화면 표시용. */
export async function getMealSkips(forDate: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("meal_skips").select("meal").eq("user_id", user.id).eq("for_date", forDate);
  return ((data ?? []) as { meal: string }[]).map((r) => r.meal);
}
