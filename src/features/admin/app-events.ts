import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import {
  summarizeAppEvents,
  type AppEventRow,
  type AppEventSummary,
} from "@/lib/observability/app-event";

/** 요약 조회 범위(일). 30일 보존이라 그보다 길게 볼 이유가 없다. */
export const APP_EVENT_LOOKBACK_DAYS = 14;
/** 한 번에 읽는 최대 행 수 — 표가 커져도 화면이 안 죽게. */
const MAX_ROWS = 5000;

export type AppEventsView = {
  summary: AppEventSummary;
  /** 최근 발생 몇 건(원본 확인용). */
  recent: AppEventRow[];
  lookbackDays: number;
};

const EMPTY: AppEventsView = {
  summary: summarizeAppEvents([]),
  recent: [],
  lookbackDays: APP_EVENT_LOOKBACK_DAYS,
};

/** 관리자 화면용 — 종류·화면·버전·기기별 집계 + 최근 발생. 관리자가 아니면 빈 결과. */
export async function getAppEvents(recentLimit = 40): Promise<AppEventsView> {
  if (!(await isAdminUser())) return EMPTY;

  const since = new Date(
    Date.now() - APP_EVENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_events")
    .select(
      "kind, severity, route, message, app_version, platform, device, value, count, occurred_at",
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(MAX_ROWS);

  const rows = (data ?? []) as AppEventRow[];
  return {
    summary: summarizeAppEvents(rows),
    recent: rows.slice(0, recentLimit),
    lookbackDays: APP_EVENT_LOOKBACK_DAYS,
  };
}
