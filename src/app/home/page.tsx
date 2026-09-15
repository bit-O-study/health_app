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
import { activityRings } from "@/features/home/activity-rings";
import { ActivityRings, RING_COLOR } from "@/features/home/components/activity-rings";
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
 * 홈 — 아이폰 피트니스 앱 구조(2026-09-15 "전체적으로 싹 바꿔 달라, 기능만 살아 있게").
 * 큰 제목 → 광고 배너(사용자 요청으로 맨 위 유지) → 활동 링 히어로 → 오늘 위젯 2칸
 * → 체형 목표 → 이번 주 → 운동 기록. 데이터·링크·기능은 그대로다.
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
  const rings = activityRings({
    workoutDays: weekly?.current.workoutDays ?? 0,
    eatenKcal: dietExerciseNeed.eatenKcal,
    targetKcal: dietExerciseNeed.targetKcal,
    commitDone: todayCommitments.filter((c) => c.done).length,
    commitTotal: todayCommitments.length,
  });

  return (
    <div className="app-page overflow-x-clip">
      <main className="app-container space-y-4 pt-3">
        {/* 아이폰 큰 제목 — 날짜 한 줄 + 제목, 오른쪽에 알림·설정 */}
        <header className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {Number(mm)}월 {Number(dd)}일 {weekday}요일
            </p>
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">홈</h1>
          </div>
          <div className="flex items-center gap-1 pb-1">
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

        {/* 활동 링 히어로 */}
        <section aria-label="오늘 활동" data-testid="activity-rings" className="app-card flex items-center gap-5 p-5">
          <ActivityRings rings={rings} />
          <ul className="min-w-0 flex-1 space-y-3">
            {rings.map((r) => (
              <li key={r.key} className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: RING_COLOR[r.key] }}>
                  {r.label}
                </p>
                <p className="truncate text-lg font-bold tabular-nums leading-tight text-zinc-950 dark:text-zinc-50">
                  {r.valueText}
                </p>
              </li>
            ))}
          </ul>
        </section>

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
