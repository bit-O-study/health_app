import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { RunHistoryRow } from "@/features/running/run-history-summary";
import type { RunRoutePoint } from "@/features/running/run-session";

type DbRunRow = {
  id: string;
  for_date: string;
  mode: "indoor" | "outdoor";
  started_at: string;
  duration_sec: number;
  distance_m: number;
  avg_kmh: number | string;
  pace_sec_per_km: number | null;
  calories_kcal: number;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  heart_rate_sample_count: number;
  incline: number | null;
  route_point_count: number | null;
};

const COLUMNS =
  "id, for_date, mode, started_at, duration_sec, distance_m, avg_kmh, pace_sec_per_km, calories_kcal, average_heart_rate, max_heart_rate, heart_rate_sample_count, incline, route_point_count";
// ⚠ 목록에는 route_points(최대 2,000점)를 싣지 않는다 — 개수는 DB 생성 열 route_point_count. 경로는 상세(getRunSession)에서만.

function mapRow(row: DbRunRow): RunHistoryRow {
  return {
    id: row.id,
    forDate: row.for_date,
    mode: row.mode,
    startedAt: row.started_at,
    durationSec: row.duration_sec,
    distanceM: row.distance_m,
    avgKmh: Number(row.avg_kmh) || 0,
    paceSecPerKm: row.pace_sec_per_km,
    caloriesKcal: row.calories_kcal,
    averageHeartRate: row.average_heart_rate,
    maxHeartRate: row.max_heart_rate,
    heartRateSampleCount: row.heart_rate_sample_count,
    incline: row.incline,
    routePointCount: row.route_point_count ?? 0,
  };
}

export async function getRunSessionsRange(
  from: string,
  to: string,
): Promise<RunHistoryRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("run_sessions")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", to)
    .order("started_at", { ascending: false });
  return ((data ?? []) as DbRunRow[]).map(mapRow);
}

export type RunSessionDetail = RunHistoryRow & { endedAt: string; route: RunRoutePoint[] };

/** 런닝 한 건 + 전체 경로(상세 화면). 본인 기록이 아니거나 없으면 null(RLS 도 본인만 허용). */
export async function getRunSession(id: string): Promise<RunSessionDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("run_sessions")
    .select(`${COLUMNS}, ended_at, route_points`)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as DbRunRow & { ended_at: string; route_points: unknown };
  return {
    ...mapRow(row),
    endedAt: row.ended_at,
    route: Array.isArray(row.route_points) ? (row.route_points as RunRoutePoint[]) : [],
  };
}
