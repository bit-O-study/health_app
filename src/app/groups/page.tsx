import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups, getGroupDetail } from "@/features/groups/data-access";
import { getGroupProofBoard } from "@/features/groups/proof-data";
import { getGroupMode } from "@/features/groups/group-mode.server";
import { GroupsClient } from "@/features/groups/components/groups-client";
import { GroupBoard } from "@/features/groups/components/group-board";
import { GroupProofBoard } from "@/features/groups/components/group-proof-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹" };

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [groups, mode] = await Promise.all([getMyGroups(), getGroupMode()]);

  // 그룹이 없으면 만들기/참여 화면.
  if (groups.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">그룹</h1>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "proof"
            ? "그룹을 만들어 친구와 오늘 운동 인증을 서로 남겨보세요."
            : "그룹을 만들어 친구와 이번 주 운동 랭킹대전을 펼쳐보세요."}
        </p>
        <GroupsClient groups={groups} mode={mode} />
      </main>
    );
  }

  // 선택된 그룹(?g=) 이 내 그룹이면 그걸로, 아니면 첫 그룹으로 바로 입장.
  const { g } = await searchParams;
  const selectedId = g && groups.some((x) => x.id === g) ? g : groups[0].id;

  // ── 오늘 운동 인증(움짤) 모드 ──────────────────────────────────────
  if (mode === "proof") {
    const board = await getGroupProofBoard(selectedId);
    if (!board) redirect("/groups");
    return (
      // 움짤 인증 피드 — 일반 흐름(문서 스크롤)이라 헤더까지 전체가 함께 스크롤되고,
      // body 의 상단 safe-area 패딩을 그대로 물려받아 상태바와 안 겹친다.
      <main className="mx-auto w-full max-w-2xl">
        <GroupProofBoard board={board} groups={groups} />
      </main>
    );
  }

  // ── 기존 헬스장(공유펫·랭킹) 모드 ─────────────────────────────────
  const detail = await getGroupDetail(selectedId);
  if (!detail) {
    // 이례적(탈퇴 직후 등) — 목록 새로고침 겸 첫 그룹으로.
    redirect("/groups");
  }

  return (
    // 전체화면 헬스장 — 상단~하단탭(4rem+safe) 사이에 fixed 로 고정.
    // dvh 계산/바디 패딩에 의존하지 않아 어떤 기기에서도 스크롤이 생기지 않는다.
    <main className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] overflow-hidden">
      <GroupBoard detail={detail} groups={groups} />
    </main>
  );
}
