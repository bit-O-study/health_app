import "server-only";

import { cache } from "react";

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

export type DailyPlanRow = {
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
  set_details?: unknown;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 특정 날짜의 본운동 오버라이드(부위순·position순). 없으면 빈 배열.
 * React.cache 로 한 요청 내 같은 날짜에 대한 중복 호출은 1회로 dedup.
 */
export const getDailyPlanForDate = cache(
  async (dateYmd: string): Promise<DailyPlanRow[]> => {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();

    // select("*") — set_details 컬럼이 마이그레이션 전이어도 쿼리가 깨지지 않게.
    const { data, error } = await supabase
      .from("daily_plan")
      .select("*")
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
      setDetails: parseSetDetails(r.set_details),
    }));
  },
);
