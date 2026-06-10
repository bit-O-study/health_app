import { notFound } from "next/navigation";

import { isAdminUser } from "@/features/admin/admin";
import { AdminNav } from "@/features/admin/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminUser())) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 sm:flex">
      <aside className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 sm:sticky sm:top-0 sm:h-screen sm:w-56 sm:shrink-0 sm:border-b-0 sm:border-r">
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}