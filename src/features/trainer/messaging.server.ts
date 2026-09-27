import "server-only";
import { randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { solapiAuthorization, solapiMessage, type Notification } from "./solapi";

/** Durable outbox: only a successful conditional claim sends, uncertain responses never auto-retry. */
export async function dispatchTrainerNotification(id: string): Promise<string> {
  const db = createSupabaseAdminClient();
  const apiKey = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  if (!db || !apiKey || !secret) return "알림은 대기 중이에요. 관리자가 발송 설정을 완료해야 전송돼요.";
  const { data } = await db.from("pt_notifications").select("*").eq("id", id).maybeSingle();
  if (!data) return "알림 내역을 확인하지 못했어요.";
  const note = data as Notification;
  const message = solapiMessage(note, { from: process.env.SOLAPI_FROM, pfId: process.env.SOLAPI_PFID,
    inviteTemplate: process.env.SOLAPI_INVITE_TEMPLATE_ID, disconnectTemplate: process.env.SOLAPI_DISCONNECT_TEMPLATE_ID });
  if (!message) return "알림은 대기 중이에요. 발신번호 또는 알림톡 템플릿 설정이 필요해요.";
  if (data.kind === "invite") {
    const { data: invite } = await db.from("pt_invites").select("canceled,accepted_by,expires_at").eq("id", data.invite_id).maybeSingle();
    const { data: active } = await db.rpc("pt_has_pass", { p_trainer: data.trainer_id });
    if (!invite || invite.canceled || invite.accepted_by || Date.parse(invite.expires_at) <= Date.now() || !active) return "초대가 만료되었거나 취소되어 발송하지 않았어요.";
  }
  const { data: claim, error: claimError } = await db.from("pt_notifications").update({ status: "processing" }).eq("id", id).in("status", ["queued", "failed"]).select("id").maybeSingle();
  if (claimError || !claim) return "이미 접수했거나 결과 확인이 필요한 알림이에요. 발송 내역을 확인해 주세요.";
  let status = "unknown";
  let providerId: string | null = null;
  try {
    const date = new Date().toISOString();
    const salt = randomBytes(16).toString("hex");
    const response = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: solapiAuthorization(apiKey, secret, date, salt) },
      body: JSON.stringify({ messages: [message] }), signal: AbortSignal.timeout(12_000),
    });
    const body = await response.json();
    providerId = typeof body.groupInfo?.groupId === "string" ? body.groupInfo.groupId : null;
    status = response.ok && providerId && (!body.failedMessageList || body.failedMessageList.length === 0) ? "submitted" : response.status >= 400 && response.status < 500 ? "failed" : "unknown";
  } catch { /* The provider may have accepted it. Do not send a duplicate automatically. */ }
  const { error } = await db.from("pt_notifications").update({ status, provider_id: providerId }).eq("id", id).eq("status", "processing");
  if (error || status === "unknown") return "발송 결과 확인이 필요해요. 중복 발송을 막기 위해 자동 재전송하지 않았어요.";
  return status === "submitted" ? "발송 업체에 접수했어요. 최종 수신 여부는 발송 내역에서 확인해 주세요." : "발송 업체가 요청을 거절했어요. 관리자가 발송 설정을 확인해야 해요.";
}