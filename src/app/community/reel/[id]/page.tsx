import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import { getTeachingPost } from "@/features/community/data-access";
import { ReelSingle } from "@/features/community/components/reel-single";

export const dynamic = "force-dynamic";
export const metadata = { title: "운동 영상" };

/** 운동 영상 한 편 — 공유 링크·알림으로 들어오는 곳(커뮤니티 3단계). */
export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/community/reel/${id}`);
  const [post, moderator] = await Promise.all([getTeachingPost(id), isPostModerator()]);
  if (!post) notFound();
  return <ReelSingle post={post} canModerate={moderator} />;
}
