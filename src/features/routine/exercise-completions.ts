import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompletionStatus = "done" | "skipped";

export type ExerciseCompletionRow = {
  forDate: string;
  exerciseRowId: string;
  status: CompletionStatus;
  focus: string | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

type Row = {
  for_date: string;
  exercise_row_id: string;
  status: string;
  focus: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | string | null;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

  // exercise_completions 자체에 저장된 snapshot (focus/sets/reps/weight_kg) 을 직접 사용.
  // routine_exercises 와의 FK 가 제거돼 있어 PostgREST 자동 join 이 불안정하고,
  // daily_plan 으로 등록된 운동의 완료 행은 routine_exercises 에 매칭되지 않아 점수 누락이 발생했음.
  const { data, error } = await supabase
    .from("exercise_completions")
    .select("for_date, exercise_row_id, status, focus, sets, reps, weight_kg")
    .eq("user_id", user.id)
    .gte("for_date", fromStr)
    .order("for_date", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    forDate: r.for_date,
    exerciseRowId: r.exercise_row_id,
    status: toStatus(r.status),
    focus: r.focus ?? null,
    sets: r.sets ?? null,
    reps: r.reps ?? null,
    weightKg: num(r.weight_kg ?? null),
  }));
}
