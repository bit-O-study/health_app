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
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
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
    weightFrom: "weight_log" | "inbody" | "profile" | null;
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
    source: { heightCm: null, weightKg: null, weightFrom: null, inbodyDate: null },
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
  const weightKg = latestLogKg ?? inbody?.weightKg ?? profile.weightKg ?? null;
  const weightFrom = latestLogKg !== null ? "weight_log" : inbody?.weightKg ? "inbody" : profile.weightKg ? "profile" : null;
  const heightCm = profile.heightCm ?? null;
  const missing = missingBodyFields({ heightCm, weightKg, inbody });

  const calibration = calibrationFrom(
    ((outRows ?? []) as Record<string, number | string | null>[]).flatMap((r) => [
      { kind: "weight" as const, predicted: num(r.predicted_weight_change_kg), actual: num(r.actual_weight_change_kg) },
      { kind: "muscle" as const, predicted: num(r.predicted_muscle_change_kg), actual: num(r.actual_muscle_change_kg) },
    ]),
  );

  if (!weightKg) {
    return { ...empty, missing, plan, source: { heightCm, weightKg, weightFrom, inbodyDate: inbody?.measuredAt ?? null } };
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
    source: { heightCm, weightKg, weightFrom, inbodyDate: inbody?.measuredAt ?? null },
    calibration: calibration.samples > 0 ? calibration : null,
    plan,
  };
});

async function avgExerciseKcal(supabase: Supa, userId: string, from: string, to: string, weight: number): Promise<number> {
  const [{ data: ex }, { data: cond }] = await Promise.all([
    supabase.from("exercise_completions").select("exercise_id, sets").eq("user_id", userId).eq("status", "done").gte("for_date", from).lt("for_date", to),
    supabase.from("conditioning_completions").select("item_id, duration_min, speed").eq("user_id", userId).eq("status", "done").gte("for_date", from).lt("for_date", to),
  ]);
  let kcal = 0;
  for (const r of (ex ?? []) as { exercise_id: string | null; sets: number | null }[]) {
    if (r.exercise_id) kcal += strengthKcalForCompletion(weight, r.exercise_id, r.sets ?? 0);
  }
  for (const r of (cond ?? []) as { item_id: string | null; duration_min: number | null; speed: number | string | null }[]) {
    if (!r.item_id) continue;
    const d = conditioningDefaults(r.item_id);
    kcal += estimateConditioningKcal(weight, r.item_id, r.duration_min ?? d.durationMin, r.speed === null ? d.speed : num(r.speed) ?? d.speed);
  }
  return kcal / Math.max(1, dayDiff(from, to));
}

export function canReverse(plan: PlanId): boolean {
  return hasPlan(plan, "lite");
}

/* ── 하루 기록 ──────────────────────────────────────────────────────── */

type Stamped<T> = T & { created_at: string };
type RawDays = {
  ex: Stamped<{ for_date: string; exercise_id: string | null; sets: number | null }>[];
  cond: Stamped<{ for_date: string; item_id: string | null; duration_min: number | null; speed: number | string | null }>[];
  food: Stamped<{ for_date: string; meal: string | null; kcal: number | string; protein_g: number | string | null }>[];
  steps: { for_date: string; steps: number }[];
  weight: number;
};

