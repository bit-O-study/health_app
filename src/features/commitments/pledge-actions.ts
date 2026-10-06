"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getMyGroups } from "@/features/groups/data-access";
import {
  hasDiet,
  pledgeLines,
  sanitizePledge,
  validatePledge,
  type PledgeSpec,
} from "@/features/commitments/pledge";
import { pledgeEndDate } from "@/features/commitments/evaluation";
import {
  planForGoal,
  predictPledge,
  type GoalInput,
} from "@/features/commitments/prediction";
import { canReverse, getBodyContext, partLabel } from "@/features/commitments/pledge-data";
import { PLEDGE_PARTS } from "@/features/commitments/pledge";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";

export type PledgeActionResult = { ok: true; id?: string } | { ok: false; error: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAll() {
  for (const p of ["/commitments", "/commitments/status", "/commitments/groups", "/home", "/calendar"]) {
    revalidatePath(p);
  }
}

function sanitizeGoal(raw: unknown): GoalInput | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as { type?: unknown; kg?: unknown; part?: unknown };
  const kg = Number(g.kg);
  if (g.type === "lose_weight" && kg > 0) return { type: "lose_weight", kg: Math.round(kg * 10) / 10 };
  if (g.type === "gain_muscle" && kg > 0) return { type: "gain_muscle", kg: Math.round(kg * 10) / 10 };
  if (g.type === "grow_part" && PLEDGE_PARTS.includes(g.part as never)) {
    return { type: "grow_part", part: g.part as BodyPart };
  }
  return null;
}

/** 대표 지표(옛 화면·캘린더 밴드가 읽는 값) — 운동 항목이 있으면 운동, 아니면 식단. */
function legacyMetric(spec: PledgeSpec): { metric: "workout_days" | "diet_days"; target: number } {
  const workout = spec.workoutDays !== undefined || (spec.strength?.length ?? 0) > 0 || spec.cardioMinWeek !== undefined || spec.steps !== undefined;
  return workout
    ? { metric: "workout_days", target: Math.max(1, Math.round((spec.days / 7) * (spec.workoutDays ?? 1))) }
    : { metric: "diet_days", target: spec.days };
}

async function syncShares(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  commitmentId: string,
  groupIds: string[],
  snap: { title: string; lines: string[]; startDate: string; endDate: string },
) {
  const mine = new Set((await getMyGroups()).map((g) => g.id));
  const want = [...new Set(groupIds)].filter((g) => mine.has(g));
  const { data: cur } = await supabase
    .from("commitment_shares")
    .select("group_id")
    .eq("commitment_id", commitmentId)
    .eq("user_id", userId);
  const have = new Set(((cur ?? []) as { group_id: string }[]).map((r) => r.group_id));
  const remove = [...have].filter((g) => !want.includes(g));
  if (remove.length > 0) {
    await supabase.from("commitment_shares").delete().eq("commitment_id", commitmentId).eq("user_id", userId).in("group_id", remove);
  }
  if (want.length > 0) {
    const { error } = await supabase.from("commitment_shares").upsert(
      want.map((group_id) => ({
        commitment_id: commitmentId,
        group_id,
        user_id: userId,
        title: snap.title,
        lines: snap.lines,
        start_date: snap.startDate,
        end_date: snap.endDate,
      })),
      { onConflict: "commitment_id,group_id" },
    );
    if (error) return error.message;
  }
  return null;
}

/**
 * 다짐 만들기. 몸 정보(키·체중·체지방·골격근)가 없으면 거절한다.
 * 결과 목표(goal)로 만든 다짐은 990원(라이트) 이상만.
 * 생성 시점의 예상·기준 체성분을 결과 테이블에 같이 저장한다(나중에 실측과 비교).
 */
