import Link from "next/link";
import { Bell } from "lucide-react";
export function GroupNotificationBell() {
  return <Link href="/groups/notifications" aria-label="그룹 알림 열기" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white/80 text-zinc-800 active:scale-95 dark:bg-zinc-900 dark:text-zinc-100"><Bell size={22} aria-hidden="true" /></Link>;
}
