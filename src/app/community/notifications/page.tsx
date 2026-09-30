import { redirect } from "next/navigation";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { listMyCommunityNotifications } from "@/features/community/community-notify.server";
import { CommunityNotificationList } from "@/features/community/components/notification-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "커뮤니티 알림" };

/** 커뮤니티 알림 — 내 글에 달린 댓글, 하루 좋아요 묶음(커뮤니티 3단계). */
export default async function CommunityNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/community/notifications");
  const items = await listMyCommunityNotifications(await createSupabaseServerClient());
  return <CommunityNotificationList items={items} />;
}
