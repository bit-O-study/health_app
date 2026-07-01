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

/**
 * 여러 날짜 걸음수 백필(upsert). Health Connect 에서 최근 N일치를 서울 날짜별로
 * 버킷팅한 맵을 그대로 저장해 캘린더 과거 일자도 채운다.
 */
export async function saveStepsDaysAction(
  byDay: Record<string, number>,
  source = "health-connect",
): Promise<{ ok: boolean; saved: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, saved: 0 };

  const now = new Date().toISOString();
  const src = source.slice(0, 20);
  const rows = Object.entries(byDay ?? {})
    .filter(
      ([ymd, s]) => /^\d{4}-\d{2}-\d{2}$/.test(ymd) && Number.isFinite(s),
    )
    .map(([ymd, s]) => ({
      user_id: user.id,
      for_date: ymd,
      steps: Math.max(0, Math.min(200000, Math.floor(s))),
      source: src,
      updated_at: now,
    }));
  if (rows.length === 0) return { ok: true, saved: 0 };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("daily_steps")
    .upsert(rows, { onConflict: "user_id,for_date" });
  if (!error) {
    revalidatePath("/calendar");
    revalidatePath("/routine");
  }
  return { ok: !error, saved: error ? 0 : rows.length };
}
