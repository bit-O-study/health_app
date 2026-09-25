"use server";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { diagnostics, uuid, validateTicket } from "./model";
import { dispatchSupport, pushSupport } from "./messaging.server";

function refresh(id?: string) {
  revalidatePath("/support"); revalidatePath("/admin/support");
  if (id) { revalidatePath(`/support/${id}`); revalidatePath(`/admin/support/${id}`); }
}
export async function createTicket(input: { requestId: string; category: string; title: string; body: string; diagnostic: unknown }) {
  if (!(await getCurrentUser())) return { error: "로그인이 필요해요." };
  const error = validateTicket(input.category, input.title, input.body);
  if (error || !uuid(input.requestId)) return { error: error ?? "접수 번호가 올바르지 않아요." };
  const db = await createSupabaseServerClient();
  const result = await db.rpc("support_create", { p_request: input.requestId, p_category: input.category, p_title: input.title, p_body: input.body, p_diagnostics: diagnostics(input.diagnostic) });
  if (result.error) return { error: "접수하지 못했어요. 잠시 후 다시 시도해 주세요. (짧은 시간에 여러 문의를 보내면 제한돼요.)" };
  after(async () => { await Promise.allSettled([dispatchSupport({ ticketId: result.data }), pushSupport(result.data)]); });
  refresh(); return { id: result.data as string };
}
export async function replyTicket(id: string, requestId: string, body: string, internal = false) {
  if (!uuid(id) || !uuid(requestId) || !body.trim() || body.length > 5000) return { error: "내용은 1~5000자로 입력해 주세요." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("support_reply", { p_ticket: id, p_request: requestId, p_body: body, p_internal: internal });
  if (error) return { error: "저장하지 못했어요. 권한과 접속 상태를 확인해 주세요." };
  refresh(id); return { ok: true };
}
export async function manageTicket(id: string, status: string, priority: string, assign: boolean) {
  if (!uuid(id) || !(await isAdminUser())) return { error: "관리자 권한이 필요해요." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("support_manage", { p_ticket: id, p_status: status, p_priority: priority, p_assign: assign });
  if (error) return { error: "변경하지 못했어요." };
  refresh(id); return { ok: true };
}
export async function readTicket(id: string) {
  if (!uuid(id)) return;
  const db = await createSupabaseServerClient();
  await db.rpc("support_read", { p_ticket: id });
}
export async function supportNotificationAction(kind: "save" | "disconnect" | "test" | "dispatch", enabled = true, push = false) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser())) return { error: "관리자 권한이 필요해요." };
  const db = createSupabaseAdminClient();
  if (!db) return { error: "서버 관리자 키 설정이 필요해요." };
  if (kind === "save") {
    const { error } = await db.from("support_kakao_connections").upsert({ user_id: user.id, enabled, push_enabled: push }, { onConflict: "user_id" });
    if (error) return { error: "설정을 저장하지 못했어요." };
  } else if (kind === "disconnect") {
    const { error } = await db.from("support_kakao_connections").update({ state: "disconnected", tokens: null, kakao_id: null, lease_id: null, lease_until: null }).eq("user_id", user.id);
    if (error) return { error: "연결 해제에 실패했어요." };
    await db.from("support_notification_outbox").update({ status: "canceled" }).eq("recipient_id", user.id).in("status", ["queued", "quota_deferred", "needs_reconnect"]);
  } else if (kind === "test") {
    const { data: c } = await db.from("support_kakao_connections").select("state,enabled").eq("user_id", user.id).maybeSingle();
    if (!c || c.state !== "connected" || !c.enabled) return { error: "먼저 카카오 계정을 연결하고 알림을 켜 주세요." };
    const { count } = await db.from("support_notification_outbox").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("kind", "test").gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if ((count ?? 15) >= 3) return { error: "테스트 발송은 하루 3회까지예요." };
    const { error } = await db.from("support_notification_outbox").insert({ event_id: randomUUID(), recipient_id: user.id, kind: "test" });
    if (error) return { error: "테스트 요청을 저장하지 못했어요." };
    await dispatchSupport({ recipientId: user.id, test: true });
  } else if (kind === "dispatch") await dispatchSupport({ recipientId: user.id });
  revalidatePath("/admin/support/notifications");
  return { ok: true };
}

export async function retrySupportNotification(id: string, confirmed: boolean) {
  if (!confirmed || !uuid(id) || !(await isAdminUser())) return { error: "중복 수신 가능성을 확인해 주세요." };
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("support_retry", { p_id: id });
  if (error) return { error: "재전송할 수 없어요. 이미 처리된 요청인지 확인해 주세요." };
  after(async () => { await dispatchSupport({recipientId:user.id}).catch(()=>undefined); });
  revalidatePath("/admin/support/notifications");return {ok:true};
}
