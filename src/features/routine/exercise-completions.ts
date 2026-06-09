import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type CompletionStatus = "done" | "skipped";

export type ExerciseCompletionRow = {
  forDate: string;
  exerciseRowId: string;
  exerciseId: string | null;
  status: CompletionStatus;
  focus: string | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

type Row = {
  for_date: string;
  exercise_row_id: string;
  exercise_id: string | null;
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

/** 오늘 운동별 완료 키. 완료는 '사실'이라 루틴을 바꿔 행 UUID 가 새로 생겨도
 * 유지돼야 한다. 그래서 row_id 외에 `f:${focus}:${exerciseId}` 복합 키로도 넣어,
 * 오늘 같은 운동이 보이면(행 id 가 달라도) 완료로 인식하게 한다. */
export function exerciseCompletionKey(
  focus: string | null | undefined,
  exerciseId: string | null | undefined,
): string {
  return `f:${focus ?? ""}:${exerciseId ?? ""}`;
}

/** 오늘 운동별 상태 맵 (done/skipped). row_id + (부위:운동) 키 둘 다 포함. 미기록은 맵에 없음. */
export async function getStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_completions")
    .select("exercise_row_id, status, focus, exercise_id")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as {
    exercise_row_id: string;
    status: string;
    focus: string | null;
    exercise_id: string | null;
  }[]) {
    const st = toStatus(r.status);
    map.set(r.exercise_row_id, st);
    // 같은 운동을 오늘 done 했으면 done 우선(skip 으로 덮지 않음).
    const key = exerciseCompletionKey(r.focus, r.exercise_id);
    if (st === "done" || !map.has(key)) map.set(key, st);
  }
  return map;
}

/** 최근 N일의 운동별 완료/스킵 기록(최신→과거) */
export async function getRecentExerciseCompletions(
  days = 90,
): Promise<ExerciseCompletionRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  // exercise_completions 자체에 저장된 snapshot (focus/sets/reps/weight_kg) 을 직접 사용.
  // routine_exercises 와의 FK 가 제거돼 있어 PostgREST 자동 join 이 불안정하고,
  // daily_plan 으로 등록된 운동의 완료 행은 routine_exercises 에 매칭되지 않아 점수 누락이 발생했음.
  const { data, error } = await supabase
    .from("exercise_completions")
    .select("for_date, exercise_row_id, exercise_id, status, focus, sets, reps, weight_kg")
    .eq("user_id", user.id)
    .gte("for_date", fromStr)
    .order("for_date", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    forDate: r.for_date,
    exerciseRowId: r.exercise_row_id,
    exerciseId: r.exercise_id ?? null,
    status: toStatus(r.status),
    focus: r.focus ?? null,
    sets: r.sets ?? null,
    reps: r.reps ?? null,
    weightKg: num(r.weight_kg ?? null),
  }));
}
