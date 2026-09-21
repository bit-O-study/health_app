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
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { TrainerModeSwitch } from "@/features/groups/components/trainer-mode-switch";
import { getOwnedGroupsForSwitch } from "@/features/groups/trainer-switch.server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { seoulYmd } from "@/features/routine/data";
import { LauncherHome } from "@/features/launcher/launcher-home";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "홈 · 헬쑤", description: "운동, 식단, 일상의 기록을 한곳에서 시작하세요." };
export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (!await getCurrentUser()) redirect("/login");
  const [profile, dashboard, weekly, ownedGroups, showCoach, query] = await Promise.all([
    getUserProfile(), getHomeDashboard(), getWeeklyReport(), getOwnedGroupsForSwitch(), isDebugFeatureEnabled("helssu-coach"), searchParams,
  ]);
  if (!profile) redirect("/onboarding");
  return <div className="app-page min-h-screen bg-[#f4f6f5] dark:bg-[#0d1310]">
    <header className="app-header"><nav aria-label="홈 도구" className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2"><Link href="/home" aria-label="헬쑤 홈"><Logo /></Link><TrainerModeSwitch groups={ownedGroups} /></div>
      <div className="flex items-center gap-1"><NotificationBell /><Link href="/settings" aria-label="설정" className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500"><Settings size={18} aria-hidden="true" /></Link></div>
    </nav></header>
    <main className="app-container space-y-5"><LauncherHome dashboard={dashboard} weekly={weekly} showCoach={showCoach} searching={query.view === "search"} today={seoulYmd()} /><PermissionNudge /><PromoBanner /></main>
  </div>;
}
