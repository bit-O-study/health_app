"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 로그아웃 후 홈으로 이동 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/routine");
}

export type AuthActionResult = { ok: true } | { ok: false; error: string };

/**
 * 새 비밀번호로 변경(임시 비번 → 본인 비번). 클라이언트가 supabase.auth.updateUser
 * 로 비번을 바꾼 뒤 호출 — must_change_password 플래그를 내린다(본인-only update RLS).
 */
export async function clearMustChangePasswordAction(): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