async function loadRawDays(supabase: Supa, userId: string, from: string, to: string, weight: number): Promise<RawDays> {
  const [{ data: ex }, { data: cond }, { data: food }, { data: steps }] = await Promise.all([
    supabase.from("exercise_completions").select("for_date, exercise_id, sets, created_at").eq("user_id", userId).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("conditioning_completions").select("for_date, item_id, duration_min, speed, created_at").eq("user_id", userId).eq("status", "done").gte("for_date", from).lte("for_date", to),
    supabase.from("food_logs").select("for_date, meal, kcal, protein_g, created_at").eq("user_id", userId).gte("for_date", from).lte("for_date", to),
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
      day.burnKcal += strengthKcalForCompletion(raw.weight, r.exercise_id, r.sets ?? 0);
      for (const p of bodyPartsFor(r.exercise_id)) parts.add(p);
    }
    for (const r of raw.cond) {
      if (r.for_date !== d || !r.item_id || !ok(d, r.created_at)) continue;
      const def = conditioningDefaults(r.item_id);
      const dur = r.duration_min ?? def.durationMin;
      day.workedOut = true;
      day.cardioMin += dur ?? 0;
      day.burnKcal += estimateConditioningKcal(raw.weight, r.item_id, dur, r.speed === null ? def.speed : num(r.speed) ?? def.speed);
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
  const raw = await loadRawDays(supabase, user.id, minStart, maxEnd < today ? maxEnd : today, ctx.body?.weightKg ?? 65);

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
 * 결과 확정 — 상태·실패 사유·실천 기록(adherence)·종료 실측(성공 시, 종료일 ±3일 체중·InBody).
 * 실측이 없으면 비워 두고 학습에서 뺀다.
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
  const days = Array.from({ length: n }, (_, i) => dayOf(addDays(startDate, i)));
  const fed = days.filter((d) => d.mealCount > 0);
  const partCounts: Record<string, number> = {};
  for (const d of days) for (const p of d.strengthParts) partCounts[p] = (partCounts[p] ?? 0) + 1;
  const adherence = {
    days: n,
    workoutDays: days.filter((d) => d.workedOut).length,
    burnDaysMet: spec.burnKcal ? days.filter((d) => d.burnKcal >= spec.burnKcal!).length : null,
    mealDaysMet: spec.mealsPerDay ? days.filter((d) => d.mealCount >= spec.mealsPerDay!).length : null,
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
  const measure = await measureNear(supabase, userId, ev.status === "failed" ? ev.failedBlock!.checkAt : ev.endDate);
  if (measure) {
    patch.end_measure = measure;
    const base = (out.baseline ?? {}) as { weightKg?: number; skeletalMuscleKg?: number | null };
    if (measure.weightKg !== null && typeof base.weightKg === "number") {
      patch.actual_weight_change_kg = Math.round((measure.weightKg - base.weightKg) * 100) / 100;
    }
    if (measure.skeletalMuscleKg !== null && typeof base.skeletalMuscleKg === "number") {
      patch.actual_muscle_change_kg = Math.round((measure.skeletalMuscleKg - base.skeletalMuscleKg) * 100) / 100;
    }
  }
  await supabase.from("commitment_outcomes").update(patch).eq("commitment_id", commitmentId).eq("user_id", userId);
}

/** 기준일 ±3일 안의 체중 기록·InBody 중 가장 가까운 것. */
async function measureNear(
  supabase: Supa,
  userId: string,
  ymd: string,
): Promise<{ weightKg: number | null; skeletalMuscleKg: number | null; bodyFatPct: number | null; source: string; date: string } | null> {
  const from = addDays(ymd, -3);
  const to = addDays(ymd, 3);
  const [{ data: ib }, { data: wl }] = await Promise.all([
    supabase.from("body_compositions").select("measured_at, weight_kg, skeletal_muscle_kg, body_fat_pct").eq("user_id", userId).gte("measured_at", from).lte("measured_at", to),
    supabase.from("weight_logs").select("created_at, weight_kg, body_fat_pct").eq("user_id", userId).gte("created_at", `${from}T00:00:00+09:00`).lte("created_at", `${to}T23:59:59+09:00`),
  ]);
  const dist = (d: string) => Math.abs(dayDiff(ymd, d));
  const ibBest = ((ib ?? []) as Record<string, string | number | null>[])
    .map((r) => ({ date: String(r.measured_at), weightKg: num(r.weight_kg), skeletalMuscleKg: num(r.skeletal_muscle_kg), bodyFatPct: num(r.body_fat_pct), source: "inbody" }))
    .sort((a, b) => dist(a.date) - dist(b.date))[0];
  const wlBest = ((wl ?? []) as Record<string, string | number | null>[])
    .map((r) => ({ date: seoulYmd(new Date(String(r.created_at))), weightKg: num(r.weight_kg), skeletalMuscleKg: null, bodyFatPct: num(r.body_fat_pct), source: "weight_log" }))
    .sort((a, b) => dist(a.date) - dist(b.date))[0];
  if (!ibBest && !wlBest) return null;
  if (ibBest && (!wlBest || dist(ibBest.date) <= dist(wlBest.date))) {
    return { ...ibBest, weightKg: ibBest.weightKg ?? wlBest?.weightKg ?? null };
  }
  return { ...wlBest!, skeletalMuscleKg: ibBest?.skeletalMuscleKg ?? null };
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
