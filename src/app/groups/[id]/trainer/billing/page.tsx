import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { getTrainerBoard } from "@/features/groups/trainer-data";
import { getTeamSubscription } from "@/features/billing/team-store";
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
      <main className="app-page app-container">
        <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
          팀 요금제는 그룹장만 볼 수 있어요.
        </p>
        <p className="text-center">
          <Link
            href={`/groups/${id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
          >
            <ChevronLeft aria-hidden="true" size={16} /> 그룹으로
          </Link>
        </p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [sub, { count }] = await Promise.all([
    getTeamSubscription(id),
    supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", id),
  ]);

  return (
    <main className="app-page app-container">
      <Link
        href={`/groups/${id}/trainer`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        회원 관리
      </Link>

      <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">팀 요금제</h1>
      <p className="mb-5 mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        이용 중에는 <strong>{board.groupName}</strong> 회원 전원이 프리미엄으로 써요.
        회원이 따로 결제하지 않아요.
      </p>

      <TeamPlanForm
        groupId={id}
        today={seoulYmd()}
        memberCount={count ?? 0}
        initial={sub}
      />
    </main>
  );
}
