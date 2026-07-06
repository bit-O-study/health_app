import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type TeachingPost = {
  id: string;
  userId: string;
  authorName: string;
  exerciseSlug: string | null;
  exerciseTag: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string; // ISO
  isMine: boolean;
};

type Row = {
  id: string;
  user_id: string;
  author_name: string | null;
  exercise_slug: string | null;
  exercise_tag: string;
  video_url: string;
  caption: string | null;
  created_at: string;
};

/** 운동 티칭 영상 피드(공개 전체). 최신순. */
export async function getTeachingFeed(limit = 100): Promise<TeachingPost[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("teaching_posts")
    .select(
      "id, user_id, author_name, exercise_slug, exercise_tag, video_url, caption, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Row[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name?.trim() || "회원",
    exerciseSlug: r.exercise_slug,
    exerciseTag: r.exercise_tag,
    videoUrl: r.video_url,
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
  }));
}