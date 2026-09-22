import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTrainerBoard } from "@/features/groups/trainer-data";
import { TrainerBoardView } from "@/features/groups/components/trainer-board-view";
import { TrainerModeSwitch } from "@/features/groups/components/trainer-mode-switch";
import { getOwnedGroupsForSwitch } from "@/features/groups/trainer-switch.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 관리" };

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [board, ownedGroups] = await Promise.all([
    getTrainerBoard(id),
    getOwnedGroupsForSwitch(),
  ]);

  // 그룹장이 아니면 화면 자체를 안 준다(회원 목록은 트레이너만 본다).
  if (!board) {
    return (
      <div className="app-page">
        <PageHeader title="회원 관리" back="그룹으로" backHref={`/groups/${id}`} />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            이 그룹의 회원 관리는 그룹장만 볼 수 있어요.
          </p>
        </main>
      </div>
    );
  }

  // 큰 제목 머리글 — 팀 요금제는 제목 줄 오른쪽(2026-09-16 8단계).
  return (
    <div className="app-page">
      <PageHeader title="회원 관리" back="그룹">
        <Link
          href={`/groups/${id}/trainer/billing`}
          data-testid="billing-link"
          className="app-press inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-sm font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
        >
          팀 요금제
        </Link>
        <TrainerModeSwitch groups={ownedGroups} />
      </PageHeader>
      <main className="app-container">
        <TrainerBoardView {...board} />
      </main>
    </div>
  );
}
