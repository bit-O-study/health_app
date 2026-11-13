import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getHomeDashboard } from "@/features/home/home-data";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
export const dynamic = "force-dynamic";
export const metadata = { title: "운동 기록" };
// 이번 주 카드(WeeklyOverviewCard)는 '성장 그래프'(/settings/progress) 한 곳만 갖는다 — 여기선 링크로 보낸다.
// 한 줄짜리 링크는 박스 타일 대신 48px 구분선 행으로 둔다(UI 검수 2026-11-11).
const rowCls = "flex min-h-12 items-center justify-between border-t border-line px-1 font-semibold text-brand";
export default async function RecordsPage() {
  if (!await getCurrentUser()) redirect("/login");
  const dashboard = await getHomeDashboard();
  return <div className="app-page">
    <PageHeader branded title="나의 운동 기록" />
    <main className="app-container space-y-4">
      <nav aria-label="기록 바로가기">
        <Link className={rowCls} href="/settings/progress">성장 그래프<ChevronRight size={18} aria-hidden="true" /></Link>
        <Link className={rowCls} href="/settings/score">운동 점수 · 근육 밸런스<ChevronRight size={18} aria-hidden="true" /></Link>
      </nav>
      <ContributionGraph days={dashboard.contributions} totalWorkoutDays={dashboard.workoutCount} />
      <Link href="/settings/history" className={`${rowCls} border-y`}>날짜별 상세 기록<ChevronRight size={18} aria-hidden="true" /></Link>
    </main>
  </div>;
}
