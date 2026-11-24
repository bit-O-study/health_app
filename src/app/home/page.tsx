import { HomeBriefingCard, loadHomeBriefing } from "@/features/lite/components/home-briefing-card";
import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { WeeklyReportCard } from "@/features/routine/components/weekly-report-card";
import { WeeklyTrainingSummary } from "@/features/routine/components/weekly-training-summary";
import { redirect } from "next/navigation";

import { PromoBanner } from "@/features/cross-promo/promo-banner";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { getFitAccess } from "@/features/routine/fit-access";
import { launcherFlags } from "@/features/launcher/launcher-flags.server";
import { AppGrid } from "@/features/launcher/components/app-grid";
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
import { Logo } from "@/features/brand/logo";
import { HomeCommitments, HomeHero, HomeWeekStrip } from "@/features/home/components/home-hero";
import { heroStats } from "@/features/home/hero-stats";

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
  const fitAccessP = getFitAccess();
  const [profile, dashboard, weekly, training, flags, fitAccess, briefing] = await Promise.all([
    getUserProfile(),
    getHomeDashboard(),
    getWeeklyReport(),
    getMyWeeklyTraining(),
    // 내 앱 스위치 — 하단바와 같은 목록(launcherFlags).
    launcherFlags(),
    // 맞춤 운동(라이트) — 홈 배너 없음·오늘 한 줄은 라이트 이상.
    fitAccessP,
    // 라이트 · 오늘 한 줄 — 라이트일 때만 기록을 읽는다.
    fitAccessP.then((a) => (a.full ? loadHomeBriefing() : null)).catch(() => null),
  ]);
  if (!profile) redirect("/onboarding");

  const { todayCommitments } = dashboard;
  const doneCount = todayCommitments.filter(c => c.done).length;
  const stats = heroStats(dashboard.contributions);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return (
    <div className="app-page overflow-x-clip">
      <main className="app-container space-y-6">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link href="/home" aria-label="헬쑤 홈"><Logo size={40} wordClassName="text-2xl" /></Link>
          <div className="flex items-center gap-1 pb-0.5">
            <NotificationBell />
            <Link href="/settings" aria-label="설정" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-white/[0.08]">
              <Settings size={21} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <PermissionNudge />

        {/* 주인공 — 오늘 할 일 한 가지(2026-11-18 리디자인). 링·행동 버튼·숫자 3칸. */}
        <HomeHero dateLabel={dateLabel} stats={stats} commitDone={doneCount} commitTotal={todayCommitments.length} workoutCount={dashboard.workoutCount} />

        {/* 라이트 · 오늘 한 줄(2026-10-08) — 내 기록에서 지금 제일 쓸모 있는 말 하나. */}
        {fitAccess.full && briefing ? <HomeBriefingCard briefing={briefing} /> : null}

        {/* 이번 주 — 7칸 · 주간 요약 · 부위별 훈련을 한 묶음으로(따로 흩어져 있던 "이번 주" 셋). */}
        <div className="space-y-3">
          <HomeWeekStrip stats={stats} />
          <WeeklyReportCard report={weekly} />
          {training && <WeeklyTrainingSummary regions={training.regions} weekSets={training.weekSets} />}
        </div>
        <HomeCommitments commitments={todayCommitments} />

        {/* 앱 아이콘 판 — 여기서 각 앱으로 들어간다. */}
        <section aria-label="내 앱">
          <AppGrid initialEditing={editing} key={`${user.id}:${editing}`} userId={user.id} enabledFlags={flags} />
        </section>

        <ContributionGraph days={dashboard.contributions} totalWorkoutDays={dashboard.workoutCount} />
        {/* 라이트(990원) 혜택 — 홈 홍보 배너 없음(2026-10-02). fitAccess.full = 라이트 이상. */}
        {fitAccess.full ? null : <PromoBanner />}
      </main>
    </div>
  );
}
