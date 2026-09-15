import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { PromoBanner } from "@/features/cross-promo/promo-banner";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { TodayGoalCard } from "@/features/routine/components/today-goal-card";
import { TodayCard } from "@/features/home/components/today-card";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import { WeeklyOverviewCard } from "@/features/routine/components/weekly-overview-card";
import { seoulYmd, ymdDisplay } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "내 운동 현황과 오늘의 다짐을 한눈에.",
};

/**
 * 홈 — 깔끔·촘촘하게(2026-09-15). 큰 제목 → 광고 배너(사용자 요청으로 맨 위 유지)
 * → 오늘(다짐·식단 두 줄 목록) → 체형 목표 → 이번 주 → 운동 기록.
 * 같은 숫자를 두 번 늘어놓던 활동 링 카드는 사용자 요청으로 뺐다("짜치니까 없애 달라").
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ⚡ 프로필과 대시보드·주간 집계를 **동시에** 시작한다(원거리 리전 왕복 줄이기).
  const [profile, dashboard, weekly, training] = await Promise.all([
    getUserProfile(),
    getHomeDashboard(),
    getWeeklyReport(),
    getMyWeeklyTraining(),
  ]);
  if (!profile) redirect("/onboarding");

  const {
    goalCard,
    current,
    todayCommitments,
    workoutCount,
    dietExerciseNeed,
    macroRemaining,
    hasFoodLog,
    contributions,
  } = dashboard;

  const todayYmd = seoulYmd();
  const [, mm, dd] = todayYmd.split("-");
  const { weekday } = ymdDisplay(todayYmd);

  return (
    <div className="app-page overflow-x-clip">
      <main className="app-container space-y-3">
        {/* 아이폰 큰 제목 — 날짜 한 줄 + 제목, 오른쪽에 알림·설정 */}
        <header className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {Number(mm)}월 {Number(dd)}일 {weekday}요일
            </p>
            <h1 className="app-title">홈</h1>
          </div>
          <div className="flex items-center gap-1 pb-0.5">
            <NotificationBell />
            <Link
              aria-label="설정"
              href="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200/60 text-zinc-700 transition active:scale-95 dark:bg-white/[0.1] dark:text-zinc-200"
            >
              <Settings aria-hidden="true" size={18} />
            </Link>
          </div>
        </header>

        {/* 광고 배너는 맨 위 사진 배너 그대로(사용자 요청으로 원상복구, 2026-09-15). */}
        <PromoBanner />
        <PermissionNudge />

        <TodayCard
          commitments={todayCommitments}
          need={dietExerciseNeed}
          macroRemaining={macroRemaining}
          hasFoodLog={hasFoodLog}
        />

        <TodayGoalCard
          goal={goalCard}
          missions={[]}
          totalMissions={0}
          current={current}
        />

        <WeeklyOverviewCard
          report={weekly}
          regions={training?.regions ?? []}
          weekSets={training?.weekSets ?? 0}
        />

        <ContributionGraph days={contributions} totalWorkoutDays={workoutCount} />
      </main>
    </div>
  );
}
