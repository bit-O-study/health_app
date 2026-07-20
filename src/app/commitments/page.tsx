import { redirect } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyCommitments } from "@/features/commitments/data-access";
import { CommitmentManager } from "@/features/commitments/components/commitment-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐" };

export default async function CommitmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments");

  const commitments = await getMyCommitments();

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-8">
      <BackLink className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft aria-hidden="true" size={15} />
        뒤로
      </BackLink>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        <Flag aria-hidden="true" size={22} className="text-emerald-600" />
        나의 다짐
      </h1>
      <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        기간을 정해 다짐하면, 운동·식단 기록으로 진행률이 자동으로 채워집니다.
        기간은 캘린더에도 표시돼요.
      </p>
      <CommitmentManager commitments={commitments} />
    </main>
  );
}