export async function createPledgeAction(input: {
  title: string;
  spec: unknown;
  startDate: string;
  shareGroupIds?: string[];
  goal?: unknown;
}): Promise<PledgeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!YMD.test(input.startDate)) return { ok: false, error: "시작일 형식이 올바르지 않습니다." };
  if (input.startDate < seoulYmd()) return { ok: false, error: "시작일은 오늘 이후로 정해 주세요." };

  const ctx = await getBodyContext();
  if (!ctx.body || ctx.missing.length > 0) {
    return { ok: false, error: "키·체중·체지방·골격근량을 먼저 등록해 주세요." };
  }
  const goal = input.goal === undefined || input.goal === null ? null : sanitizeGoal(input.goal);
  if (goal && !canReverse(ctx.plan)) {
    return { ok: false, error: "목표로 다짐 만들기는 라이트(990원) 요금제부터 쓸 수 있어요." };
  }

  // 목표로 만들면 서버에서 다시 역산한다(클라이언트 값을 믿지 않는다). 숫자를 고쳤으면 그 값.
  const fromGoal = goal ? planForGoal(goal, ctx.body) : null;
  if (fromGoal?.error) return { ok: false, error: fromGoal.error };
  const spec = sanitizePledge(input.spec ?? fromGoal?.pledge);
  if (!spec) return { ok: false, error: "다짐 기간을 확인해 주세요." };
  const check = validatePledge(spec, { weightKg: ctx.body.weightKg, gender: ctx.body.gender });
  if (check.errors.length > 0) return { ok: false, error: check.errors[0] };

  const title = input.title.trim().slice(0, 40) || pledgeLines(spec, partLabel)[0] || "나의 다짐";
  const endDate = pledgeEndDate(input.startDate, spec.days);
  const pred = predictPledge(spec, ctx.body, { calibration: ctx.calibration });
  const { metric, target } = legacyMetric(spec);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      user_id: user.id,
      title,
      tag: "pledge",
      metric,
      target,
      start_date: input.startDate,
      deadline: endDate,
      mode: "pledge",
      pledge: spec,
      weekly_target: Math.min(7, Math.max(1, spec.workoutDays ?? (hasDiet(spec) ? 7 : 1))),
      rest_pass_per_week: 0,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "저장하지 못했어요." };
  const id = (data as { id: string }).id;

  const { error: outErr } = await supabase.from("commitment_outcomes").insert({
    commitment_id: id,
    user_id: user.id,
    plan: ctx.plan,
    direction: goal ? "reverse" : "forward",
    goal_input: goal,
    pledge_snapshot: spec,
    start_date: input.startDate,
    end_date: endDate,
    baseline: { ...pred.baseline, inbody: ctx.body.inbody ?? null, heightCm: ctx.body.heightCm, age: ctx.body.age, gender: ctx.body.gender, experience: ctx.body.experience },
    predicted_weight_change_kg: pred.weightKg,
    predicted_fat_change_kg: pred.fatKg,
    predicted_muscle_change_kg: pred.muscleKg,
    prediction: pred,
    formula_version: pred.formulaVersion,
  });
  if (outErr) return { ok: false, error: outErr.message };

  const shareErr = await syncShares(supabase, user.id, id, input.shareGroupIds ?? [], {
    title,
    lines: pledgeLines(spec, partLabel),
    startDate: input.startDate,
    endDate,
  });
  if (shareErr) return { ok: false, error: shareErr };

  revalidateAll();
  return { ok: true, id };
}

/**
 * 다짐 편집 — 제목·그룹 공유는 언제든, 항목·수치·시작일은 **시작 전에만**.
 * (시작 후에 바꾸면 예상과 판정이 어긋난다.)
 */
