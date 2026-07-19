import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, Settings } from "lucide-react";

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
    <div className="min-h-screen bg-[#fafaf9] text-zinc-900 dark:bg-[#0a0a0b] dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-[#fafaf9]/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0a0b]/80">
        <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-3.5 sm:px-8">
          <Link href="/home" className="flex items-center gap-2" aria-label="홈">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
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

      <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-8 sm:px-8">
        <PermissionNudge />

        {/* 히어로 — 에디토리얼: 큰 숫자 + 얇은 액센트 라인 (다크에서도 은은하게) */}
        <section className="pb-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
            지금까지
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-[5.5rem] font-black leading-[0.85] tracking-tighter tabular-nums text-zinc-900 dark:text-zinc-50">
              {workoutCount}
            </span>
            <span className="pb-1 text-xl font-bold text-zinc-400 dark:text-zinc-500">
              일<span className="ml-1 font-medium">운동</span>
            </span>
          </div>
          <div className="mt-5 h-px w-14 bg-emerald-500/90" />
          <p className="mt-5 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            안녕하세요,{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {displayName}
            </span>
            님. 오늘도 한 칸 채워볼까요.
          </p>
          <Link
            href="/routine"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            오늘 운동 하러가기
            <ArrowUpRight
              aria-hidden="true"
              size={17}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-emerald-600 dark:text-emerald-400"
            />
          </Link>
        </section>

        <div className="space-y-3">
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
            className="group block rounded-2xl border border-zinc-200/80 bg-white/60 p-5 transition hover:border-zinc-300 dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.12]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                  오늘의 다짐
                </span>
                {todayCommitments.length > 0 ? (
                  <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {doneCount}/{todayCommitments.length}
                  </span>
                ) : null}
              </div>
              <ArrowUpRight
                aria-hidden="true"
                size={16}
                className="text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-600"
              />
            </div>

            {todayCommitments.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                오늘 진행 중인 다짐이 없어요. 눌러서 만들어 보세요.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {todayCommitments.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                        c.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {c.done ? (
                        <Check aria-hidden="true" size={12} strokeWidth={3} />
                      ) : null}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        c.done
                          ? "font-medium text-zinc-400 line-through dark:text-zinc-600"
                          : "font-semibold text-zinc-800 dark:text-zinc-200"
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
        </div>
      </main>
    </div>
  );
}
