import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BodyMetricKey =
  | "weightKg"
  | "heightCm"
  | "bodyFatPct"
  | "muscleMassKg";

export type BodyLog = {
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  createdAt: string;
};

type BodyLogRow = {
  weight_kg: number | string | null;
  height_cm: number | null;
  body_fat_pct: number | string | null;
  muscle_mass_kg: number | string | null;
  created_at: string;
};

const num = (v: number | string | null): number | null =>
  v === null || v === "" ? null : Number(v);

/** 현재 사용자의 체형 측정 이력(오래된→최신). 그래프용, 최근 120건. */
export async function getBodyLogs(): Promise<BodyLog[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg, height_cm, body_fat_pct, muscle_mass_kg, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(120);

  if (error || !data) return [];

  return (data as BodyLogRow[]).map((r) => ({
    weightKg: num(r.weight_kg),
    heightCm: num(r.height_cm),
    bodyFatPct: num(r.body_fat_pct),
    muscleMassKg: num(r.muscle_mass_kg),
    createdAt: r.created_at,
  }));
}
