import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups } from "@/features/groups/data-access";
import { getGroupMode } from "@/features/groups/group-mode.server";
import { GroupsClient } from "@/features/groups/components/groups-client";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 관리" };

export default async function GroupsManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [groups, mode] = await Promise.all([getMyGroups(), getGroupMode()]);
  const backLabel = mode === "proof" ? "그룹으로" : "랭킹으로";

  // 다른 탭과 같은 큰 제목 머리글 — 설명 문장은 뺐다(2026-09-16 촘촘하게).
  // 뒤로는 router.back 이 아니라 항상 /groups 로(초대 링크로 바로 들어온 경우에도 갈 곳이 있게).
  return (
    <div className="app-page">
      <PageHeader title="그룹 관리" back={backLabel} backHref="/groups" />
      <main className="app-container">
        <GroupsClient groups={groups} mode={mode} />
      </main>
    </div>
  );
}
