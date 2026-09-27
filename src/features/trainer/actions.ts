"use server";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import { dispatchTrainerNotification } from "./messaging.server";
import { normalizePhone } from "./types";

async function notifyTrainer(id: string): Promise<string> {
  try {
    return await dispatchTrainerNotification(id);
  } catch {
    // The main transaction has already committed; notification failure must not hide it.
    // Delivery may be uncertain, so leave the outbox state intact and never retry here.
    return "알림 처리 중 문제가 발생했어요. 관리자가 발송 내역을 확인해야 해요.";
  }
}
export type TrainerResult = { ok: boolean; message: string; link?: string };
export async function trainerAction(_previous: TrainerResult, form: FormData): Promise<TrainerResult> {
  if (!(await getCurrentUser())) return { ok: false, message: "로그인이 필요해요." };
  const db = await createSupabaseServerClient();
  const text = (key: string) => String(form.get(key) ?? "");
  const intent = text("intent");
  const sharing = { p_workout: form.get("workout") === "on", p_diet: form.get("diet") === "on", p_body: form.get("body") === "on", p_prescription: form.get("prescription") === "on" };
  let rpc: string;
  let args: Record<string, unknown>;
  let link: string | undefined;
  if (intent === "request") {
    const phone = normalizePhone(text("phone"));
    if (!phone) return { ok: false, message: "휴대폰 번호를 확인해 주세요." };
    rpc = "pt_request_pass"; args = { p_name: text("name"), p_phone: phone };
  } else if (intent === "approve" || intent === "cancel") {
    if (!(await isAdminUser())) return { ok: false, message: "관리자만 변경할 수 있어요." };
    rpc = "pt_admin_pass"; args = { p_trainer: text("trainer"), p_start: text("start"), p_end: text("end"), p_seats: Number(text("seats")), p_active: intent === "approve" };
  } else if (intent === "invite") {
    const phone = normalizePhone(text("phone"));
    if (!phone) return { ok: false, message: "초대할 회원의 휴대폰 번호를 확인해 주세요." };
    const token = randomBytes(32).toString("hex");
    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) return { ok: false, message: "관리자가 앱 주소를 먼저 설정해야 해요." };
    link = new URL(`/trainer/invite/${token}`, origin).toString();
    rpc = "pt_create_invite"; args = { p_hash: createHash("sha256").update(token).digest("hex"), p_phone: phone, p_channel: text("channel"), p_url: link };
  } else if (intent === "accept") {
    if (form.get("consent") !== "on") return { ok: false, message: "트레이너 연결에 동의해 주세요." };
    rpc = "pt_accept_invite"; args = { p_hash: createHash("sha256").update(text("token")).digest("hex"), ...sharing };
  } else if (intent === "share") {
    rpc = "pt_update_sharing"; args = { p_link: text("connection"), ...sharing };
  } else if (intent === "disconnect") {
    if (form.get("confirm") !== "on") return { ok: false, message: "연결 삭제를 확인해 주세요." };
    rpc = "pt_disconnect"; args = { p_link: text("connection") };
  } else if (intent === "retry") {
    if (!(await isAdminUser())) return { ok: false, message: "관리자만 재전송할 수 있어요." };
    const message = await notifyTrainer(text("notification"));
    revalidatePath("/admin/trainers");
    return { ok: true, message };
  } else return { ok: false, message: "지원하지 않는 요청이에요." };
  const { data, error } = await db.rpc(rpc, args);
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "요청을 처리하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요." };
  let message = intent === "disconnect" ? "트레이너 연결을 삭제했어요. 관리 권한도 해제됐어요." : intent === "request" ? "신청했어요. 관리자 승인 후 트레이너 앱이 나타나요." : "저장했어요.";
  if ((intent === "invite" || intent === "disconnect") && typeof data === "string") message += " " + await notifyTrainer(data);
  for (const path of ["/home", "/trainer", "/settings/trainers", "/settings/trainer-pass", "/admin/trainers"]) revalidatePath(path);
  revalidatePath("/", "layout");
  if (intent === "accept") redirect("/settings/trainers");
  return { ok: true, message, link };
}