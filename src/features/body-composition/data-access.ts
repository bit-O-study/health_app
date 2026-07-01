import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { BodyComp } from "@/features/body-composition/data";

type Row = {
  measured_at: string;
  weight_kg: number | string | null;
  skeletal_muscle_kg: number | string | null;
  body_fat_kg: number | string | null;
  body_fat_pct: number | string | null;
  muscle_right_arm: number | string | null;
  muscle_left_arm: number | string | null;
  muscle_trunk: number | string | null;
  muscle_right_leg: number | string | null;
  muscle_left_leg: number | string | null;
  fat_right_arm: number | string | null;
  fat_left_arm: number | string | null;
  fat_trunk: number | string | null;
  fat_right_leg: number | string | null;
  fat_left_leg: number | string | null;
  image_path: string | null;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 가장 최근(measured_at desc) 체성분 1건. 없으면 null. */
export async function getLatestBodyComposition(): Promise<BodyComp | null> {
  const [supabase, user] = await Promise.all([
    createSupabaseServerClient(),
    getCurrentUser(),
  ]);
  if (!user) return null;

  const { data, error } = await supabase
    .from("body_compositions")
    .select(
      "measured_at, weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct, muscle_right_arm, muscle_left_arm, muscle_trunk, muscle_right_leg, muscle_left_leg, fat_right_arm, fat_left_arm, fat_trunk, fat_right_leg, fat_left_leg, image_path",
    )
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Row;
  return {
    measuredAt: r.measured_at,
    weightKg: num(r.weight_kg),
    skeletalMuscleKg: num(r.skeletal_muscle_kg),
    bodyFatKg: num(r.body_fat_kg),
    bodyFatPct: num(r.body_fat_pct),
    muscleRightArm: num(r.muscle_right_arm),
    muscleLeftArm: num(r.muscle_left_arm),
    muscleTrunk: num(r.muscle_trunk),
    muscleRightLeg: num(r.muscle_right_leg),
    muscleLeftLeg: num(r.muscle_left_leg),
    fatRightArm: num(r.fat_right_arm),
    fatLeftArm: num(r.fat_left_arm),
    fatTrunk: num(r.fat_trunk),
    fatRightLeg: num(r.fat_right_leg),
    fatLeftLeg: num(r.fat_left_leg),
    imagePath: r.image_path,
  };
}
