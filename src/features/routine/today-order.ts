import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * 운동 순서 정리(라이트, 2026-10-28)로 '오늘만' 정한 본운동 순서. 날짜가 오늘이 아니면 null.
 *
 * 루틴 조회(getUserRoutine)와 따로 읽는다 — 열이 아직 없는 DB 에서도 루틴 화면이 깨지지 않고
 * 이 기능만 꺼진 채로 보인다.
 */
export const getTodayOrder = cache(async (todayYmd: string): Promise<string[] | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_routines")
    .select("today_order_date, today_order")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { today_order_date: string | null; today_order: unknown };
  if (row.today_order_date !== todayYmd || !Array.isArray(row.today_order)) return null;
  return row.today_order.filter((id): id is string => typeof id === "string");
});
