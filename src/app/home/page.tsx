import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Flag, Settings } from "lucide-react";

import { Logo } from "@/features/brand/logo";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getGoalAndMissions } from "@/features/home/home-data";
import { TodayGoalCard } from "@/features/routine/components/today-goal-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "내 체형 목표와 내다짐을 한눈에.",
};

/** 홈 상단 메뉴 항목(설정·내다짐 등). */
function HomeMenuLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Settings;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
          {title}
        </span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
          {desc}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        size={18}
        className="shrink-0 text-zinc-400 dark:text-zinc-500"
      />
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const { goalCard, missionCards, totalMissions, current } =
    await getGoalAndMissions(profile);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-3 sm:px-8">
          <Link href="/home" className="flex items-center gap-2" aria-label="홈">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-6 pb-10 pt-6 sm:px-8">
        <PermissionNudge />

        {/* 체형 목표(자세히) + 내다짐 미션 — 목표 카드를 탭하면 체형 기록 입력이 열린다. */}
        <TodayGoalCard
          goal={goalCard}
          missions={missionCards}
          totalMissions={totalMissions}
          current={current}
        />

        {/* 내다짐 관리 · 설정 */}
        <div className="space-y-2.5">
          <HomeMenuLink
            href="/commitments"
            icon={Flag}
            title="내다짐"
            desc="목표 다짐을 만들고 진행 상황을 관리해요"
          />
          <HomeMenuLink
            href="/settings"
            icon={Settings}
            title="설정"
            desc="프로필 · 체형 정보 · 루틴 · 기구 · 피드백"
          />
        </div>
      </main>
    </div>
  );
}