export async function updatePledgeAction(input: {
  id: string;
  title: string;
  spec?: unknown;
  startDate?: string;
  shareGroupIds: string[];
}): Promise<PledgeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("commitments")
    .select("id, title, start_date, deadline, pledge")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .eq("mode", "pledge")
    .maybeSingle();
  if (!row) return { ok: false, error: "다짐을 찾을 수 없어요." };
  const cur = row as { start_date: string; deadline: string; pledge: unknown };
  const today = seoulYmd();
  const title = input.title.trim().slice(0, 40);
  if (!title) return { ok: false, error: "다짐 이름을 입력해 주세요." };

  let spec = sanitizePledge(cur.pledge)!;
  let startDate = cur.start_date;
  const wantsSpec = input.spec !== undefined || (input.startDate !== undefined && input.startDate !== cur.start_date);
  if (wantsSpec) {
    if (today >= cur.start_date) return { ok: false, error: "시작한 다짐은 항목을 바꿀 수 없어요. 제목과 공유만 바꿀 수 있어요." };
    const ctx = await getBodyContext();
    if (!ctx.body) return { ok: false, error: "몸 정보를 먼저 등록해 주세요." };
    const next = input.spec !== undefined ? sanitizePledge(input.spec) : spec;
    if (!next) return { ok: false, error: "다짐 기간을 확인해 주세요." };
    const check = validatePledge(next, { weightKg: ctx.body.weightKg, gender: ctx.body.gender });
    if (check.errors.length > 0) return { ok: false, error: check.errors[0] };
    if (input.startDate !== undefined) {
      if (!YMD.test(input.startDate) || input.startDate < today) return { ok: false, error: "시작일은 오늘 이후로 정해 주세요." };
      startDate = input.startDate;
    }
    spec = next;
    const pred = predictPledge(spec, ctx.body, { calibration: ctx.calibration });
    await supabase
      .from("commitment_outcomes")
      .update({
        pledge_snapshot: spec,
        start_date: startDate,
        end_date: pledgeEndDate(startDate, spec.days),
        baseline: { ...pred.baseline, inbody: ctx.body.inbody ?? null, heightCm: ctx.body.heightCm, age: ctx.body.age, gender: ctx.body.gender, experience: ctx.body.experience },
        predicted_weight_change_kg: pred.weightKg,
        predicted_fat_change_kg: pred.fatKg,
        predicted_muscle_change_kg: pred.muscleKg,
        prediction: pred,
        formula_version: pred.formulaVersion,
      })
      .eq("commitment_id", input.id)
      .eq("user_id", user.id);
  }
  const endDate = pledgeEndDate(startDate, spec.days);
  const { metric, target } = legacyMetric(spec);
  const { error } = await supabase
    .from("commitments")
    .update({ title, pledge: spec, start_date: startDate, deadline: endDate, metric, target })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  const lines = pledgeLines(spec, partLabel);
  // 이미 공유 중인 행의 제목·항목도 같이 갱신(upsert 가 덮는다).
  const shareErr = await syncShares(supabase, user.id, input.id, input.shareGroupIds, { title, lines, startDate, endDate });
  if (shareErr) return { ok: false, error: shareErr };
  revalidateAll();
  return { ok: true, id: input.id };
}

/** 다짐 삭제 — 결과 데이터는 남는다(commitment_id 만 비워짐). */
export async function deletePledgeAction(id: string): Promise<PledgeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("commitments").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/**
 * 인바디가 없을 때 직접 입력 — 키는 프로필, 체중·체지방·골격근은 체성분 기록(오늘)으로 저장한다.
 * 다음 다짐에서도 그대로 쓰인다.
 */
export async function saveManualBodyAction(input: {
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleKg: number;
}): Promise<PledgeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const h = Number(input.heightCm);
  const w = Number(input.weightKg);
  const bf = Number(input.bodyFatPct);
  const smm = Number(input.skeletalMuscleKg);
  if (!(h >= 120 && h <= 230)) return { ok: false, error: "키는 120~230cm 로 입력해 주세요." };
  if (!(w >= 30 && w <= 250)) return { ok: false, error: "체중은 30~250kg 로 입력해 주세요." };
  if (!(bf >= 3 && bf <= 60)) return { ok: false, error: "체지방률은 3~60% 로 입력해 주세요." };
  if (!(smm >= 10 && smm <= 70) || smm >= w * (1 - bf / 100)) {
    return { ok: false, error: "골격근량을 확인해 주세요(제지방량보다 작아야 해요)." };
  }
  const supabase = await createSupabaseServerClient();
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ height_cm: Math.round(h), weight_kg: r1(w) })
    .eq("user_id", user.id);
  if (pErr) return { ok: false, error: pErr.message };
  const { error } = await supabase.from("body_compositions").insert({
    user_id: user.id,
    measured_at: seoulYmd(),
    weight_kg: r1(w),
    body_fat_pct: r1(bf),
    body_fat_kg: r1((w * bf) / 100),
    skeletal_muscle_kg: r1(smm),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commitments/new");
  return { ok: true };
}

/** 끼니 '안 먹었어요' 체크 — 기록 누락과 구분한다(끼니 수에는 들어가지 않는다). */
export async function toggleMealSkipAction(input: {
  forDate: string;
  meal: string;
  on: boolean;
}): Promise<PledgeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!YMD.test(input.forDate)) return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  if (!["breakfast", "lunch", "dinner", "snack"].includes(input.meal)) {
    return { ok: false, error: "끼니가 올바르지 않습니다." };
  }
  const supabase = await createSupabaseServerClient();
  const q = input.on
    ? supabase.from("meal_skips").upsert({ user_id: user.id, for_date: input.forDate, meal: input.meal }, { onConflict: "user_id,for_date,meal" })
    : supabase.from("meal_skips").delete().eq("user_id", user.id).eq("for_date", input.forDate).eq("meal", input.meal);
  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}
