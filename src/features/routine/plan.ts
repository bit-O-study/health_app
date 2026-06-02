import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  parseSetDetails,
  type SetDetail,
} from "@/features/routine/set-details";
import { seoulYmd } from "@/features/routine/data";

export type PlanExercise = {
  id: string;
  focus: string;
  position: number;
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
  /** 세트별 무게·횟수. null = 균일(sets×reps@weightKg). */
  setDetails: SetDetail[] | null;
  /** 개인 메모 (자세 주의점 등). null = 없음. */
  memo: string | null;
};

type PlanRow = {
  id: string;
  focus: string;
  position: number;
  exercise_id: string;
  equipment: unknown;
  sets: number;
  reps: number;
  weight_kg: number | null;
  set_details?: unknown;
  memo?: unknown;
};

function toPlanExercise(row: PlanRow): PlanExercise {
  return {
    id: row.id,
    focus: row.focus,
    position: row.position,
    exerciseId: row.exercise_id,
    equipment: isEquipmentId(row.equipment) ? row.equipment : "barbell",
    sets: row.sets,
    reps: row.reps,
    weightKg: typeof row.weight_kg === "number" ? row.weight_kg : null,
    setDetails: parseSetDetails(row.set_details),
    memo: typeof row.memo === "string" && row.memo.trim() !== "" ? row.memo : null,
  };
}

/** 현재 사용자의 특정 부위 등록 운동(순서대로). 없으면 빈 배열. */
export async function getPlanForFocus(focus: string): Promise<PlanExercise[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  // select("*") — set_details 컬럼이 마이그레이션 전이어도 쿼리가 깨지지 않게.
  const { data, error } = await supabase
    .from("routine_exercises")
    .select("*")
    .eq("user_id", user.id)
    .eq("focus", focus)
    .order("position", { ascending: true });

  if (error || !data) return [];
  return (data as PlanRow[]).map(toPlanExercise);
}

/**
 * 특정 운동에 대한 사용자의 개인 메모. 오늘 "오늘만 변경" 오버라이드(daily_plan)에
 * 메모가 있으면 그걸 우선하고, 없으면 기본 루틴(routine_exercises)의 메모를 사용.
 */
export async function getMemoForExercise(
  exerciseId: string,
): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const pick = (rows: { memo?: unknown }[] | null): string | null => {
    const m = rows?.[0]?.memo;
    return typeof m === "string" && m.trim() !== "" ? m : null;
  };

  // 1) 오늘 daily_plan 오버라이드 메모 우선
  const today = seoulYmd();
  const daily = await supabase
    .from("daily_plan")
    .select("memo")
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("exercise_id", exerciseId)
    .not("memo", "is", null)
    .limit(1);
  const dailyMemo = pick(daily.data as { memo?: unknown }[] | null);
  if (dailyMemo) return dailyMemo;

  // 2) 기본 루틴 메모
  const { data } = await supabase
    .from("routine_exercises")
    .select("memo")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .not("memo", "is", null)
    .limit(1);
  return pick(data as { memo?: unknown }[] | null);
}

/** 등록 운동이 하나라도 있는지 (등록 완료 여부 판단용) */
export async function hasAnyPlan(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("routine_exercises")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return !error && (count ?? 0) > 0;
}
