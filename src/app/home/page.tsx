import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Check,
  ChevronRight,
  Dumbbell,
  Flag,
  Settings,
} from "lucide-react";

import { Logo } from "@/features/brand/logo";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { TodayGoalCard } from "@/features/routine/components/today-goal-card";

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

  const { goalCard, current, todayCommitments, workoutCount } =
    await getHomeDashboard(profile);

  const displayName = profile.name?.trim() || "운동러";
  const doneCount = todayCommitments.filter((c) => c.done).length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-3 sm:px-8">
          <Link href="/home" className="flex items-center gap-2" aria-label="홈">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              aria-label="설정"
              href="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition hover:text-zinc-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Settings aria-hidden="true" size={17} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-6 pb-10 pt-5 sm:px-8">
        <PermissionNudge />

        {/* 히어로 — 인사 + 지금까지 운동한 횟수 */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm">
          <p className="text-sm font-medium text-emerald-50/90">
            안녕하세요, <b className="font-bold">{displayName}</b>님 👋
          </p>
          <div className="mt-3 flex items-end gap-2">
            <Dumbbell aria-hidden="true" size={30} className="mb-1 opacity-90" />
            <span className="text-5xl font-black leading-none tabular-nums">
              {workoutCount}
            </span>
            <span className="mb-1 text-lg font-bold text-emerald-50/90">번</span>
          </div>
          <p className="mt-1 text-sm font-medium text-emerald-50/80">
            지금까지 운동한 날이에요. 오늘도 이어가요!
          </p>
          <Link
            href="/routine"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
          >
            오늘 운동 하러가기
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </section>

        {/* 체형 목표 — 탭하면 체형 기록 입력 */}
        <TodayGoalCard
          goal={goalCard}
          missions={[]}
          totalMissions={0}
          current={current}
        />

        {/* 오늘의 다짐 체크리스트 — 카드 전체를 누르면 내다짐 관리로 이동 */}
        <Link
          href="/commitments"
          className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-zinc-100">
              <Flag aria-hidden="true" size={16} className="text-emerald-600 dark:text-emerald-400" />
              오늘의 다짐
              {todayCommitments.length > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {doneCount}/{todayCommitments.length}
                </span>
              ) : null}
            </span>
            <ChevronRight aria-hidden="true" size={18} className="text-zinc-400 dark:text-zinc-500" />
          </div>

          {todayCommitments.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500 dark:text-zinc-400">
              오늘 진행 중인 다짐이 없어요. 눌러서 다짐을 만들어 보세요.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {todayCommitments.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      c.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                    }`}
                  >
                    {c.done ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : null}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      c.done
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {c.title}
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                    {c.valueText}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>
      </main>
    </div>
  );
}
