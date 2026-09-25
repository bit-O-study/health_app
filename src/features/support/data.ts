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
export async function ticketDetail(id: string, admin: boolean) {
  if (!uuid(id)) notFound();
  const { db } = await supportAccess(admin);
  const { data: ticket, error } = await db.from("support_tickets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("문의를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  if (!ticket) notFound();
  const [messages, files, notes, events, deliveries] = await Promise.all([
    db.from("support_messages").select("id,body,is_admin,created_at").eq("ticket_id", id).order("created_at").limit(200),
    db.from("support_attachments").select("id,path").eq("ticket_id", id).eq("ready", true),
    admin ? db.from("support_internal_notes").select("id,body,created_at").eq("ticket_id", id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    admin ? db.from("support_events").select("id,kind,detail,created_at").eq("ticket_id", id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    admin ? db.from("support_notification_outbox").select("id,status,error_code,created_at").eq("ticket_id", id).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
  ]);
  if ([messages, files, notes, events, deliveries].some(r => r.error)) throw new Error("문의 내역을 불러오지 못했어요.");
  const storage = createSupabaseAdminClient();
  const attachments = await Promise.all((files.data ?? []).map(async f => ({ id: f.id as string, url: storage ? (await storage.storage.from("support-private").createSignedUrl(f.path, 300)).data?.signedUrl : undefined })));
  return { ticket: ticket as Ticket, messages: messages.data ?? [], attachments, notes: notes.data ?? [], events: events.data ?? [], deliveries: deliveries.data ?? [] };
}
