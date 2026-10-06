import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyBlockedUsers } from "@/features/community/data-access";
import { BlockedUserList } from "@/features/community/components/blocked-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "차단한 사용자" };

export default async function BlockedUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/community/blocked");
  return <BlockedUserList initial={await getMyBlockedUsers()} />;
}
