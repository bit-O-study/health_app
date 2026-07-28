import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/features/auth/oauth-redirect";
import { destinationAfterLogin } from "@/features/auth/actions";
import { syncSocialProfileName } from "@/features/auth/sync-social-name";

export const dynamic = "force-dynamic";

/**
 * 구글/카카오 등 OAuth 로그인 콜백. Supabase 가 provider 인증 후 여기로
 * code 를 담아 돌려보내면, 세션으로 교환하고 원래 가려던 곳(next)으로 보낸다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    // 소셜 가입자는 이름이 프로필에 안 들어가 "회원"으로만 보였다 — 로그인할 때마다
    // 비어 있으면 공급자 메타데이터의 이름으로 채운다(이미 있으면 건드리지 않음).
    await syncSocialProfileName();
  }

  return NextResponse.redirect(
    new URL(await destinationAfterLogin(next), url.origin),
  );
}
