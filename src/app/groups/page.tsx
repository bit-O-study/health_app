import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups } from "@/features/groups/data-access";
import { GroupsClient } from "@/features/groups/components/groups-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹" };

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await getMyGroups();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">그룹</h1>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
        그룹을 만들어 친구와 이번 주 운동 랭킹대전을 펼쳐보세요.
      </p>
      <GroupsClient groups={groups} />
    </main>
  );
}
