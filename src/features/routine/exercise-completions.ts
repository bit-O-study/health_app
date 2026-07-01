import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  exerciseCompletionKey,
  type CompletionStatus,
} from "@/features/routine/completion-match";
import {
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { parseSetDetails, type SetDetail } from "@/features/routine/set-details";

// 순수 매칭 로직은 completion-match 로 분리(단위 테스트 가능). 호환을 위해 재노출.
export {
  exerciseCompletionKey,
  resolveTodayStatus,
} from "@/features/routine/completion-match";
export type { CompletionStatus } from "@/features/routine/completion-match";

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

/** 오늘 완료/스킵한 본운동의 스냅샷(렌더용). exercise_id 가 있는(스냅샷 저장된) 행만. */
export type TodayCompletedItem = {
  exerciseRowId: string;
  /** 스냅샷이 없는(옛) 기록은 null — 행 id 직접 매칭엔 쓰이지만 고스트로는 못 그린다. */
  exerciseId: string | null;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
  setDetails: SetDetail[] | null;
  focus: string | null;
  status: CompletionStatus;
};

/**
 * 오늘 완료/스킵 처리된 본운동들의 스냅샷 목록.
 * 부위를 바꿔(오늘만 변경) 현재 플랜에서 빠진 운동도 '완료'로 계속 보여주기 위해 쓴다.
 * (등 완료 후 가슴으로 바꿔도 등 완료가 사라지지 않게 — 호출부가 plan 에 없는 것만 합친다.)
 */
export async function getTodayCompletedItems(
  todayYmd: string,
): Promise<TodayCompletedItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_completions")
    .select(
      "exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg, set_details",
    )
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return [];
  const out: TodayCompletedItem[] = [];
  for (const r of data as {
    exercise_row_id: string;
    status: string;
    focus: string | null;
    exercise_id: string | null;
    equipment: unknown;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
    set_details?: unknown;
  }[]) {
    // 스냅샷(exercise_id) 없는 옛 기록도 포함 — 행 id 직접 매칭(완료 판정)엔 필요.
    // 고스트(완료 보존 표시)는 호출부가 exerciseId 있는 것만 그린다.
    out.push({
      exerciseRowId: r.exercise_row_id,
      exerciseId: r.exercise_id ?? null,
      equipment: isEquipmentId(r.equipment) ? r.equipment : "barbell",
      sets: r.sets ?? 1,
      reps: r.reps ?? 1,
      weightKg: num(r.weight_kg),
      setDetails: parseSetDetails(r.set_details),
      focus: r.focus ?? null,
      status: toStatus(r.status),
    });
  }
  return out;
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

export type LastExerciseValues = {
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
};

/**
 * 운동별 '마지막으로 실제 한 값'(가장 최근 done 완료 스냅샷). 운동모드/루틴이 다시 돌아오면
 * 이 값으로 미리 채워, 사용자가 매번 다시 입력하지 않게 한다(비고정 모드). 없으면 맵에 없음.
 */
export async function getLastExerciseValues(): Promise<
  Map<string, LastExerciseValues>
> {
  const out = new Map<string, LastExerciseValues>();
  const user = await getCurrentUser();
  if (!user) return out;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_completions")
    .select("exercise_id, sets, reps, weight_kg, for_date")
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("for_date", { ascending: false });
  if (error || !data) return out;
  for (const r of data as {
    exercise_id: string | null;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
  }[]) {
    // desc 정렬 → 운동별 첫 항목이 가장 최근 값.
    if (!r.exercise_id || out.has(r.exercise_id)) continue;
    out.set(r.exercise_id, {
      weightKg: num(r.weight_kg ?? null),
      reps: r.reps ?? null,
      sets: r.sets ?? null,
    });
  }
  return out;
}
