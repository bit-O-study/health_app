import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTrainerConnections } from "@/features/groups/share-prefs.server";
import { TrainerConnections } from "@/features/groups/components/trainer-connections";

export const dynamic = "force-dynamic";
export const metadata = { title: "트레이너 연결" };

export default async function TrainerConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/trainers");

  const connections = await getTrainerConnections();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        뒤로
      </BackLink>

      <div className="mb-6 mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          트레이너 연결
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          나를 보는 트레이너와, 트레이너에게 보여줄 항목을 정해요. 끈 항목은 트레이너
          화면에 &lsquo;비공개&rsquo; 로만 보여요.
        </p>
      </div>

      <TrainerConnections initial={connections} />

      <p className="mt-6 text-[11px] leading-5 text-zinc-400">
        그룹 랭킹(운동 kcal·일수)은 그룹원끼리 서로 보는 기능이라 이 스위치의 대상이
        아니에요. 랭킹에서도 빠지려면 연결을 끊어 주세요.
      </p>
    </main>
  );
}
