import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTrainerConnections } from "@/features/groups/share-prefs.server";
import { TrainerConnections } from "@/features/groups/components/trainer-connections";

export const dynamic = "force-dynamic";
export const metadata = { title: "트레이너 연결" };

export default async function TrainerConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/trainers");

  const connections = await getTrainerConnections();

  // 하위 화면 공통 틀 — 머리글(‹ 설정) + app-container(2026-09-16 8단계).
  return (
    <div className="app-page">
      <PageHeader title="트레이너 연결" back="설정" />
      <main className="app-container space-y-4">
        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          나를 보는 트레이너와, 트레이너에게 보여줄 항목을 정해요. 끈 항목은 트레이너
          화면에 &lsquo;비공개&rsquo; 로만 보여요.
        </p>

        <TrainerConnections initial={connections} />

        <p className="text-xs leading-5 text-zinc-400">
          그룹 랭킹(운동 kcal·일수)은 그룹원끼리 서로 보는 기능이라 이 스위치의 대상이
          아니에요. 랭킹에서도 빠지려면 연결을 끊어 주세요.
        </p>
      </main>
    </div>
  );
}
