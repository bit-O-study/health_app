import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  shouldFillProfileName,
  socialNameFromMetadata,
} from "@/features/auth/social-name";

/**
 * 로그인 직후 프로필 이름 채우기 — 소셜(구글/카카오) 가입자는 가입폼을 안 거쳐
 * profiles.name 이 비어 커뮤니티·관리자 화면에 "회원"으로만 보였다.
 *
 * - 이름이 이미 있으면 아무것도 하지 않는다(사용자가 바꾼 이름을 덮지 않음).
 * - 프로필 행이 아직 없으면(온보딩 전) 건너뛴다 — gender/experience 가 NOT NULL 이라
 *   여기서 행을 만들 수 없다. 온보딩 저장(saveProfileAction)이 같은 로직으로 채운다.
 */
export async function syncSocialProfileName(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = socialNameFromMetadata(
    user.user_metadata as Record<string, unknown> | null,
  );
  if (!name) return;

  const { data: prof } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prof) return;
  if (!shouldFillProfileName((prof as { name?: string | null }).name)) return;

  await supabase.from("profiles").update({ name }).eq("user_id", user.id);
}