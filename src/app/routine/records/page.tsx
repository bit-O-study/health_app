import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getHomeDashboard } from "@/features/home/home-data";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
export const dynamic = "force-dynamic";
export const metadata = { title: "운동 기록" };
// 이번 주 카드(WeeklyOverviewCard)는 '성장 그래프'(/settings/progress) 한 곳만 갖는다 — 여기선 링크로 보낸다.
export default async function RecordsPage() {
  if (!await getCurrentUser()) redirect("/login");
  const dashboard = await getHomeDashboard();
  return <div className="app-page">
    <PageHeader title="나의 운동 기록" />
    <main className="app-container space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Link className="app-card p-5 font-semibold text-brand" href="/settings/progress">성장 그래프 →</Link>
        <Link className="app-card p-5 font-semibold text-brand" href="/settings/score">운동 점수 · 근육 밸런스 →</Link>
      </div>
      <ContributionGraph days={dashboard.contributions} totalWorkoutDays={dashboard.workoutCount} />
      <Link href="/settings/history" className="block py-3 text-sm font-semibold text-brand">날짜별 상세 기록 →</Link>
    </main>
  </div>;
}
