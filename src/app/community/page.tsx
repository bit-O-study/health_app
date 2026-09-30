import { redirect } from "next/navigation";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { countUnreadCommunityNotifications } from "@/features/community/community-notify.server";
import { getQuestionTags } from "@/features/community/data-access";
import { isPostModerator } from "@/features/admin/admin";
import { getAllGroups, getMyGroups } from "@/features/groups/data-access";
import { getFeedPage } from "@/features/community/feed-page.server";
import {
  getApplyTargets,
  getRoutineShares,
} from "@/features/routine-share/data-access";
import { CommunityBoard } from "@/features/community/components/community-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "커뮤니티" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view, q = "" } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/community");

  // 현재 탭에서 필요한 데이터만 조회한다.
  const isQuestionView = view === "question" || view === "question_open";
  const [posts, canModerate, routineShares, applyTargets, unread, questionTags] = await Promise.all([
    view === "routine" ? Promise.resolve(null) : getFeedPage(view ?? "workout", q),
    isPostModerator(),
    view === "routine" ? getRoutineShares() : Promise.resolve([]),
    view === "routine" ? getApplyTargets() : Promise.resolve([]),
    createSupabaseServerClient().then((db) => countUnreadCommunityNotifications(db)).catch(() => 0),
    isQuestionView ? getQuestionTags().catch(() => []) : Promise.resolve([]),
  ]);
  // 디버깅(관리자) 계정은 그룹탭에서 모든 그룹 글을 볼 수 있게 전체 그룹 목록을 넘긴다.
  const groups = canModerate ? await getAllGroups() : await getMyGroups();

  return (
    <main className="w-full">
      <CommunityBoard
        key={`${view ?? "workout"}:${q}`}
        initialView={view}
        initialSearch={q}
        initialPage={posts}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        initialPosts={posts?.posts ?? []}
        canModerate={canModerate}
        routineShares={routineShares}
        applyTargets={applyTargets}
        unreadNotifications={unread}
        questionTags={questionTags}
      />
    </main>
  );
}
