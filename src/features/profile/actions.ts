"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isExperienceLevel,
  isGender,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

/**
 * 현재 사용자의 온보딩 프로필을 저장(없으면 생성, 있으면 갱신)합니다.
 * 가입 직후 온보딩 단계에서 호출됩니다.
 */
export async function saveProfileAction(
  gender: Gender,
  experience: ExperienceLevel,
): Promise<SaveProfileResult> {
  if (!isGender(gender) || !isExperienceLevel(experience)) {
    return { ok: false, error: "성별/경력 값이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      gender,
      experience,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}