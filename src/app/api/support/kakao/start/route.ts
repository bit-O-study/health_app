import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/features/admin/admin";
import { kakaoConfig } from "@/features/support/messaging.server";
export const runtime = "nodejs";
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser())) return new Response("Forbidden", { status: 403 });
  const config = kakaoConfig(), db = createSupabaseAdminClient();
  if (!config || !db) return new Response("카카오 REST 키·서버 암호화 키·사이트 URL·서버 관리자 키 설정이 필요해요.", { status: 503 });
  const state = randomBytes(32).toString("hex");
  const { error } = await db.from("support_oauth_states").insert({ hash: createHash("sha256").update(state).digest("hex"), user_id: user.id, expires_at: new Date(Date.now()+600000).toISOString() });
  if (error) return new Response("연결 준비에 실패했어요.", { status: 503 });
  (await cookies()).set("support_oauth", state, { httpOnly: true, secure: config.authOrigin.startsWith("https:"), sameSite: "lax", path: "/api/support/kakao", maxAge: 600 });
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: config.key, redirect_uri: config.callback, response_type: "code", scope: "talk_message", state }).toString();
  return NextResponse.redirect(url);
}
