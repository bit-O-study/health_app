import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
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
      <main className="app-page app-container">
        <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
          이 그룹의 회원 관리는 그룹장만 볼 수 있어요.
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

  return (
    <main className="app-page app-container">
      {/* 복귀 스위치 — 트레이너 화면에서 '내 운동' 으로 돌아가는 길. 홈 헤더와 같은
          컴포넌트라 체크 위치(지금 어느 모드인지)가 두 화면에서 어긋나지 않는다. */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
          <ChevronLeft aria-hidden="true" size={16} />
          그룹
        </BackLink>
        <TrainerModeSwitch groups={ownedGroups} />
      </div>
      <TrainerBoardView {...board} />
    </main>
  );
}
