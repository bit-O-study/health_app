import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getGroupPledges, getMyPledges } from "@/features/commitments/pledge-data";
import { getMyGroups } from "@/features/groups/data-access";
import { STATUS_LABEL, STATUS_TONE } from "@/features/commitments/components/pledge-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹별 다짐" };

/** 그룹별 다짐 — 내 그룹마다 멤버가 공유한 다짐과 상태. */
export default async function GroupPledgesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments/groups");
  // 내 다짐을 먼저 판정해 공유 상태(주차·성공/실패)를 최신으로 맞춘다.
  const [groups] = await Promise.all([getMyGroups(), getMyPledges()]);
  const byGroup = await getGroupPledges(groups.map((g) => g.id));

  return (
    <div className="app-page">
      <PageHeader title="그룹별 다짐" />
      <main className="app-container space-y-5">
        {groups.length === 0 ? (
          <div className="app-card space-y-2 p-4 text-center">
            <p className="text-sm text-zinc-500">속한 그룹이 없어요</p>
            <Link href="/groups/find" className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">
              그룹 찾기
            </Link>
          </div>
        ) : (
          groups.map((g) => {
            const list = byGroup[g.id] ?? [];
            return (
              <section key={g.id} className="space-y-2" data-testid="group-pledges">
                <h2 className="text-sm font-bold">
                  {g.name} <span className="text-xs font-normal text-zinc-500">· 멤버 {g.memberCount}명</span>
                </h2>
                {list.length === 0 ? (
                  <p className="app-card p-3 text-center text-xs text-zinc-500">아직 공유된 다짐이 없어요</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((s) => (
                      <li key={s.id} className="app-card p-3" data-testid="group-pledge">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">
                            <span className="text-zinc-500">{s.name}</span> · {s.title}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[s.status]}`}>
                            {STATUS_LABEL[s.status]}
                            {s.status === "active" ? ` ${s.week}주차` : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {s.startDate} ~ {s.endDate}
                        </p>
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {s.lines.map((l) => (
                            <li key={l} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-white/[0.06]">
                              {l}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
