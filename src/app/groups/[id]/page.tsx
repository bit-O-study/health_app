import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getGroupDetail, getMyGroups } from "@/features/groups/data-access";
import { GroupBoard } from "@/features/groups/components/group-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 랭킹" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [detail, groups] = await Promise.all([
    getGroupDetail(id),
    getMyGroups(),
  ]);

  if (!detail) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          그룹을 찾을 수 없거나 멤버가 아니에요.
        </p>
        <Link
          href="/groups"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
        >
          <ChevronLeft size={16} /> 그룹 목록
        </Link>
      </main>
    );
  }

  return (
    <main className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden">
      <GroupBoard detail={detail} groups={groups} />
    </main>
  );
}
