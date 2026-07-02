import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import { getMyGroups } from "@/features/groups/data-access";
import { getCommunityFeed } from "@/features/community/data-access";
import { CommunityBoard } from "@/features/community/components/community-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "커뮤니티" };

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/community");

  const [groups, posts, canModerate] = await Promise.all([
    getMyGroups(),
    getCommunityFeed(),
    isPostModerator(),
  ]);

  return (
    <main className="w-full">
      <CommunityBoard
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        initialPosts={posts}
        canModerate={canModerate}
      />
    </main>
  );
}
