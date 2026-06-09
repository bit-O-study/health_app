"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * 특정 날짜의 누적 운동 시간에 +durationSec 만큼 더한다 (upsert).
 * 정지 버튼 / 자정 롤오버 / 가이드 완주 시 호출.
 * durationSec=0 이면 no-op.
 */
export async function addWorkoutDurationAction(
  forDate: string,
  durationSec: number,
): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  if (!isValidYmd(forDate)) return { ok: false, error: "날짜가 올바르지 않습니다." };
  const sec = Math.max(0, Math.floor(durationSec));
  if (sec === 0) return { ok: true, total: 0 };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();

  // 기존 합계 읽고 더해서 upsert (RLS 가 user_id 확인)
  const { data: existing, error: selErr } = await supabase
    .from("workout_sessions")
    .select("duration_sec")
    .eq("user_id", user.id)
    .eq("for_date", forDate)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  const total = Math.max(0, Number(existing?.duration_sec ?? 0)) + sec;

  const { error } = await supabase.from("workout_sessions").upsert(
    {
      user_id: user.id,
      for_date: forDate,
      duration_sec: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
  if (error) return { ok: false, error: error.message };

  // 캘린더(history)·점수 화면 무효화
  revalidatePath("/settings/history");
  revalidatePath(`/settings/history/${forDate}`);
  revalidatePath("/settings/score");
  revalidatePath("/routine");
  return { ok: true, total };
}
