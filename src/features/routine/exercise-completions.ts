import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompletionStatus = "done" | "skipped";

export type ExerciseCompletionRow = {
  forDate: string;
  exerciseRowId: string;
  status: CompletionStatus;
  focus: string | null;
};

type Row = {
  for_date: string;
  exercise_row_id: string;
  status: string;
  routine_exercises: { focus: string }[] | null;
};

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

/** 오늘 운동별 상태 맵 (done/skipped). 미기록은 맵에 없음. */
export async function getStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from("exercise_completions")
    .select("exercise_row_id, status")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as { exercise_row_id: string; status: string }[]) {
    map.set(r.exercise_row_id, toStatus(r.status));
  }
  return map;
}

/** 최근 N일의 운동별 완료/스킵 기록(최신→과거) */
export async function getRecentExerciseCompletions(
  days = 90,
): Promise<ExerciseCompletionRow[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("exercise_completions")
    .select("for_date, exercise_row_id, status, routine_exercises(focus)")
    .eq("user_id", user.id)
    .gte("for_date", fromStr)
    .order("for_date", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    forDate: r.for_date,
    exerciseRowId: r.exercise_row_id,
    status: toStatus(r.status),
    focus: r.routine_exercises?.[0]?.focus ?? null,
  }));
}
