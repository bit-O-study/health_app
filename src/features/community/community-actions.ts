"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import { validatePostInput } from "./community";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** 오운완 인증 글 작성. groupId=null 이면 전체 공개, 값이 있으면 그 그룹에만. */
export async function createCommunityPostAction(input: {
  photoUrl: string;
  caption: string;
  groupId: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const check = validatePostInput({
    photoUrl: input.photoUrl,
    caption: input.caption,
  });
  if (!check.ok) return check;

  const supabase = await createSupabaseServerClient();

  // 작성자 표시 이름 스냅샷(닉네임 → 이름 → "회원").
  const { data: prof } = await supabase
    .from("profiles")
    .select("name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();
  const authorName = resolveMemberName(
    (prof as { nickname?: string | null } | null)?.nickname,
    (prof as { name?: string | null } | null)?.name,
    null,
  );

  const caption = input.caption.trim();
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      group_id: input.groupId,
      author_name: authorName,
      photo_url: input.photoUrl.trim(),
      caption: caption.length > 0 ? caption : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true, id: (data as { id: string }).id };
}

/** 내 인증 글 삭제(RLS로 본인 글만). */
export async function deleteCommunityPostAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}
