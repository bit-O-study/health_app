import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getHomeDashboard } from "@/features/home/home-data";
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import { WeeklyReportCard } from "@/features/routine/components/weekly-report-card";
import { WeeklyTrainingSummary } from "@/features/routine/components/weekly-training-summary";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
export const dynamic = "force-dynamic";
export const metadata = { title: "운동 기록" };
export default async function RecordsPage() {
  if (!await getCurrentUser()) redirect("/login");
  const [dashboard, weekly, training] = await Promise.all([getHomeDashboard(), getWeeklyReport(), getMyWeeklyTraining()]);
  return <main className="app-page app-container space-y-4">
    <header><p className="text-xs font-semibold text-brand">운동</p><h1 className="mt-1 text-2xl font-bold">나의 운동 기록</h1><p className="mt-2 text-sm text-zinc-500">꾸준히 쌓아 온 변화를 확인하세요.</p></header>
    <div className="grid grid-cols-2 gap-3">
      <Link className="app-card p-5 font-bold text-brand" href="/settings/progress">성장 그래프 →</Link>
      <Link className="app-card p-5 font-bold text-brand" href="/settings/score">운동 점수 · 근육 밸런스 →</Link>
    </div>
    <WeeklyReportCard report={weekly} />
    {training && <WeeklyTrainingSummary regions={training.regions} weekSets={training.weekSets} />}
    <ContributionGraph days={dashboard.contributions} totalWorkoutDays={dashboard.workoutCount} />
    <Link href="/settings/history" className="block py-3 text-sm font-semibold text-brand">날짜별 상세 기록 →</Link>
  </main>;
}
