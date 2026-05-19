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
};

type ProfileRow = {
  gender: unknown;
  experience: unknown;
  height_cm: unknown;
  weight_kg: unknown;
  body_type: unknown;
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
    .select("gender, experience, height_cm, weight_kg, body_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  if (!isGender(row.gender) || !isExperienceLevel(row.experience)) {
    return null;
  }

  return {
    gender: row.gender,
    experience: row.experience,
    heightCm: typeof row.height_cm === "number" ? row.height_cm : null,
    weightKg: typeof row.weight_kg === "number" ? row.weight_kg : null,
    bodyType: isBodyType(row.body_type) ? row.body_type : null,
  };
}