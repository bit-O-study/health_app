import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  photoUrl: string;
  caption: string | null;
  createdAt: string; // ISO
  isMine: boolean;
};

type Row = {
  id: string;
  user_id: string;
  group_id: string | null;
  author_name: string | null;
  photo_url: string;
  caption: string | null;
  created_at: string;
};

/**
 * 내가 볼 수 있는 오운완 인증 글(공개글 + 내가 속한 그룹의 글). RLS가 가시성 필터.
 * 그룹별 탭에서 쓸 그룹 이름 태그를 함께 채운다.
 */
export async function getCommunityFeed(limit = 100): Promise<CommunityPost[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("community_posts")
    .select("id, user_id, group_id, author_name, photo_url, caption, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const groupIds = [
    ...new Set(rows.map((r) => r.group_id).filter((v): v is string => !!v)),
  ];
  const groupNameById = new Map<string, string>();
  if (groupIds.length > 0) {
    const { data: grps } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", groupIds);
    for (const g of (grps ?? []) as { id: string; name: string }[]) {
      groupNameById.set(g.id, g.name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name?.trim() || "회원",
    groupId: r.group_id,
    groupName: r.group_id ? (groupNameById.get(r.group_id) ?? null) : null,
    photoUrl: r.photo_url,
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
  }));
}
