import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import { getTeachingFeed } from "@/features/teaching/data-access";
import { TeachingBoard } from "@/features/teaching/components/teaching-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "운동 티칭" };

export default async function TeachingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/teaching");

  const [posts, canModerate] = await Promise.all([
    getTeachingFeed(),
    isPostModerator(),
  ]);

  return (
    <main className="w-full">
      <TeachingBoard
        initialPosts={posts}
        canModerate={canModerate}
        nowMs={Date.now()}
      />
    </main>
  );
}