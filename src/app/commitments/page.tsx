import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getMyCommitments,
  getTodayChecklist,
} from "@/features/commitments/data-access";
import { getMyPledges } from "@/features/commitments/pledge-data";
import { getMyGroups } from "@/features/groups/data-access";
import { TodayChecklist } from "@/features/commitments/components/today-checklist";
import { PledgeList } from "@/features/commitments/components/pledge-list";
import { CommitmentManager } from "@/features/commitments/components/commitment-manager";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐" };

/**
 * 다짐 리스트(2026-10-06 개편) — 행동 다짐 카드(진행 중·성공·실패). 설문 생성은 없어졌다.
 * 예전에 만든 설문·지표 다짐은 지울 때까지 아래 '예전 다짐'으로 남는다.
 */
export default async function CommitmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments");

  const [pledges, groups, legacy, todayItems] = await Promise.all([
    getMyPledges(),
    getMyGroups(),
    getMyCommitments(),
    getTodayChecklist(),
  ]);
  const groupNames = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  return (
    <div className="app-page">
      <PageHeader title="다짐 리스트" />
      <main className="app-container space-y-5">
        <PledgeList pledges={pledges} groupNames={groupNames} />
        {legacy.length > 0 || todayItems.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500">예전 다짐</h2>
            <TodayChecklist items={todayItems} today={seoulYmd()} />
            <CommitmentManager commitments={legacy} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
