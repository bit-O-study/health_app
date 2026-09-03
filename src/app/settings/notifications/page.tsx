import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { getMyNotificationPreferences } from "@/features/notifications/my-preferences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "알림 설정 · 헬쑤",
  description: "받을 알림 종류와 야간 방해 금지 시간을 정합니다.",
};

/** 알림 설정 — 로드맵 3.1. 설정이 없으면 기본값(전부 켜짐 + 야간 22~07 금지). */
export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const prefs = await getMyNotificationPreferences();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </BackLink>

      <div className="mb-6 mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          알림 설정
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          필요한 알림만 받으세요. 기기 자체의 알림 권한은 브라우저·휴대폰 설정에서
          따로 관리됩니다.
        </p>
      </div>

      <NotificationSettings initial={prefs} />
    </main>
  );
}
