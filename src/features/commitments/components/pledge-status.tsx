import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { dayDiff, shortDates } from "@/features/commitments/evaluation";
import type { PledgeView } from "@/features/commitments/pledge-data";
import { InbodyTip } from "@/features/commitments/components/body-setup";
import { PledgeTrendView } from "@/features/commitments/components/pledge-trend";

/**
 * 다짐 현황 — 지금 7일 구간이 어디까지 왔는지 + 주별·월별 변화(2026-10-07). **식단 기록이 빠진 날짜를 먼저** 보여 준다
 * (구간이 끝나기 전에 채우면 통과, 못 채우면 그 다음날 00:00 에 실패).
 */
export function PledgeStatusView({ pledges, today }: { pledges: PledgeView[]; today: string }) {
  const live = pledges.filter((p) => p.eval.status === "active" || p.eval.status === "upcoming");
  if (live.length === 0) {
    return (
      <div className="app-card space-y-2 p-4 text-center">
        <p className="text-sm text-zinc-500">진행 중인 다짐이 없어요</p>
        <Link href="/commitments/new" className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">
          다짐 만들기
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="pledge-status-view">
      {live.map((p) => {
        if (p.eval.status === "upcoming") {
          return (
            <section key={p.id} className="app-card p-4">
              <h2 className="text-sm font-bold">{p.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {p.startDate} 시작 — {dayDiff(today, p.startDate)}일 남았어요
              </p>
            </section>
          );
        }
        const b = p.eval.current!;
        const left = dayDiff(today, b.checkAt);
        return (
          <section key={p.id} className="app-card space-y-3 p-4" data-testid="status-card">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="min-w-0 truncate text-sm font-bold">{p.title}</h2>
                <span className="shrink-0 text-xs font-bold text-brand">
                  {p.week}/{p.totalWeeks}주차
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                이번 구간 {fmt(b.start)}~{fmt(b.end)} · {fmt(b.checkAt)} 00:00 체크
                {left > 0 ? ` (${left}일 남음)` : ""}
              </p>
            </div>

            {b.missingDietDates.length > 0 ? (
              <Link
                href={`/diet?d=${b.missingDietDates[0]}`}
                className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger"
                data-testid="missing-diet"
              >
                <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                <span>
                  식단 {shortDates(b.missingDietDates)} 기록이 안 됐어요
                  <span className="block text-xs font-normal">
                    {fmt(b.end)}까지 하루 {p.spec.mealsPerDay}끼를 채우지 않으면 다짐 실패예요
                  </span>
                </span>
              </Link>
            ) : null}

            {p.week === p.totalWeeks ? (
              <div className="space-y-1.5 rounded-lg bg-brand-soft px-3 py-2 text-xs leading-5 text-brand" data-testid="end-measure-guide">
                <p className="font-semibold">
                  마무리 측정 — {fmt(p.endDate)}까지 체중을 2번 이상 기록하고, 근육 변화를 보려면 {fmt(p.endDate)} 전후
                  3일 안에 인바디를 재 주세요.
                </p>
                <InbodyTip className="bg-transparent px-0 py-0 text-brand dark:bg-transparent dark:text-brand" />
              </div>
            ) : null}

            <ul className="space-y-2.5">
              {b.items.map((it) => {
                const pct =
                  it.dir === "atleast"
                    ? Math.min(100, Math.round((it.have / Math.max(1, it.need)) * 100))
                    : Math.min(100, Math.round((it.have / Math.max(1, it.need)) * 100));
                const bad = it.dir === "atmost" ? it.have > it.need : false;
                return (
                  <li key={it.key} data-testid="status-item">
                    <div className="mb-1 flex items-end justify-between text-xs">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300">{it.label}</span>
                      <span className={`font-bold tabular-nums ${bad ? "text-danger" : ""}`}>
                        {it.have.toLocaleString()}
                        {it.unit} {it.dir === "atmost" ? "≤" : "/"} {it.need.toLocaleString()}
                        {it.unit}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                      <div
                        className={`h-full rounded-full ${bad ? "bg-danger" : it.dir === "atleast" && it.have >= it.need ? "bg-brand" : "bg-brand/60"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <PledgeTrendView trend={p.trend} />
          </section>
        );
      })}
    </div>
  );
}

function fmt(ymd: string): string {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
}
