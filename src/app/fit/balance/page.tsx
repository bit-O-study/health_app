import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitView } from "@/features/routine/fit-data";
import { ALL_SUB_MUSCLES } from "@/features/routine/sub-muscles";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import type { BalanceRow, SubStatus } from "@/features/routine/fit";
import { FitHeader, FitHeadline, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import {
  BALANCE_PART,
  balanceHeadline,
  fmtSets,
  sortPartsByNeed,
  statusChip,
  worstBalance,
} from "@/features/routine/fit-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 몸 균형" };

const SUB_LABEL = new Map(ALL_SUB_MUSCLES.map((s) => [s.id, s.label]));
const subLabel = (id: string) => SUB_LABEL.get(id) ?? id;

/** 상태 색 — 부족 빨강 · 조금 연두 · 적정 초록 · 넘침 회색(나쁜 게 아님) · 안 함 옅은 회색. */
const BAR: Record<SubStatus, string> = {
  none: "bg-zinc-300 dark:bg-zinc-600",
  low: "bg-danger",
  some: "bg-brand/50",
  ok: "bg-brand",
  high: "bg-zinc-400 dark:bg-zinc-500",
};
const CHIP: Record<SubStatus, string> = {
  none: "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400",
  low: "bg-danger/10 text-danger",
  some: "bg-brand-soft text-brand",
  ok: "bg-brand-soft text-brand",
  high: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
};

function Bar({ pct, status }: { pct: number; status: SubStatus }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
      <div className={`h-full rounded-full ${BAR[status]}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** 비율 막대 — 지금과 목표를 같은 폭의 두 줄로(조각마다 칸). */
function RatioBars({ row, alarm }: { row: BalanceRow; alarm: boolean }) {
  const shades = ["bg-brand", "bg-brand/55", "bg-brand/25"];
  const line = (key: "now" | "goal") => (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
      {row.parts.map((p, i) => (
        <div key={p.label} className={shades.at(i) ?? "bg-brand/25"} style={{ width: `${p[key]}%` }} />
      ))}
    </div>
  );
  // 가장 모자란 칸(목표 − 지금이 큰 칸) — 알람이면 빨간 칩 하나로만 보여 준다.
  const low = [...row.parts].sort((a, b) => b.goal - b.now - (a.goal - a.now))[0];
  return (
    <div className="space-y-1.5 rounded-xl bg-zinc-50 p-3 dark:bg-white/[0.04]" data-testid={`fit-balance-${row.id}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{row.label}</p>
        {row.hint && low ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${alarm ? "bg-danger/10 text-danger" : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08]"}`}>
            {low.label} 부족
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[2.5rem_1fr] items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        <span>지금</span>
        {line("now")}
        <span>목표</span>
        {line("goal")}
      </div>
      <p className="flex flex-wrap gap-x-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        {row.parts.map((p, i) => (
          <span key={p.label} className="inline-flex items-center gap-1">
            <i className={`h-2 w-2 rounded-full ${shades.at(i) ?? "bg-brand/25"}`} />
            {p.label}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * 맞춤 운동 · 내 몸 균형(2026-10-06 UI 개편) — 예전 '부위' + '균형' 탭을 합쳤다.
 * 결론 한 줄 → 부위 6개(모자란 순) → 눌러서 세부 근육·비율·'이 부위 채우는 운동'.
 */
export default async function FitBalancePage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/balance");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const view = await loadFitView();
  if (!view) redirect("/login?redirect=/fit/balance");
  const full = access.full;
  const parts = sortPartsByNeed(view.parts);
  const worst = worstBalance(view.balance);

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader
        title="내 몸 균형"
        full={full}
        styleText={styleTextOf(view.style)}
        experienceLabel={view.experienceLabel}
        cold={view.daysThisWeek === 0}
      />
      <main className="app-container space-y-3">
        <FitHeadline testId="fit-headline">
          {balanceHeadline(view.balance)}
        </FitHeadline>

        <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-zinc-500 dark:text-zinc-400" data-testid="fit-legend">
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-danger" />부족</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand/50" />조금</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand" />적정</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-zinc-400" />넘침</span>
        </p>

        {full ? (
          <div className="space-y-2">
            {parts.map((p) => {
              const balances = view.balance.filter((b) => BALANCE_PART[b.id] === p.part);
              return (
                <details key={p.part} name="fit-part" className="app-card group p-4" data-testid={`fit-part-${p.part}`}>
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{BODY_PART_LABEL[p.part]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[p.status]}`}>{statusChip(p.status, p.pct)}</span>
                      </span>
                      <Bar pct={p.pct} status={p.status} />
                    </span>
                    <ChevronDown aria-hidden="true" size={16} className="shrink-0 text-zinc-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-2.5 border-t border-[var(--line)] pt-3">
                    {view.rows
                      .filter((r) => r.sub.startsWith(`${p.part}-`))
                      .map((r) => (
                        <div key={r.sub} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
                            <span>{subLabel(r.sub)}</span>
                            <span className="tabular-nums">
                              {fmtSets(r.stim)} / {fmtSets(r.target)}세트
                            </span>
                          </div>
                          <Bar pct={r.pct} status={r.status} />
                        </div>
                      ))}
                    {balances.map((b) => (
                      <RatioBars key={b.id} row={b} alarm={worst?.id === b.id} />
                    ))}
                    {p.status === "low" || p.status === "none" || p.status === "some" ? (
                      <Link
                        href={`/fit?part=${p.part}`}
                        className="block text-center text-sm font-semibold text-brand"
                        data-testid={`fit-part-go-${p.part}`}
                      >
                        {BODY_PART_LABEL[p.part]} 운동 추천 →
                      </Link>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <>
            <section className="app-card space-y-2.5 p-4" data-testid="fit-parts-free">
              {parts.map((p) => (
                <div key={p.part} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{BODY_PART_LABEL[p.part]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[p.status]}`}>{statusChip(p.status, p.pct)}</span>
                  </div>
                  <Bar pct={p.pct} status={p.status} />
                </div>
              ))}
            </section>
            <FitLocked what="세부 근육 25개 · 비율" />
          </>
        )}
      </main>
    </div>
  );
}
