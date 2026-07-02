import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups } from "@/features/groups/data-access";
import { GroupsClient } from "@/features/groups/components/groups-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 관리" };

export default async function GroupsManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const groups = await getMyGroups();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/groups"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        랭킹으로
      </Link>
      <h1 className="mb-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
        그룹 관리
      </h1>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
        그룹을 만들거나 초대 링크로 참여하세요. 그룹을 눌러 랭킹으로 이동합니다.
      </p>
      <GroupsClient groups={groups} />
    </main>
  );
}
