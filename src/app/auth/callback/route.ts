import { NextResponse } from "next/server";
import { isNativeAppFrom } from "@/lib/platform/is-native-app";

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
  const oauthError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  // 외부 브라우저는 HTTPS OAuth 리다이렉트를 App Link 로 넘기지 않을 수 있다.
  // 앱에서 시작한 인증은 code 를 교환하지 않고 전용 스킴으로 앱에 먼저 돌려보낸다.
  // 앱 WebView 가 이 route 를 다시 열어야 저장된 PKCE verifier 쿠키로 교환된다.
  const inApp = isNativeAppFrom(request.headers.get("user-agent") ?? "", undefined);
  if (url.searchParams.get("native") === "1" && !inApp) {
    const appCallback = new URL("helssu://auth/callback");
    if (code) appCallback.searchParams.set("code", code);
    appCallback.searchParams.set("next", next);
    if (oauthError) appCallback.searchParams.set("error", oauthError);
    // 리다이렉트만 하면 브라우저가 앱 실행을 막았을 때 복귀 수단이 사라진다.
    // URLSearchParams로 값이 인코딩된 고정 스킴 URL만 HTML 속성에 넣는다.
    const href = appCallback.toString().replaceAll("&", "&amp;");
    const nonce = crypto.randomUUID();
    return new NextResponse(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>헬쑤 앱으로 돌아가기</title>
<style nonce="${nonce}">body{font-family:system-ui,sans-serif;margin:0;padding:48px 24px;text-align:center;background:#fafafa;color:#18181b}main{max-width:400px;margin:auto}a{display:block;margin-top:24px;padding:16px;border-radius:12px;background:#18181b;color:white;text-decoration:none;font-weight:700}p{line-height:1.6}</style></head>
<body><main><h1>헬쑤 앱으로 돌아가기</h1><p>앱에서 로그인을 마무리해 주세요.<br>자동으로 열리지 않으면 아래 버튼을 눌러 주세요.</p><a id="open-app" href="${href}">헬쑤 앱으로 돌아가기</a></main>
<script nonce="${nonce}">window.location.replace(document.getElementById("open-app").href);</script></body></html>`, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
      },
    });
  }

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin),
    );
  }

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
