import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

export type DailyPlanRow = {
  id: string;
  focus: string;
  position: number;
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
};

type Row = {
  id: string;
  focus: string;
  position: number;
  exercise_id: string;
  equipment: unknown;
  sets: number;
  reps: number;
  weight_kg: number | string | null;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 특정 날짜의 본운동 오버라이드(부위순·position순). 없으면 빈 배열. */
export async function getDailyPlanForDate(
  dateYmd: string,
): Promise<DailyPlanRow[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_plan")
    .select("id, focus, position, exercise_id, equipment, sets, reps, weight_kg")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .order("focus", { ascending: true })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    id: r.id,
    focus: r.focus,
    position: r.position,
    exerciseId: r.exercise_id,
    equipment: isEquipmentId(r.equipment) ? r.equipment : "barbell",
    sets: r.sets,
    reps: r.reps,
    weightKg: num(r.weight_kg),
  }));
}
