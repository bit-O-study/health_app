import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { Logo } from "@/features/brand/logo";
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
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "내 운동 현황과 오늘의 다짐을 한눈에.",
};

/**
 * 홈 — 위에서부터 **목표 → 오늘 → 이번 주 → 잔디 → 광고** 한 줄로.
 *
 * 2026-09-14 화면 간결화: 광고 배너·권한 배너 2장이 내 정보보다 먼저 뜨고 카드가
 * 최대 9개였다. 다짐+식단은 '오늘' 한 장, 주간 요약+훈련은 '이번 주' 한 장으로 합치고
 * 광고는 맨 아래 한 줄로 내렸다. 날씨 배경은 카드에 가려 보이지 않는데 위치 권한만
 * 묻고 있어서 뺐다.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ⚡ 프로필과 대시보드 조회를 **동시에** 시작한다. 예전엔 프로필을 먼저 await 하고
  //   그 값을 넘겨줘서 원거리 리전(싱가포르) 왕복이 한 파 더 붙었다.
  //   프로필 조회는 `React.cache` 라 대시보드 안에서 다시 불러도 왕복은 1회다.
  const [profile, dashboard, weekly, training] = await Promise.all([
    getUserProfile(),
    getHomeDashboard(),
    // 주간 요약도 같이 시작한다 — 순서대로 기다리면 원거리 리전 왕복이 한 파 늘어난다.
    getWeeklyReport(),
    // 훈련 분석은 주간 리포트와 **같은 완료 기록**을 본다(React.cache 로 왕복 1회).
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

  const [, mm, dd] = seoulYmd().split("-");
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일`;

  return (
    <div className="app-page overflow-x-clip">
      <header className="app-header">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/home" className="flex items-center gap-2" aria-label="홈">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link
              aria-label="설정"
              href="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
            >
              <Settings aria-hidden="true" size={18} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="app-container space-y-3">
        <PermissionNudge />

        <TodayGoalCard
          goal={goalCard}
          missions={[]}
          totalMissions={0}
          current={current}
        />

        <TodayCard
          dateLabel={dateLabel}
          commitments={todayCommitments}
          need={dietExerciseNeed}
          macroRemaining={macroRemaining}
          hasFoodLog={hasFoodLog}
        />

        <WeeklyOverviewCard
          report={weekly}
          regions={training?.regions ?? []}
          weekSets={training?.weekSets ?? 0}
        />

        <ContributionGraph days={contributions} totalWorkoutDays={workoutCount} />

        {/* 광고는 맨 아래 한 줄 — 내 기록보다 먼저 보이지 않게. */}
        <PromoBanner />
      </main>
    </div>
  );
}
