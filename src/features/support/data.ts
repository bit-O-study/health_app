import "server-only";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/features/admin/admin";
import { uuid, type Ticket } from "./model";

export async function supportAccess(admin = false) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/support");
  if (admin && !(await isAdminUser())) notFound();
  return { user, db: await createSupabaseServerClient() };
}
/** 회원 본인 문의 상세. (관리자용 메모·이력 조회는 통합 관리자 콘솔로 이전됨) */
export async function ticketDetail(id: string) {
  if (!uuid(id)) notFound();
  const { db } = await supportAccess();
  const { data: ticket, error } = await db.from("support_tickets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("문의를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  if (!ticket) notFound();
  const [messages, files] = await Promise.all([
    db.from("support_messages").select("id,body,is_admin,created_at").eq("ticket_id", id).order("created_at").limit(200),
    db.from("support_attachments").select("id,path").eq("ticket_id", id).eq("ready", true),
  ]);
  if ([messages, files].some(r => r.error)) throw new Error("문의 내역을 불러오지 못했어요.");
  const storage = createSupabaseAdminClient();
  const attachments = await Promise.all((files.data ?? []).map(async f => ({ id: f.id as string, url: storage ? (await storage.storage.from("support-private").createSignedUrl(f.path, 300)).data?.signedUrl : undefined })));
  return { ticket: ticket as Ticket, messages: messages.data ?? [], attachments };
}
