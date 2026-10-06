import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { groupFailures, type GroupWidePledge } from "@/features/commitments/group-pledge";
import { GroupPledgeForm } from "@/features/commitments/components/group-pledge-form";
import { GroupWidePledgeCard } from "@/features/commitments/components/group-wide-pledge";
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
  const supabase = await createSupabaseServerClient();
  const [byGroup, shared] = await Promise.all([
    getGroupPledges(groups.map((g) => g.id)),
    groups.length ? supabase.rpc("get_group_pledge_results", { p_group_ids: groups.map((g) => g.id) }) : Promise.resolve({ data: [], error: null }),
  ]);
  const wide = (shared.data ?? []) as GroupWidePledge[];

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
            const common = wide.filter((p) => p.groupId === g.id);
            const failures = groupFailures([...list, ...common.flatMap((p) => p.members.map((m) => ({ ...m, title: p.title })))]);
            return (
              <section key={g.id} className="space-y-2" data-testid="group-pledges">
                <h2 className="text-sm font-bold">
                  {g.name} <span className="text-xs font-normal text-zinc-500">· 멤버 {g.memberCount}명</span>
                </h2>
                <div className="app-card space-y-2 p-3" data-testid="group-failure-list">
                  <h3 className="text-sm font-bold">실패 명단 · {failures.length}명</h3>
                  {failures.length ? <ul className="space-y-1 text-sm">{failures.map((m) => <li key={m.userId} className="break-words"><span className="font-semibold text-danger">{m.name}</span><span className="text-zinc-500"> · {m.titles.join(", ")}</span></li>)}</ul> : <p className="text-xs text-zinc-500">아직 실패로 판정된 멤버가 없어요.</p>}
                </div>
                {shared.error ? <p role="alert" className="text-sm text-danger">그룹 전체 다짐을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p> : null}
                {g.isOwner ? <GroupPledgeForm groupId={g.id} today={seoulYmd()} memberCount={g.memberCount} /> : <p className="text-xs text-zinc-500">그룹장이 전체 다짐을 만들 수 있어요.</p>}
                {common.map((p) => <GroupWidePledgeCard key={p.id} pledge={p} />)}
                <h3 className="text-sm font-semibold">멤버가 공유한 개인 다짐</h3>
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
