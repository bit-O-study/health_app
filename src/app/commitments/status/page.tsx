import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyPledges } from "@/features/commitments/pledge-data";
import { PledgeStatusView } from "@/features/commitments/components/pledge-status";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐 현황" };

/** 다짐 현황 — 이번 7일 구간 진행과 식단 미기록 날짜. */
export default async function PledgeStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments/status");
  const pledges = await getMyPledges();
  return (
    <div className="app-page">
      <PageHeader title="다짐 현황" />
      <main className="app-container">
        <PledgeStatusView pledges={pledges} today={seoulYmd()} />
      </main>
    </div>
  );
}
