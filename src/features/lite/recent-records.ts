import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import { fetchAllPages } from "@/lib/batch";
import { doneAtOf } from "@/features/routine/fit-insights";
import type { ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";

/** 라이트 비교·인사이트가 보는 기록 범위(일). */
export const RECENT_DAYS = 120;

/**
 * 최근 120일(기본) 끝낸 운동(무게·세트별 기록 포함) — 운동 끝 리포트 · 홈 한 줄 · 종목별 기록(365일)이 같이 쓴다.
 * 요청 단위 cache 라 한 화면에서 여러 번 불러도 한 번만 읽는다. 로그인 안 했으면 null.
 */
/** 끝낸 시각(회복 계산용)이 붙은 기록. */
export type TimedRecord = ProgressRecord & { doneAt: string };

export const loadRecentRecords = cache(async (days: number = RECENT_DAYS): Promise<{ today: string; records: TimedRecord[] } | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const today = seoulYmd();
  const supabase = await createSupabaseServerClient();
  // 1년이면 1,000줄(한 번에 오는 최대)을 넘는 회원이 있다 — 끝까지 나눠 읽는다.
  const data = await fetchAllPages<Record<string, unknown>>((a, b) =>
    supabase
      .from("exercise_completions")
      .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment, created_at")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", addDaysYmd(today, -(days - 1)))
      .lte("for_date", today)
      .order("for_date", { ascending: true })
      .range(a, b),
  );
  const records: TimedRecord[] = data.map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done",
    sets: r.sets == null ? null : Number(r.sets),
    reps: r.reps == null ? null : Number(r.reps),
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
    equipment: (r.equipment as string | null) ?? null,
    // 끝낸 시각 — 저장 시각이 그날이 아니면(나중에 채운 기록) 그날 저녁 7시로 본다.
    doneAt: doneAtOf(r.created_at ? String(r.created_at) : null, String(r.for_date)),
  }));
  return { today, records };
});
