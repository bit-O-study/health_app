import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
    <div className="app-page">
      <PageHeader title="알림 설정" back="설정" />
      <main className="app-container">
        <NotificationSettings initial={prefs} />
      </main>
    </div>
  );
}
