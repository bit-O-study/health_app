import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { pickLastRun, type LastRunRow, type LastRunSetting } from "@/features/running/run-context";
import { getRecentDoneRecords } from "@/features/routine/exercise-completions";
import { seoulYmd } from "@/features/routine/data";
import { sameRoutineDates } from "@/features/routine/same-routine";

/**
 * 런닝 이어하기(2026-10-28) — 이 루틴 일차에서 마지막으로 뛴 런닝 모드 설정(실내/실외·목표·대체 여부).
 * 열이 아직 없는 DB 거나 조회가 실패하면 null — 메뉴는 예전처럼 매번 고르게 보인다.
 */
export const getLastRunSetting = cache(async (routineDay: number, focusesKey: string): Promise<LastRunSetting | null> => {
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
  // 같은 루틴(오늘과 부위 묶음이 같은 날)에서 뛴 런닝이 먼저 — 운동 기록과 같은 조회(cache)라 왕복 0.
  const sameDates = sameRoutineDates(await getRecentDoneRecords(), focusesKey.split(",").filter(Boolean), seoulYmd());
  return pickLastRun(data as LastRunRow[], routineDay, sameDates);
});
