import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isTrainingMode,
  type TrainingMode,
} from "@/features/profile/training-mode-shared";

/**
 * 로그인한 계정(profiles.training_mode)에 저장된 학습 모드. 없으면 null.
 * 쿠키·localStorage 가 모두 사라져도 '계정 기준'으로 모드를 복원하는 3단 폴백의 마지막 단계.
 * (온보딩 전이라 profiles 행이 없으면 null → 선택 화면.)
 */
export const getTrainingModeFromProfile = cache(
  async (): Promise<TrainingMode | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("training_mode")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    const v = (data as { training_mode: unknown }).training_mode;
    return isTrainingMode(v) ? v : null;
  },
);
