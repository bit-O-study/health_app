import { notFound } from "next/navigation";

import { isPostModerator } from "@/features/admin/admin";
import { getReports } from "@/features/admin/reports";
import { ReportsManager } from "@/features/admin/components/reports-manager";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  if (!(await isPostModerator())) notFound();
  const reports = await getReports();
  const open = reports.filter((r) => r.status === "open");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        신고
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        미처리 {open.length}건 · 전체 {reports.length}건
      </p>
      <ReportsManager reports={reports} />
    </main>
  );
}
