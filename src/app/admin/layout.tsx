import { notFound } from "next/navigation";

import { isAdminUser } from "@/features/admin/admin";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { AdminTopbar } from "@/features/admin/components/admin-topbar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminUser())) notFound();

  return (
    // 데스크톱(lg+): 왼쪽 고정 사이드바 + 상단바 대시보드. 모바일: 상단 가로 네비(기존과 동일).
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 lg:flex">
      <aside className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <AdminNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
