"use server";

import { cookies } from "next/headers";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isTrainingMode,
  MODE_COOKIE,
  MODE_COOKIE_MAX_AGE,
  type TrainingMode,
} from "@/features/profile/training-mode-shared";

/**
 * 학습 모드 저장 — durable 쿠키 + 계정(profiles.training_mode) 둘 다.
 * 클라도 즉시 localStorage/쿠키를 심지만, 서버에서 한 번 더 확실히 저장해 앱에서 값이
 * 사라져도 '모드 선택'이 다시 안 뜨게 한다. (온보딩 전이면 profiles 업데이트는 no-op.)
 */
export async function saveTrainingModeAction(
  mode: TrainingMode,
): Promise<{ ok: boolean }> {
  if (!isTrainingMode(mode)) return { ok: false };

  // 쿠키(서버측) — 다음 '/' 로드 때 서버가 바로 리다이렉트할 수 있게.
  (await cookies()).set(MODE_COOKIE, mode, {
    path: "/",
    maxAge: MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  // 계정에도 저장(온보딩 완료 사용자만 행이 있어 반영됨).
  const user = await getCurrentUser();
  if (user) {
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("profiles")
      .update({ training_mode: mode })
      .eq("user_id", user.id);
  }
  return { ok: true };
}
