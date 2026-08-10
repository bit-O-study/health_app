import type { SupabaseClient } from "@supabase/supabase-js";

export type RoutineExerciseWriteRow = {
  id?: string;
  position: number;
  exerciseId: string;
  equipment: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  setDetails?: unknown;
  memo?: string | null;
};

export type RoutineExerciseWriteGroup = {
  dayIndex: number;
  focus: string;
  rows: RoutineExerciseWriteRow[];
};

export type InsertedRoutineExercise = {
  id: string;
  exerciseId: string;
  dayIndex: number;
  focus: string;
};

export function routineExerciseWriteErrorMessage(message: string): string {
  if (message.includes("STALE_ROUTINE")) {
    return "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.";
  }
  if (message.includes("AUTH_REQUIRED")) return "로그인이 필요합니다.";
  if (message.includes("ROUTINE_NOT_FOUND")) return "루틴을 찾을 수 없습니다.";
  return "운동 저장에 실패했습니다.";
}

export async function replaceRoutineExerciseGroups(
  supabase: SupabaseClient,
  expectedRoutineUpdatedAt: string,
  replaceAll: boolean,
  groups: RoutineExerciseWriteGroup[],
): Promise<
  | { ok: true; inserted: InsertedRoutineExercise[] }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc(
    "replace_routine_exercise_groups",
    {
      p_expected_routine_updated_at: expectedRoutineUpdatedAt,
      p_replace_all: replaceAll,
      p_groups: groups,
    },
  );
  if (error) {
    return { ok: false, error: routineExerciseWriteErrorMessage(error.message) };
  }

  const inserted = Array.isArray(data)
    ? data.flatMap((row) => {
        if (
          !row ||
          typeof row !== "object" ||
          typeof row.inserted_id !== "string" ||
          typeof row.inserted_exercise_id !== "string" ||
          !Number.isInteger(row.inserted_day_index) ||
          typeof row.inserted_focus !== "string"
        ) {
          return [];
        }
        return [
          {
            id: row.inserted_id,
            exerciseId: row.inserted_exercise_id,
            dayIndex: row.inserted_day_index as number,
            focus: row.inserted_focus,
          },
        ];
      })
    : [];
  return { ok: true, inserted };
}
