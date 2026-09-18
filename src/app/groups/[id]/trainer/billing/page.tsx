import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { getTrainerBoard } from "@/features/groups/trainer-data";
import { getDepositInfo, getTeamSubscription } from "@/features/billing/team-store";
import { TeamPlanForm } from "@/features/billing/components/team-plan-form";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "팀 요금제" };

export default async function TeamBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  // 그룹장 확인은 회원 관리와 같은 조회를 쓴다(규칙을 두 벌 두지 않는다).
  const board = await getTrainerBoard(id);
  if (!board) {
    return (
      <div className="app-page">
        <PageHeader title="팀 요금제" back="그룹으로" backHref={`/groups/${id}`} />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            팀 요금제는 그룹장만 볼 수 있어요.
          </p>
        </main>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [sub, deposit, { count }] = await Promise.all([
    getTeamSubscription(id),
    getDepositInfo(),
    supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", id),
  ]);

  return (
    <div className="app-page">
      <PageHeader title="팀 요금제" back="회원 관리" backHref={`/groups/${id}/trainer`} />
      <main className="app-container space-y-3">
      <p className="-mt-1 truncate px-1 text-sm text-zinc-500 dark:text-zinc-400">
        {board.groupName} 회원 전원 프리미엄 · 회원 결제 없음
      </p>

      <TeamPlanForm
        groupId={id}
        today={seoulYmd()}
        memberCount={count ?? 0}
        initial={sub}
        deposit={deposit}
      />
      </main>
    </div>
  );
}
