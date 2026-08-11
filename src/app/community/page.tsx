import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import { getAllGroups, getMyGroups } from "@/features/groups/data-access";
import { getUnifiedFeed } from "@/features/community/data-access";
import {
  getApplyTargets,
  getRoutineShares,
} from "@/features/routine-share/data-access";
import { CommunityBoard } from "@/features/community/components/community-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "커뮤니티" };

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/community");

  // 루틴 소개도 같이 — 탭을 눌렀을 때 왕복 없이 바로 뜨게(전부 한 묶음으로 발사).
  const [posts, canModerate, routineShares, applyTargets] = await Promise.all([
    getUnifiedFeed(),
    isPostModerator(),
    getRoutineShares(),
    getApplyTargets(),
  ]);
  // 디버깅(관리자) 계정은 그룹탭에서 모든 그룹 글을 볼 수 있게 전체 그룹 목록을 넘긴다.
  const groups = canModerate ? await getAllGroups() : await getMyGroups();

  return (
    <main className="w-full">
      <CommunityBoard
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        initialPosts={posts}
        canModerate={canModerate}
        routineShares={routineShares}
        applyTargets={applyTargets}
      />
    </main>
  );
}
