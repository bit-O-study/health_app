import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
      <div className="app-page">
        <PageHeader title="코멘트" back="회원 관리" backHref={`/groups/${id}/trainer`} />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            이 회원에게는 코멘트를 남길 수 없어요.
          </p>
        </main>
      </div>
    );
  }

  const comments = await getTrainerComments(id, memberId);

  return (
    <div className="app-page">
      <PageHeader title="코멘트" back="회원 관리" backHref={`/groups/${id}/trainer`} />
      <main className="app-container space-y-3">
      {/* 누가 보는지는 실수를 막는 안내라 한 줄로 남긴다. */}
      <p className="-mt-1 truncate px-1 text-sm text-zinc-500 dark:text-zinc-400">
        {who.memberName} 님만 볼 수 있어요
      </p>

      <TrainerCommentForm
        groupId={id}
        memberId={memberId}
        memberName={who.memberName}
        initial={comments}
      />
      </main>
    </div>
  );
}
