import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

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
  // getCurrentUser 는 요청 단위 cache() 라 다른 헬퍼와 인증 왕복을 공유(중복 제거).
  const [supabase, user] = await Promise.all([
    createSupabaseServerClient(),
    getCurrentUser(),
  ]);
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

/**
 * 최근 체중 두 건(오래된→최신) — 캘린더의 '현재 체중 · 직전 대비' 한 줄용.
 * 그래프용 `getBodyLogs`(120건)를 끌어와 마지막 두 개만 쓰던 것을 줄였다(캘린더 속도 정리).
 * 체중이 빈 측정(체지방만 잰 날)은 건너뛴다 — `computeWeightDelta` 와 같은 기준.
 */
export async function getLatestWeights(): Promise<BodyLog[]> {
  const [supabase, user] = await Promise.all([
    createSupabaseServerClient(),
    getCurrentUser(),
  ]);
  if (!user) return [];
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg, height_cm, body_fat_pct, muscle_mass_kg, created_at")
    .eq("user_id", user.id)
    .not("weight_kg", "is", null)
    .order("created_at", { ascending: false })
    .limit(2);
  if (error || !data) return [];
  return (data as BodyLogRow[])
    .map((r) => ({
      weightKg: num(r.weight_kg),
      heightCm: r.height_cm,
      bodyFatPct: num(r.body_fat_pct),
      muscleMassKg: num(r.muscle_mass_kg),
      createdAt: r.created_at,
    }))
    .reverse();
}
