import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups, getGroupDetail } from "@/features/groups/data-access";
import { GroupsClient } from "@/features/groups/components/groups-client";
import { GroupBoard } from "@/features/groups/components/group-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹" };

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await getMyGroups();

  // 그룹이 없으면 만들기/참여 화면.
  if (groups.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">그룹</h1>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          그룹을 만들어 친구와 이번 주 운동 랭킹대전을 펼쳐보세요.
        </p>
        <GroupsClient groups={groups} />
      </main>
    );
  }

  // 선택된 그룹(?g=) 이 내 그룹이면 그걸로, 아니면 첫 그룹으로 바로 입장.
  const { g } = await searchParams;
  const selectedId =
    g && groups.some((x) => x.id === g) ? g : groups[0].id;
  const detail = await getGroupDetail(selectedId);
  if (!detail) {
    // 이례적(탈퇴 직후 등) — 목록 새로고침 겸 첫 그룹으로.
    redirect("/groups");
  }

  return (
    // 전체화면 헬스장 — 아래 탭(4rem) + 폰 홈인디케이터(safe-area)만큼 빼고 한 화면에 딱.
    <main className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden">
      <GroupBoard detail={detail} groups={groups} />
    </main>
  );
}
