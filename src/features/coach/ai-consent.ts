import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * AI 맞춤 추천 동의 — 운동·식단·체중·체성분 **기록 요약**을 외부 AI(Gemini 등)로 보내기 전에
 * 한 번 받는다(처리방침 2·4항, 2026-09-30). 사진 분석(식단·인바디)은 사용자가 그 사진을
 * 직접 골라 보내는 것이라 이 동의와 별개다.
 *
 * 저장은 `profiles.ai_consent_at`(마이그레이션 202609300008). 칸이 아직 없거나 읽기에
 * 실패하면 **동의 안 한 것으로 본다** — 모르는 상태에서 건강 기록을 보내지 않는다.
 */
export async function hasAiConsent(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("ai_consent_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return false;
    return Boolean((data as { ai_consent_at?: string | null } | null)?.ai_consent_at);
  } catch {
    return false;
  }
}

/** 동의 저장(true) 또는 철회(false). 실패하면 false. */
export async function setAiConsent(agree: boolean): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ ai_consent_at: agree ? new Date().toISOString() : null })
      .eq("user_id", user.id);
    return !error;
  } catch {
    return false;
  }
}
