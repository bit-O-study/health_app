import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { ConditioningKind } from "@/features/routine/conditioning-catalog";

export type ConditioningRow = {
  id: string;
  focus: string;
  kind: ConditioningKind;
  position: number;
  itemId: string;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
};

type Row = {
  id: string;
  focus: string;
  kind: string;
  position: number;
  item_id: string;
  duration_min: number | null;
  speed: number | string | null;
  incline: number | string | null;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

function toRow(r: Row): ConditioningRow {
  return {
    id: r.id,
    focus: r.focus,
    kind: r.kind === "cooldown" ? "cooldown" : "warmup",
    position: r.position,
    itemId: r.item_id,
    durationMin: r.duration_min,
    speed: num(r.speed),
    incline: num(r.incline),
  };
}

/** 부위·종류별 컨디셔닝 항목(순서대로) */
export async function getConditioningForFocus(
  focus: string,
): Promise<{ warmup: ConditioningRow[]; cooldown: ConditioningRow[] }> {
  const user = await getCurrentUser();
  if (!user) return { warmup: [], cooldown: [] };
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("routine_conditioning")
    .select("id, focus, kind, position, item_id, duration_min, speed, incline")
    .eq("user_id", user.id)
    .eq("focus", focus)
    .order("kind", { ascending: true })
    .order("position", { ascending: true });

  if (error || !data) return { warmup: [], cooldown: [] };

  const rows = (data as Row[]).map(toRow);
  return {
    warmup: rows.filter((r) => r.kind === "warmup"),
    cooldown: rows.filter((r) => r.kind === "cooldown"),
  };
}
