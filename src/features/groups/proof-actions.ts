"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

export type ProofActionResult = { ok: true } | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//.test(s);
}

/**
 * 오늘 운동 인증 움짤을 등록/교체한다 — 멤버당 하루 1개(upsert).
 * RLS 로 본인·그룹원만 쓸 수 있으나, 서버에서도 멤버십을 확인한다.
 */
export async function setGroupProofAction(
  groupId: string,
  mediaUrl: string,
  mediaType: "video" | "gif",
  caption?: string,
): Promise<ProofActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!groupId) return { ok: false, error: "그룹이 올바르지 않습니다." };
  if (!isHttpUrl(mediaUrl)) return { ok: false, error: "잘못된 미디어입니다." };
  const type = mediaType === "gif" ? "gif" : "video";
  const cap = caption?.trim().slice(0, 40) || null;

  const supabase = await createSupabaseServerClient();

  // 멤버십 확인(RLS 이중 방어) — 내가 이 그룹의 멤버여야 인증 가능.
  const { data: mem } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem) return { ok: false, error: "이 그룹의 멤버가 아닙니다." };

  const { error } = await supabase.from("group_proofs").upsert(
    {
      group_id: groupId,
      user_id: user.id,
      for_date: seoulYmd(),
      media_url: mediaUrl,
      media_type: type,
      caption: cap,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id,user_id,for_date" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}

/** 오늘 내 인증 움짤을 삭제한다(본인 것만). */
export async function deleteGroupProofAction(
  groupId: string,
): Promise<ProofActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("group_proofs")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("for_date", seoulYmd());
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}