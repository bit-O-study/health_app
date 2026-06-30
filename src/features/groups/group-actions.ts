"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";

export type GroupActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** 그룹 생성 — 생성자는 owner 멤버로 자동 가입. */
export async function createGroupAction(name: string): Promise<GroupActionResult> {
  const clean = name.trim().slice(0, 30);
  if (!clean) return { ok: false, error: "그룹 이름을 입력하세요." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("groups")
    .insert({ name: clean, owner_id: user.id })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "생성 실패" };
  const id = (data as { id: string }).id;

  const profile = await getUserProfile();
  const metaName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const displayName = (
    profile?.nickname?.trim() ||
    profile?.name?.trim() ||
    metaName.trim() ||
    user.email?.split("@")[0] ||
    "회원"
  ).slice(0, 30);

  const { error: memErr } = await supabase
    .from("group_members")
    .insert({ group_id: id, user_id: user.id, role: "owner", display_name: displayName });
  if (memErr) return { ok: false, error: memErr.message };

  revalidatePath("/groups");
  return { ok: true, id };
}

/** 공유 링크 토큰으로 그룹 참여. */
export async function joinGroupByTokenAction(
  token: string,
): Promise<GroupActionResult> {
  const clean = token.trim();
  if (!clean) return { ok: false, error: "초대 코드가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("join_group_by_token", { token: clean });
  if (error) return { ok: false, error: "유효하지 않은 초대 링크입니다." };

  revalidatePath("/groups");
  return { ok: true, id: data as string };
}

/** 그룹 나가기(본인 멤버십 삭제). */
export async function leaveGroupAction(groupId: string): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}

/** 그룹 삭제(소유자만 — RLS로 강제). */
export async function deleteGroupAction(groupId: string): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}
