"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { FLOWS, type Flow } from "@/features/cycle/cycle";

export type CycleActionResult = { ok: true } | { ok: false; error: string };

/** 한 날짜의 월경 기록 저장(upsert). 모두 비면(생리X·출혈X·증상X·메모X) 행 삭제. */
export async function setCycleDayAction(
  dateYmd: string,
  patch: {
    isPeriod: boolean;
    flow: Flow | null;
    symptoms: string[];
    note: string | null;
  },
): Promise<CycleActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd))
    return { ok: false, error: "날짜가 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const flow = patch.flow && FLOWS.includes(patch.flow) ? patch.flow : null;
  const symptoms = (patch.symptoms ?? []).slice(0, 20).map((s) => s.slice(0, 20));
  const note = patch.note?.trim().slice(0, 500) || null;
  const empty = !patch.isPeriod && !flow && symptoms.length === 0 && !note;

  if (empty) {
    const { error } = await supabase
      .from("cycle_logs")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", dateYmd);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/cycle");
    revalidatePath("/calendar");
    return { ok: true };
  }

  const { error } = await supabase.from("cycle_logs").upsert(
    {
      user_id: user.id,
      for_date: dateYmd,
      is_period: patch.isPeriod,
      flow,
      symptoms,
      note,
    },
    { onConflict: "user_id,for_date" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cycle");
  revalidatePath("/calendar");
  return { ok: true };
}
