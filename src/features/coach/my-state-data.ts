import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import { isGoal } from "@/features/profile/goal";
import type { SetDetail } from "@/features/routine/set-details";
import {
  VOLUME_WEEKS,
  computeMyState,
  type BodyCompPoint,
  type MyState,
} from "@/features/coach/my-state";

const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** 날짜별 합계(기록 있는 날만). */
function sumByDay(rows: { for_date: string; v: number | null }[]): number[] {
  const m = new Map<string, number>();
  for (const r of rows) if (r.v !== null) m.set(r.for_date, (m.get(r.for_date) ?? 0) + r.v);
  return [...m.values()];
}

/**
 * 내 상태 — 기록을 읽어 `computeMyState` 에 넘긴다(AI 트레이너 1단계, 2026-09-30).
 *
 * 한 번에 병렬로 읽는다. 어느 하나가 실패해도 **그 항목만 비운다** — 수분 기록을 못 읽었다고
 * 운동 추천까지 못 하면 안 된다(모르는 항목은 계산이 null 로 두고 요약 줄에서 뺀다).
 */
export async function loadMyState(): Promise<MyState | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from4w = addDaysYmd(today, -VOLUME_WEEKS * 7 + 1);
  const from7d = addDaysYmd(today, -6);
  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try {
      const { data, error } = await p;
      return error ? null : data;
    } catch {
      return null;
    }
  };

  const [completions, weights, comps, profile, water, food, steps] = await Promise.all([
    safe(
      supabase
        .from("exercise_completions")
        .select("exercise_id, for_date, status, sets, reps, weight_kg, set_details, equipment")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", from4w)
        .lte("for_date", today),
    ),
    safe(
      supabase
        .from("weight_logs")
        .select("weight_kg, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${from4w}T00:00:00+09:00`)
        .order("created_at", { ascending: true }),
    ),
    safe(
      supabase
        .from("body_compositions")
        .select(
          "measured_at, weight_kg, skeletal_muscle_kg, body_fat_pct, muscle_right_arm, muscle_left_arm, muscle_right_leg, muscle_left_leg",
        )
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(2),
    ),
    safe(
      supabase
        .from("profiles")
        .select("goal, weight_kg, target_weight_kg, target_muscle_kg, target_body_fat_pct")
        .eq("user_id", user.id)
        .maybeSingle(),
    ),
    safe(
      supabase.from("water_logs").select("for_date, ml").eq("user_id", user.id).gte("for_date", from7d).lte("for_date", today),
    ),
    safe(
      supabase
        .from("food_logs")
        .select("for_date, kcal, protein_g")
        .eq("user_id", user.id)
        .gte("for_date", from7d)
        .lte("for_date", today),
    ),
    safe(
      supabase.from("daily_steps").select("for_date, steps").eq("user_id", user.id).gte("for_date", from7d).lte("for_date", today),
    ),
  ]);

  type Row = Record<string, unknown>;
  const p = (profile ?? null) as Row | null;
  const foodRows = (food ?? []) as Row[];

  return computeMyState({
    today,
    records: ((completions ?? []) as Row[]).map((r) => ({
      forDate: String(r.for_date),
      exerciseId: (r.exercise_id as string | null) ?? null,
      status: "done" as const,
      sets: n(r.sets),
      reps: n(r.reps),
      weightKg: n(r.weight_kg),
      setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
      equipment: (r.equipment as string | null) ?? null,
    })),
    weights: ((weights ?? []) as Row[])
      .map((r) => ({ date: String(r.created_at).slice(0, 10), kg: n(r.weight_kg) ?? 0 }))
      .filter((w) => w.kg > 0),
    bodyComps: ((comps ?? []) as Row[]).map(
      (r): BodyCompPoint => ({
        date: String(r.measured_at).slice(0, 10),
        weightKg: n(r.weight_kg),
        skeletalMuscleKg: n(r.skeletal_muscle_kg),
        bodyFatPct: n(r.body_fat_pct),
        muscleRightArm: n(r.muscle_right_arm),
        muscleLeftArm: n(r.muscle_left_arm),
        muscleRightLeg: n(r.muscle_right_leg),
        muscleLeftLeg: n(r.muscle_left_leg),
      }),
    ),
    profile: {
      goal: isGoal(p?.goal) ? p.goal : null,
      weightKg: n(p?.weight_kg),
      targetWeightKg: n(p?.target_weight_kg),
      targetMuscleKg: n(p?.target_muscle_kg),
      targetBodyFatPct: n(p?.target_body_fat_pct),
    },
    waterMlByDay: ((water ?? []) as Row[]).map((r) => n(r.ml) ?? 0),
    kcalByDay: sumByDay(foodRows.map((r) => ({ for_date: String(r.for_date), v: n(r.kcal) }))),
    proteinGByDay: sumByDay(foodRows.map((r) => ({ for_date: String(r.for_date), v: n(r.protein_g) }))),
    stepsByDay: ((steps ?? []) as Row[]).map((r) => n(r.steps) ?? 0),
  });
}
