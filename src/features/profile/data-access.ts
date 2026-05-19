import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isExperienceLevel,
  isGender,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

export type UserProfile = {
  gender: Gender;
  experience: ExperienceLevel;
};

type ProfileRow = {
  gender: unknown;
  experience: unknown;
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
    .select("gender, experience")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  if (!isGender(row.gender) || !isExperienceLevel(row.experience)) {
    return null;
  }

  return { gender: row.gender, experience: row.experience };
}