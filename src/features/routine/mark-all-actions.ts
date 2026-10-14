"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionSnapshot } from "@/features/routine/exercise-completion-actions";
import type { CondSnapshot } from "@/features/routine/conditioning-completion-actions";

export type CondMarkInput = {
  rowId: string;
  itemId: string;
  snapshot?: CondSnapshot;
};

export type PlanMarkInput = {
  rowId: string;
  snapshot: CompletionSnapshot;
};

export async function markAllTodayCompleteAction(opts: {
  planRows: PlanMarkInput[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  if (opts.planRows.length > 0) {
    const rows = opts.planRows.map((p) => ({
      user_id: user.id,
      for_date: today,
      exercise_row_id: p.rowId,
      status: "done" as const,
      exercise_id: p.snapshot.exerciseId,
      equipment: p.snapshot.equipment,
      sets: p.snapshot.sets,
      reps: p.snapshot.reps,
      weight_kg: p.snapshot.weightKg,
      focus: p.snapshot.focus,
      set_details: p.snapshot.setDetails ?? null,
    }));
    // 결과를 확인한다(2026-10-14) — 예전엔 실패해도 성공처럼 화면을 다시 읽었다.
    const { error } = await supabase
      .from("exercise_completions")
      .upsert(rows, { onConflict: "user_id,for_date,exercise_row_id" });
    if (error) return { ok: false, error: "완료로 바꾸지 못했어요. 다시 시도해 주세요." };
  }

  const condEntries: { kind: "warmup" | "cooldown"; row: CondMarkInput }[] = [
    ...opts.warmup.map((row) => ({ kind: "warmup" as const, row })),
    ...opts.cooldown.map((row) => ({ kind: "cooldown" as const, row })),
  ];
  if (condEntries.length > 0) {
    const deleted = await Promise.all(
      condEntries.map(({ row }) =>
        supabase
          .from("conditioning_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("for_date", today)
          .eq("source_row_id", row.rowId),
      ),
    );
    if (deleted.some((r) => r.error)) return { ok: false, error: "완료로 바꾸지 못했어요. 다시 시도해 주세요." };
    const inserts = condEntries.map(({ kind, row }) => ({
      user_id: user.id,
      for_date: today,
      kind,
      item_id: row.itemId,
      source_row_id: row.rowId,
      status: "done" as const,
      duration_min: row.snapshot?.durationMin ?? null,
      speed: row.snapshot?.speed ?? null,
      incline: row.snapshot?.incline ?? null,
    }));
    const { error } = await supabase.from("conditioning_completions").insert(inserts);
    if (error) return { ok: false, error: "워밍업·마무리를 완료로 바꾸지 못했어요. 다시 시도해 주세요." };
  }

  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  revalidatePath(`/settings/history/${today}`);
  return { ok: true };
}
