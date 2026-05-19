"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidRoutine } from "@/features/routine/data";

export type SaveRoutineResult = { ok: true } | { ok: false; error: string };

/**
 * 현재 사용자의 루틴을 저장(없으면 생성, 있으면 갱신)합니다.
 * start_date 는 최초 생성 시에만 기록되고 변경 시 유지됩니다.
 */
export async function saveRoutineAction(
  splits: number,
  variantId: string,
): Promise<SaveRoutineResult> {
  if (!isValidRoutine(splits, variantId)) {
    return { ok: false, error: "선택한 루틴이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("user_routines").upsert(
    {
      user_id: user.id,
      splits,
      variant_id: variantId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/settings/routine");
  return { ok: true };
}