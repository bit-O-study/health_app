import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import {
  summarizeCronRuns,
  type CronRunRow,
  type CronRunSummary,
} from "@/lib/cron/run-log";

/** 요약에 쓸 최근 실행 조회 범위(일). */
export const CRON_LOOKBACK_DAYS = 14;
/** 한 번에 읽는 최대 실행 수(10분 크론이 있어 2주면 2천 건 남짓). */
const MAX_ROWS = 3000;

export type CronRunsView = {
  summaries: CronRunSummary[];
  /** 최근 실행 몇 건(문제 확인용 원본). */
  recent: CronRunRow[];
  lookbackDays: number;
};

/** 관리자 화면용 — 크론별 요약 + 최근 실행 목록. 관리자가 아니면 빈 결과. */
export async function getCronRuns(recentLimit = 30): Promise<CronRunsView> {
  const empty: CronRunsView = {
    summaries: summarizeCronRuns([]),
    recent: [],
    lookbackDays: CRON_LOOKBACK_DAYS,
  };
  if (!(await isAdminUser())) return empty;

  const since = new Date(
    Date.now() - CRON_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cron_runs")
    .select(
      "name, started_at, finished_at, duration_ms, status, scanned, targeted, sent, deduped, failed, reason",
    )
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(MAX_ROWS);

  const rows = (data ?? []) as CronRunRow[];
  return {
    summaries: summarizeCronRuns(rows),
    recent: rows.slice(0, recentLimit),
    lookbackDays: CRON_LOOKBACK_DAYS,
  };
}
