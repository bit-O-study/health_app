import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupportOrigin, uuid } from "@/features/support/model";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!isSupportOrigin(req.headers.get("origin"), req.headers.get("host"))) return Response.json({ error: "요청 출처가 올바르지 않아요." }, { status: 403 });
  const limit = Number(process.env.SUPPORT_STORAGE_BUDGET_BYTES ?? 0);
  const admin = createSupabaseAdminClient();
  if (!admin || !Number.isSafeInteger(limit) || limit <= 0) return Response.json({ error: "사진 첨부는 무료 저장 공간 확인 후 사용할 수 있어요. 텍스트 문의는 정상 접수됩니다." }, { status: 503 });
  if (Number(req.headers.get("content-length")) > 6*1024*1024) return Response.json({ error: "사진은 5MB 이하여야 해요." }, { status: 413 });
  try {
    // Bound chunked requests as well as Content-Length.
    const reader = req.body?.getReader();
    if (!reader) throw new Error("사진이 없어요.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 6*1024*1024) { await reader.cancel(); throw new Error("사진은 5MB 이하여야 해요."); } chunks.push(r.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file"), ticket = form.get("ticket");
    if (!(file instanceof File) || file.size>5*1024*1024 || !uuid(ticket)) throw new Error("사진과 문의 번호를 확인해 주세요.");
    const db = await createSupabaseServerClient();
    const { data: owned } = await db.from("support_tickets").select("id").eq("id", ticket).eq("user_id", user.id).maybeSingle();
    if (!owned) return Response.json({ error: "접근할 수 없어요." }, { status: 403 });
    const source = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(source, { limitInputPixels: 20000000 }).metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1)>1) throw new Error("JPG·PNG·WebP 정지 이미지만 첨부할 수 있어요.");
    const image = await sharp(source, { limitInputPixels: 20000000 }).rotate().resize(1600,1600,{fit:"inside",withoutEnlargement:true}).webp({quality:70}).toBuffer();
    if (image.length>512000) throw new Error("사진이 복잡하거나 너무 커요. 더 작은 사진을 선택해 주세요.");
    const path = `${user.id}/${ticket}/${randomUUID()}.webp`;
    const { data: id, error } = await admin.rpc("support_reserve_attachment", { p_user:user.id,p_ticket:ticket,p_path:path,p_bytes:image.length,p_limit:limit });
    if (error) return Response.json({ error: "사진은 문의당 3장까지이며 무료 저장 한도 안에서 첨부할 수 있어요." }, { status: 400 });
    const uploaded = await admin.storage.from("support-private").upload(path,image,{contentType:"image/webp",upsert:false});
    if (uploaded.error) { await admin.from("support_attachments").delete().eq("id",id); throw new Error("사진 저장에 실패했어요. 다시 시도해 주세요."); }
    const saved = await admin.from("support_attachments").update({ready:true}).eq("id",id);
    if (saved.error) throw new Error("사진 확인에 실패했어요. 문의 내용은 저장돼 있어요.");
    return Response.json({ok:true});
  } catch { return Response.json({ error: "사진을 첨부하지 못했어요. JPG·PNG·WebP 5MB 이하로 다시 시도해 주세요. 문의 내용은 유지됩니다." }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({error:"로그인이 필요해요."},{status:401});
  if (!isSupportOrigin(req.headers.get("origin"), req.headers.get("host"))) return Response.json({error:"요청 출처가 올바르지 않아요."},{status:403});
  const {id}=await req.json().catch(()=>({}));
  if(!uuid(id))return Response.json({error:"사진 번호를 확인해 주세요."},{status:400});
  const db=await createSupabaseServerClient();
  const {data:file}=await db.from("support_attachments").select("id,path").eq("id",id).maybeSingle();
  if(!file)return Response.json({error:"접근할 수 없어요."},{status:403});
  const service=createSupabaseAdminClient();
  if(!service)return Response.json({error:"저장소 설정을 확인해 주세요."},{status:503});
  const removed=await service.storage.from("support-private").remove([file.path]);
  if(removed.error)return Response.json({error:"사진을 삭제하지 못했어요."},{status:503});
  const result=await service.from("support_attachments").delete().eq("id",id);
  return Response.json(result.error?{error:"삭제 결과를 확인하지 못했어요."}:{ok:true});
}
