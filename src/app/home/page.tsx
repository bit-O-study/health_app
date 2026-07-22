import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Settings,
  Target,
} from "lucide-react";

import { Logo } from "@/features/brand/logo";
import { PromoBanner } from "@/features/cross-promo/promo-banner";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { TodayGoalCard } from "@/features/routine/components/today-goal-card";
import { DietExerciseCard } from "@/features/home/components/diet-exercise-card";
import { ContributionGraph } from "@/features/home/components/contribution-graph";
import { WeatherBackground } from "@/features/home/components/weather-background";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "내 운동 현황과 오늘의 다짐을 한눈에.",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile();
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
  } = await getHomeDashboard(profile);

  const doneCount = todayCommitments.filter((c) => c.done).length;
  return (
    <div className="min-h-screen overflow-x-clip text-zinc-900 dark:text-zinc-100">
      <WeatherBackground />
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-[#fafaf9]/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0a0b]/80">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
          <Link href="/home" className="flex items-center gap-2" aria-label="홈">
            <Logo />
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

      <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <PermissionNudge />

        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div className="space-y-3">
            <TodayGoalCard
              goal={goalCard}
              missions={[]}
              totalMissions={0}
              current={current}
            />
            <DietExerciseCard
              need={dietExerciseNeed}
              macroRemaining={macroRemaining}
              hasFoodLog={hasFoodLog}
            />
          </div>

          <div className="space-y-3">
            <Link
              href="/commitments"
              className="group block rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/[0.07] dark:bg-zinc-900/70 dark:hover:bg-zinc-900 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Target aria-hidden="true" size={15} className="shrink-0 text-emerald-500" />
                  <span className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">오늘의 다짐</span>
                  {todayCommitments.length > 0 ? (
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
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
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                        {c.done ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${c.done ? "font-medium text-zinc-400 line-through dark:text-zinc-600" : "font-semibold text-zinc-800 dark:text-zinc-200"}`}>
                        {c.title}
                      </span>
                      <span className="max-w-24 shrink-0 truncate text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">{c.valueText}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>

            <ContributionGraph days={contributions} totalWorkoutDays={workoutCount} />
          </div>
        </div>

        <PromoBanner />
      </main>
    </div>
  );
}
