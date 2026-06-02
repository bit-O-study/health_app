import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type RoutinePresetSummary = {
  id: string;
  name: string;
  createdAt: string;
  /** 미리보기용 — 등록 운동 수 */
  exerciseCount: number;
};

/** 현재 사용자의 저장된 루틴 프리셋(최신순). */
export async function getRoutinePresets(): Promise<RoutinePresetSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("routine_presets")
    .select("id, name, created_at, exercises")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (
    data as { id: string; name: string; created_at: string; exercises: unknown }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    exerciseCount: Array.isArray(r.exercises) ? r.exercises.length : 0,
  }));
}
