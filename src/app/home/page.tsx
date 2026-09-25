import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Settings, Target } from "lucide-react";
import { WeeklyReportCard } from "@/features/routine/components/weekly-report-card";
import { WeeklyTrainingSummary } from "@/features/routine/components/weekly-training-summary";
import { redirect } from "next/navigation";

import { PromoBanner } from "@/features/cross-promo/promo-banner";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { AppGrid } from "@/features/launcher/components/app-grid";
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
import { hasTrainerPass } from "@/features/trainer/data";
import { Logo } from "@/features/brand/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "앱을 골라 들어가고, 오늘 알아야 할 것만 한눈에.",
};

/** 홈 앱과 오늘의 다짐·주간 리포트. */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const editing = (await searchParams).edit === "apps";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ⚡ 프로필과 대시보드·주간 집계를 **동시에** 시작한다(원거리 리전 왕복 줄이기).
  const [profile, dashboard, weekly, training, showCoach, showPet, showTrainer] = await Promise.all([
    getUserProfile(),
    getHomeDashboard(),
    getWeeklyReport(),
    getMyWeeklyTraining(),
    // 헬쑤쌤 앱 타일은 디버그 기능이 켜진 사용자에게만 — 예전엔 하단바가 읽던 값이다.
    isDebugFeatureEnabled("helssu-coach"),
    isDebugFeatureEnabled("pet"),
    hasTrainerPass(),
  ]);
  if (!profile) redirect("/onboarding");

  const { todayCommitments } = dashboard;
  const doneCount = todayCommitments.filter(c => c.done).length;

  return (
    <div className="app-page overflow-x-clip">
      <main className="app-container space-y-4">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link href="/home" aria-label="헬쑤 홈"><Logo size={40} wordClassName="text-2xl" /></Link>
          <div className="flex items-center gap-1 pb-0.5">
            <NotificationBell />
            <Link href="/settings" aria-label="설정" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-white/[0.08]">
              <Settings size={21} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* 광고 배너는 맨 위 사진 배너 그대로(사용자 요청으로 원상복구, 2026-09-15). */}
        <PromoBanner />
        <PermissionNudge />

        {/* 앱 아이콘 판 — 여기서 각 앱으로 들어간다. */}
        <AppGrid initialEditing={editing} key={`${user.id}:${editing}`} userId={user.id} enabledFlags={[...(showCoach ? ["helssu-coach"] : []), ...(showPet ? ["pet"] : []), ...(showTrainer ? ["trainer-pass"] : [])]} />

            <Link
              href="/commitments"
              className="app-card group block p-4 transition hover:-translate-y-0.5 hover:border-brand/20 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Target aria-hidden="true" size={15} className="shrink-0 text-brand" />
                  <span className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">오늘의 다짐</span>
                  {todayCommitments.length > 0 ? (
                    <span className="shrink-0 text-xs font-bold tabular-nums text-brand">
                      {doneCount}/{todayCommitments.length}
                    </span>
                  ) : null}
                </div>
                <ArrowUpRight aria-hidden="true" size={16} className="shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-600" />
              </div>

              {todayCommitments.length === 0 ? (
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  오늘 진행 중인 다짐이 없어요. 작은 목표부터 만들어 보세요.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {todayCommitments.map((c) => (
                    <li key={c.id} className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${c.done ? "border-brand bg-brand text-white dark:text-zinc-950" : "border-zinc-300 dark:border-zinc-600"}`}>
                        {c.done ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                      </span>
                      <span className={`text-safe min-w-0 flex-1 text-sm leading-5 ${c.done ? "font-medium text-zinc-400 line-through dark:text-zinc-600" : "font-semibold text-zinc-800 dark:text-zinc-200"}`}>
                        {c.title}
                      </span>
                      <span className="max-w-24 shrink-0 truncate text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">{c.valueText}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>

        <WeeklyReportCard report={weekly} />
        {training && <WeeklyTrainingSummary regions={training.regions} weekSets={training.weekSets} />}
        <ContributionGraph days={dashboard.contributions} totalWorkoutDays={dashboard.workoutCount} />
      </main>
    </div>
  );
}
