import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

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
      <main className="app-page app-container">
        <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
          이 회원에게는 루틴을 배정할 수 없어요.
        </p>
        <p className="text-center">
          <Link
            href={`/groups/${id}/trainer`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
          >
            <ChevronLeft aria-hidden="true" size={16} /> 회원 관리
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="app-page app-container">
      <Link
        href={`/groups/${id}/trainer`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        회원 관리
      </Link>

      <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
        {options.memberName} 님에게 루틴 배정
      </h1>
      <p className="mb-5 mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        내 루틴의 한 일차를 회원의 한 일차로 옮겨 담아요.
      </p>

      <AssignRoutineForm
        groupId={id}
        memberId={options.memberId}
        memberName={options.memberName}
        mine={options.mine}
        theirs={options.theirs}
      />
    </main>
  );
}
