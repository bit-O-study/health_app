import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups } from "@/features/groups/data-access";
import { loadCompetition } from "@/features/groups/competition-data";
import { CompetitionBoard } from "@/features/groups/components/competition-board";
import { GroupNotificationBell } from "@/features/groups/components/group-notification-bell";
export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 순위" };
export default async function RankingPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  if (!await getCurrentUser()) redirect("/login");
  const [groups, query] = await Promise.all([getMyGroups(), searchParams]);
  const selected = groups.find(g => g.id === query.g) ?? groups[0];
  const initial = selected ? await loadCompetition(selected.id) : null;
  return <div className="app-page"><PageHeader title="그룹 순위"><GroupNotificationBell /></PageHeader>
    <main className="app-container space-y-4">
      {!selected ? <div className="app-card space-y-3 p-5"><p>그룹에 참여하면 함께 점수를 쌓고 순위를 겨룰 수 있어요.</p><Link className="text-brand" href="/groups/find">그룹 찾기 →</Link></div> : <>
        <nav aria-label="순위 그룹 선택" className="flex flex-wrap gap-2">{groups.map(g => <Link key={g.id} href={`/groups/ranking?g=${g.id}`} aria-current={g.id === selected.id ? "page" : undefined} className={`min-h-11 rounded-full border px-4 py-2 text-sm ${g.id === selected.id ? "border-brand bg-brand-soft text-brand" : "border-line"}`}>{g.name}</Link>)}</nav>
        {initial ? <CompetitionBoard key={selected.id} initial={initial} /> : <p role="alert">그룹 참여 상태를 확인해 주세요.</p>}
      </>}
    </main>
  </div>;
}
