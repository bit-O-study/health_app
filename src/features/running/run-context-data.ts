import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { pickLastRun, type LastRunRow, type LastRunSetting } from "@/features/running/run-context";

/**
 * 런닝 이어하기(2026-10-28) — 이 루틴 일차에서 마지막으로 뛴 런닝 모드 설정(실내/실외·목표·대체 여부).
 * 열이 아직 없는 DB 거나 조회가 실패하면 null — 메뉴는 예전처럼 매번 고르게 보인다.
 */
export const getLastRunSetting = cache(async (routineDay: number): Promise<LastRunSetting | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("run_sessions")
    .select("mode, goal, replaced_routine, routine_day, for_date")
    .eq("user_id", user.id)
    .not("routine_day", "is", null)
    .order("started_at", { ascending: false })
    .limit(30);
  if (error || !data) return null;
  return pickLastRun(data as LastRunRow[], routineDay);
});
