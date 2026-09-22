import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
  searchParams: Promise<{ g?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [groups, mode] = await Promise.all([getMyGroups(), getGroupMode()]);

  // 그룹이 없으면 만들기/참여 화면.
  if (groups.length === 0) {
    return (
      <div className="app-page">
        <PageHeader title="그룹" />
        {/* 설명 문장은 뺐다 — 아래 '새 그룹 만들기'가 할 일을 이미 말해 준다(2026-09-15). */}
        <main className="app-container">
          <GroupsClient groups={groups} mode={mode} />
        </main>
      </div>
    );
  }

  // 선택된 그룹(?g=) 이 내 그룹이면 그걸로, 아니면 첫 그룹으로 바로 입장.
  const { g, view } = await searchParams;
  const selectedId = g && groups.some((x) => x.id === g) ? g : groups[0].id;

  if (view === "ranking") {
    const ranking = await getGroupDetail(selectedId);
    if (!ranking) redirect("/groups");
    return <main className="app-page app-container space-y-4">
      <h1 className="text-2xl font-bold">이번 주 그룹 랭킹</h1>
      <nav aria-label="랭킹 그룹 선택" className="flex flex-wrap gap-2">{groups.map(group => <Link key={group.id} href={`/groups?view=ranking&g=${group.id}`} aria-current={group.id === selectedId ? "page" : undefined} className={"rounded-full border px-3 py-2 text-sm " + (group.id === selectedId ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "border-zinc-300")}>{group.name}</Link>)}</nav>
      <p className="text-sm text-zinc-500">{ranking.weekFrom} ~ {ranking.weekTo} · 운동 소비 칼로리 순</p>
      <ol className="space-y-2">{ranking.ranking.map(member => <li key={member.userId} className="app-card flex items-center gap-3 p-4"><span className="text-xl font-bold text-emerald-600">{member.rank}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.name}{member.isMe ? " · 나" : ""}</p><p className="text-xs text-zinc-500">운동 {member.days}일 · {member.workouts}개</p></div><span className="text-sm font-semibold">{Math.round(member.kcal).toLocaleString()} kcal</span></li>)}</ol>
    </main>;
  }
  // ── 오늘 운동 인증(움짤) 모드 ──────────────────────────────────────
  if (mode === "proof") {
    const board = await getGroupProofBoard(selectedId);
    if (!board) redirect("/groups");
    return (
      // 움짤 인증 피드 — 일반 흐름(문서 스크롤)이라 헤더까지 전체가 함께 스크롤되고,
      // body 의 상단 safe-area 패딩을 그대로 물려받아 상태바와 안 겹친다.
      <main className="app-page mx-auto w-full max-w-3xl">
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
    <main className="fixed inset-x-0 top-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] overflow-hidden">
      <GroupBoard detail={detail} groups={groups} />
    </main>
  );
}
