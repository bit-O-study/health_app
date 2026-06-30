"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

/** 오늘 걸음수 저장(upsert). 네이티브 앱(Health Connect/HealthKit)에서 동기화 시 호출. */
export async function saveStepsAction(
  steps: number,
  source = "health-connect",
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  if (!Number.isFinite(steps)) return { ok: false };
  const n = Math.max(0, Math.min(200000, Math.floor(steps)));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("daily_steps").upsert(
    {
      user_id: user.id,
      for_date: seoulYmd(),
      steps: n,
      source: source.slice(0, 20),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
  if (!error) {
    revalidatePath("/calendar");
    revalidatePath("/routine");
  }
  return { ok: !error };
}
