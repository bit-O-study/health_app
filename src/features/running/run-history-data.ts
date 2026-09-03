import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { RunHistoryRow } from "@/features/running/run-history-summary";

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
  route_points: unknown;
};

const COLUMNS =
  "id, for_date, mode, started_at, duration_sec, distance_m, avg_kmh, pace_sec_per_km, calories_kcal, average_heart_rate, max_heart_rate, heart_rate_sample_count, incline, route_points";

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
    routePointCount: Array.isArray(row.route_points) ? row.route_points.length : 0,
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

export async function getRecentRunSessions(limit = 5): Promise<RunHistoryRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("run_sessions")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as DbRunRow[]).map(mapRow);
}
