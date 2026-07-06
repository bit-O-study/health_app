"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import { normalizeTag, validateTeachingPost } from "./teaching";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** 운동 티칭 영상 글 작성. 공개 피드. exerciseSlug 는 앱 카탈로그 운동이면 채운다. */
export async function createTeachingPostAction(input: {
  videoUrl: string;
  exerciseTag: string;
  exerciseSlug?: string | null;
  caption: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const check = validateTeachingPost({
    videoUrl: input.videoUrl,
    exerciseTag: input.exerciseTag,
    caption: input.caption,
  });
  if (!check.ok) return check;

  const supabase = await createSupabaseServerClient();

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
    .from("teaching_posts")
    .insert({
      user_id: user.id,
      author_name: authorName,
      exercise_slug: input.exerciseSlug?.trim() || null,
      exercise_tag: normalizeTag(input.exerciseTag),
      video_url: input.videoUrl.trim(),
      caption: caption.length > 0 ? caption : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/teaching");
  return { ok: true, id: (data as { id: string }).id };
}

/** 티칭 글 삭제 — 본인 또는 게시물 관리자(모더레이터). 권한은 RLS가 강제. */
export async function deleteTeachingPostAction(
  id: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("teaching_posts").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/teaching");
  return { ok: true };
}