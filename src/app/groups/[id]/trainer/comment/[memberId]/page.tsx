import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import {
  getAssignOptions,
  getTrainerComments,
} from "@/features/groups/trainer-data";
import { TrainerCommentForm } from "@/features/groups/components/trainer-comment-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 코멘트" };

export default async function TrainerCommentPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, memberId } = await params;
  // 그룹장·회원 확인과 이름은 배정 화면과 같은 조회를 쓴다(규칙을 두 벌 두지 않는다).
  const who = await getAssignOptions(id, memberId);
  if (!who) {
    return (
      <main className="app-page app-container">
        <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
          이 회원에게는 코멘트를 남길 수 없어요.
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

  const comments = await getTrainerComments(id, memberId);

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
        {who.memberName} 님에게 코멘트
      </h1>
      <p className="mb-5 mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        남긴 코멘트는 그 회원만 봐요. 다른 그룹원에게는 안 보여요.
      </p>

      <TrainerCommentForm
        groupId={id}
        memberId={memberId}
        memberName={who.memberName}
        initial={comments}
      />
    </main>
  );
}
