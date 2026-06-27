import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { type CycleLog, type Flow } from "@/features/cycle/cycle";

function isFlow(v: unknown): v is Flow {
  return v === "spotting" || v === "light" || v === "medium" || v === "heavy";
}

type Row = {
  for_date: string;
  is_period: boolean;
  flow: string | null;
  symptoms: string[] | null;
  note: string | null;
};

function toLog(r: Row): CycleLog {
  return {
    forDate: r.for_date,
    isPeriod: r.is_period === true,
    flow: isFlow(r.flow) ? r.flow : null,
    symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
    note: typeof r.note === "string" && r.note.trim() !== "" ? r.note : null,
  };
}

/** 기간 내 월경 기록. */
export async function getCycleLogsRange(
  from: string,
  to: string,
): Promise<CycleLog[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cycle_logs")
    .select("for_date, is_period, flow, symptoms, note")
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", to)
    .order("for_date", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(toLog);
}

const epochDay = (ymd: string): number => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** 생리 '시작일' 목록(연속 생리일의 첫날). 예측 입력용. 최근 1년. */
export async function getPeriodStartDates(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cycle_logs")
    .select("for_date")
    .eq("user_id", user.id)
    .eq("is_period", true)
    .order("for_date", { ascending: true });
  const days = (data ?? []).map((r) => (r as { for_date: string }).for_date);
  const set = new Set(days.map(epochDay));
  // 전날이 생리일이 아니면 그 날이 '시작일'.
  return days.filter((d) => !set.has(epochDay(d) - 1));
}
