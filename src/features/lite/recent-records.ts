import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import type { ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";

/** 라이트 비교·인사이트가 보는 기록 범위(일). */
export const RECENT_DAYS = 120;

/**
 * 최근 120일 끝낸 운동(무게·세트별 기록 포함) — 운동 끝 리포트 · 홈 한 줄이 같이 쓴다.
 * 요청 단위 cache 라 한 화면에서 여러 번 불러도 한 번만 읽는다. 로그인 안 했으면 null.
 */
export const loadRecentRecords = cache(async (): Promise<{ today: string; records: ProgressRecord[] } | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const today = seoulYmd();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("exercise_completions")
    .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment")
    .eq("user_id", user.id)
    .eq("status", "done")
    .gte("for_date", addDaysYmd(today, -(RECENT_DAYS - 1)))
    .lte("for_date", today);
  const records: ProgressRecord[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done",
    sets: r.sets == null ? null : Number(r.sets),
    reps: r.reps == null ? null : Number(r.reps),
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
    equipment: (r.equipment as string | null) ?? null,
  }));
  return { today, records };
});
