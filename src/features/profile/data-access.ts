import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isBodyType,
  isExperienceLevel,
  isGender,
  type BodyType,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

export type UserProfile = {
  gender: Gender;
  experience: ExperienceLevel;
  heightCm: number | null;
  weightKg: number | null;
  bodyType: BodyType | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
};

type ProfileRow = {
  gender: unknown;
  experience: unknown;
  height_cm: unknown;
  weight_kg: unknown;
  body_type: unknown;
  body_fat_pct: unknown;
  muscle_mass_kg: unknown;
};

/** 현재 로그인 사용자의 온보딩 프로필을 반환합니다. 없으면 null. */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "gender, experience, height_cm, weight_kg, body_type, body_fat_pct, muscle_mass_kg",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  if (!isGender(row.gender) || !isExperienceLevel(row.experience)) {
    return null;
  }

  const n = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };

  return {
    gender: row.gender,
    experience: row.experience,
    heightCm: n(row.height_cm),
    weightKg: n(row.weight_kg),
    bodyType: isBodyType(row.body_type) ? row.body_type : null,
    bodyFatPct: n(row.body_fat_pct),
    muscleMassKg: n(row.muscle_mass_kg),
  };
}