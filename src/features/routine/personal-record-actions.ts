"use server";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { bestOneRmByExercise } from "@/features/routine/personal-record";
import type { SetDetail } from "@/features/routine/set-details";

/**
 * 운동 모드가 시작할 때 한 번 — 오늘 할 운동들의 **오늘 전까지** 최고 예상 1RM.
 * 오늘 기록은 빼야 한다: 오늘 이미 한 세트가 기준이 되면 방금 세운 기록을 넘어야만 축하한다.
 * 실패하면 빈 표 — 신기록 알림이 안 뜰 뿐 운동은 그대로다.
 */
export async function getPersonalBestsAction(
  exerciseIds: string[],
): Promise<Record<string, number>> {
  try {
    const ids = [...new Set((exerciseIds ?? []).filter((x) => typeof x === "string" && x))].slice(0, 40);
    if (!ids.length) return {};
    const user = await getCurrentUser();
    if (!user) return {};
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("exercise_completions")
      .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment")
      .eq("user_id", user.id)
      .eq("status", "done")
      .in("exercise_id", ids)
      .lt("for_date", seoulYmd());
    if (error || !data) return {};
    return bestOneRmByExercise(
      (data as Record<string, unknown>[]).map((r) => ({
        forDate: String(r.for_date),
        exerciseId: (r.exercise_id as string | null) ?? null,
        status: "done" as const,
        sets: r.sets == null ? null : Number(r.sets),
        reps: r.reps == null ? null : Number(r.reps),
        weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
        setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
        equipment: (r.equipment as string | null) ?? null,
      })),
    );
  } catch {
    return {};
  }
}
