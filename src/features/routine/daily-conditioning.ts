import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { ConditioningRow } from "@/features/routine/conditioning";
import type { ConditioningKind } from "@/features/routine/conditioning-catalog";

type Row = {
  id: string;
  for_date: string;
  kind: string;
  position: number;
  item_id: string;
  duration_min: number | null;
  speed: number | string | null;
  incline: number | string | null;
  sets?: number | null;
  reps?: number | null;
  memo?: unknown;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** 특정 날짜의 워밍업/마무리 오버라이드. 없으면 빈 배열. */
export const getDailyConditioning = cache(async function getDailyConditioning(
  dateYmd: string,
): Promise<{ warmup: ConditioningRow[]; cooldown: ConditioningRow[] }> {
  const user = await getCurrentUser();
  if (!user) return { warmup: [], cooldown: [] };
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("daily_conditioning")
    .select(
      "id, for_date, kind, position, item_id, duration_min, speed, incline, sets, reps, memo",
    )
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .order("kind", { ascending: true })
    .order("position", { ascending: true });

  if (error || !data) return { warmup: [], cooldown: [] };

  const rows: ConditioningRow[] = (data as Row[]).map((r) => ({
    id: r.id,
    focus: "",
    kind: r.kind === "cooldown" ? "cooldown" : "warmup",
    position: r.position,
    itemId: r.item_id,
    durationMin: r.duration_min,
    speed: num(r.speed),
    incline: num(r.incline),
    sets: r.sets ?? null,
    reps: r.reps ?? null,
    memo: typeof r.memo === "string" && r.memo.trim() !== "" ? r.memo : null,
  }));

  return {
    warmup: rows.filter((r) => r.kind === "warmup"),
    cooldown: rows.filter((r) => r.kind === "cooldown"),
  };
});

/** 특정 날짜·종류의 오버라이드 존재 여부 */
export async function hasDailyOverride(
  dateYmd: string,
  kind: ConditioningKind,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("daily_conditioning")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .eq("kind", kind);

  return (count ?? 0) > 0;
}
