"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { RestRemainingInput } from "@/features/routine/rest-remaining";

/**
 * 오늘의 '아직 안 끝난' 운동들을 휴식(skipped) 처리한다. 완료(done)한 운동은 건드리지 않는다.
 * 무활동 종료 알림에서 '예'를 눌렀을 때 호출. (markAllTodayCompleteAction 의 skip 버전)
 */
export async function restRemainingTodayAction(
  opts: RestRemainingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  if (opts.planRows.length > 0) {
    const rows = opts.planRows.map((p) => ({
      user_id: user.id,
      for_date: today,
      exercise_row_id: p.rowId,
      status: "skipped" as const,
      exercise_id: p.snapshot.exerciseId,
      equipment: p.snapshot.equipment,
      sets: p.snapshot.sets,
      reps: p.snapshot.reps,
      weight_kg: p.snapshot.weightKg,
      focus: p.snapshot.focus,
      set_details: p.snapshot.setDetails ?? null,
    }));
    const { error } = await supabase
      .from("exercise_completions")
      .upsert(rows, { onConflict: "user_id,for_date,exercise_row_id" });
    if (error) return { ok: false, error: error.message };
  }

  const cond: { kind: "warmup" | "cooldown"; row: RestRemainingInput["warmup"][number] }[] = [
    ...opts.warmup.map((row) => ({ kind: "warmup" as const, row })),
    ...opts.cooldown.map((row) => ({ kind: "cooldown" as const, row })),
  ];
  if (cond.length > 0) {
    await Promise.all(
      cond.map(({ row }) =>
        supabase
          .from("conditioning_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("for_date", today)
          .eq("source_row_id", row.rowId),
      ),
    );
    const { error } = await supabase.from("conditioning_completions").insert(
      cond.map(({ kind, row }) => ({
        user_id: user.id,
        for_date: today,
        kind,
        item_id: row.itemId,
        source_row_id: row.rowId,
        status: "skipped" as const,
        duration_min: row.snapshot?.durationMin ?? null,
        speed: row.snapshot?.speed ?? null,
        incline: row.snapshot?.incline ?? null,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  revalidatePath(`/settings/history/${today}`);
  return { ok: true };
}
