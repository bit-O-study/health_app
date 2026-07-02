import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import {
  getCommunityPostDetail,
  getPostComments,
} from "@/features/community/data-access";
import { PostDetail } from "@/features/community/components/post-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "게시물" };

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/community/${id}`);

  const [post, comments, moderator] = await Promise.all([
    getCommunityPostDetail(id),
    getPostComments(id),
    isPostModerator(),
  ]);
  if (!post) notFound();

  return (
    <main className="w-full">
      <PostDetail
        post={post}
        initialComments={comments}
        canManage={post.isMine || moderator}
      />
    </main>
  );
}
