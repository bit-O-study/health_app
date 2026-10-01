import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPainAreas } from "@/features/routine/checkin-data";
import { PainAreaPicker } from "@/features/routine/components/pain-area-picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "아픈 부위" };

/** 아픈 부위(무료, 2026-09-30) — AI 트레이너 추천에서 빼고, 오늘 운동 화면에서 알린다. */
export default async function PainAreasPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/pain");
  const initial = await getPainAreas();
  return (
    <div className="app-page">
      <PageHeader title="아픈 부위" back="설정" />
      <main className="app-container space-y-3">
        <p className="px-1 text-sm text-zinc-600 dark:text-zinc-300">
          아픈 곳을 고르면 AI 트레이너가 그 부위 운동을 추천하지 않고, 오늘 운동에 그 부위가 있으면 알려 드려요.
          통증이 계속되면 운동보다 진료가 먼저예요.
        </p>
        <PainAreaPicker initial={initial} />
      </main>
    </div>
  );
}
