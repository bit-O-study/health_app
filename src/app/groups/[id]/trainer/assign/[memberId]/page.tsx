import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAssignOptions } from "@/features/groups/trainer-data";
import { AssignRoutineForm } from "@/features/groups/components/assign-routine-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "루틴 배정" };

export default async function AssignRoutinePage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, memberId } = await params;
  const options = await getAssignOptions(id, memberId);

  if (!options) {
    return (
      <div className="app-page">
        <PageHeader title="루틴 배정" back="회원 관리" backHref={`/groups/${id}/trainer`} />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            이 회원에게는 루틴을 배정할 수 없어요.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <PageHeader title="루틴 배정" back="회원 관리" backHref={`/groups/${id}/trainer`} />
      <main className="app-container space-y-3">
      <p className="-mt-1 truncate px-1 text-sm text-zinc-500 dark:text-zinc-400">
        {options.memberName} 님
      </p>

      <AssignRoutineForm
        groupId={id}
        memberId={options.memberId}
        memberName={options.memberName}
        mine={options.mine}
        theirs={options.theirs}
      />
      </main>
    </div>
  );
}
