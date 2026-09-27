import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/features/admin/admin";
import { kakaoConfig } from "@/features/support/messaging.server";
import { seal } from "@/features/support/crypto";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser())) return new Response("Forbidden", { status: 403 });
  const config = kakaoConfig(), db = createSupabaseAdminClient();
  if (!config || !db) return new Response("서버 설정이 필요해요.", { status: 503 });
  const params = new URL(req.url).searchParams, jar = await cookies();
  const state = params.get("state");
  const expected = jar.get("support_oauth")?.value;
  jar.set("support_oauth", "", { path: "/api/support/kakao", maxAge: 0 });
  if (!state || state !== expected) return new Response("연결 요청이 만료됐어요. 다시 연결해 주세요.", { status: 400 });
  const { data, error } = await db.from("support_oauth_states").delete().eq("hash", createHash("sha256").update(state).digest("hex")).eq("user_id", user.id).gt("expires_at", new Date().toISOString()).select("hash").maybeSingle();
  if (error || !data) return new Response("이미 사용했거나 만료된 요청이에요.", { status: 400 });
  let success = false;
  try {
    const code = params.get("code");
    if (!code) throw new Error("denied");
    const form = new URLSearchParams({ grant_type: "authorization_code", client_id: config.key, redirect_uri: config.callback, code });
    if (config.secret) form.set("client_secret", config.secret);
    const response = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", body: form, signal: AbortSignal.timeout(8000) });
    const tokens = await response.json();
    if (!response.ok || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string" || !Number.isFinite(tokens.expires_in) || !Number.isFinite(tokens.refresh_token_expires_in)) throw new Error("token");
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    const [profile, permissions] = await Promise.all([
      fetch("https://kapi.kakao.com/v2/user/me", { headers, signal: AbortSignal.timeout(8000) }),
      fetch("https://kapi.kakao.com/v2/user/scopes", { headers, signal: AbortSignal.timeout(8000) }),
    ]);
    const me = await profile.json(), scopes = await permissions.json();
    if (!profile.ok || !permissions.ok || !me.id || !scopes.scopes?.some((s: { id: string; agreed: boolean }) => s.id === "talk_message" && s.agreed)) throw new Error("scope");
    const { error: saveError } = await db.from("support_kakao_connections").upsert({ user_id: user.id, kakao_id: String(me.id), state: "connected", enabled: true, tokens: seal(JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token }), config.encryption), token_expires_at: new Date(Date.now()+tokens.expires_in*1000).toISOString(), refresh_expires_at: new Date(Date.now()+tokens.refresh_token_expires_in*1000).toISOString(), lease_id: null, lease_until: null, updated_at: new Date().toISOString() });
    success = !saveError;
  } catch { /* Do not expose authorization code or token response. */ }
  return NextResponse.redirect(`${config.authOrigin}/admin/support/notifications?connection=${success ? "ok" : "failed"}`);
}
