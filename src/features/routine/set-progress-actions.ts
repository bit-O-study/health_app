"use server";

import { seoulYmd } from "@/features/routine/data";
import type { CompletionSnapshot } from "@/features/routine/exercise-completion-actions";
import { resolveForDate } from "@/lib/offline/queued-date";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * 세트 완료마다 기록한다(2026-10-14) — 진행 중인 운동을 'partial' 로 남긴다.
 *
 * - `snapshot.sets` = 지금까지 끝낸 세트 수, `setDetails` = 그 세트들의 실제 값.
 * - `snapshot` 이 null 이면 끝낸 세트가 없다 — 진행 기록을 지운다(세트 완료를 전부 취소했을 때).
 * - 이미 완료(done)·건너뜀(skipped)으로 굳은 기록은 건드리지 않는다.
 *
 * 🔴 화면을 다시 그리게 하지 않는다(`revalidatePath` 없음) — 세트를 칠 때마다 /routine 전체를
 *    서버에서 다시 그리면 운동모드가 버벅인다. 진행 기록은 목록에 안 보이므로 그릴 것도 없다.
 */
export async function recordSetProgressAction(
  exerciseRowId: string,
  snapshot: CompletionSnapshot | null,
  forDate?: string,
): Promise<{ ok: boolean }> {
  if (!exerciseRowId) return { ok: true };
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const today = resolveForDate(forDate, seoulYmd());

  if (!snapshot || !(snapshot.sets > 0)) {
    const { error } = await supabase
      .from("exercise_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", today)
      .eq("exercise_row_id", exerciseRowId)
      .eq("status", "partial");
    return { ok: !error };
  }

  const fields = {
    exercise_id: snapshot.exerciseId,
    equipment: snapshot.equipment,
    sets: snapshot.sets,
    reps: snapshot.reps,
    weight_kg: snapshot.weightKg,
    focus: snapshot.focus,
    set_details: snapshot.setDetails ?? null,
    // 마지막으로 세트를 끝낸 시각 — 넘기거나 끝내서 굳으면 이 시각이 완료 시각이 된다(회복 계산).
    completed_at: new Date().toISOString(),
  };
  // 진행 중인 기록이 있으면 고치고, 없으면 새로 만든다. 굳은 기록(done·skipped)은 그대로 둔다.
  const upd = await supabase
    .from("exercise_completions")
    .update(fields)
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("exercise_row_id", exerciseRowId)
    .eq("status", "partial")
    .select("id");
  if (upd.error) return { ok: false };
  if ((upd.data?.length ?? 0) > 0) return { ok: true };
  const ins = await supabase
    .from("exercise_completions")
    .insert({ user_id: user.id, for_date: today, exercise_row_id: exerciseRowId, status: "partial", ...fields });
  // 23505 = 같은 행의 기록이 이미 굳어 있다(완료·건너뜀) — 덮지 않는다.
  return { ok: !ins.error || ins.error.code === "23505" };
}
