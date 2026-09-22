import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyCommitments } from "@/features/commitments/data-access";
import { CommitmentManager } from "@/features/commitments/components/commitment-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐" };

export default async function CommitmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments");

  const commitments = await getMyCommitments();

  // 공통 머리글(2026-09-16 8단계) — 설명 문장·제목 옆 깃발 아이콘은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="나의 다짐" back />
      <main className="app-container">
        <CommitmentManager commitments={commitments} />
      </main>
    </div>
  );
}
