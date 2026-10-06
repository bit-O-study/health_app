"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Dumbbell, Salad, Trash2 } from "lucide-react";

import { deleteCommitmentAction } from "@/features/commitments/actions";
import type { CommitmentView } from "@/features/commitments/data-access";

/**
 * 예전 다짐 목록(설문·지표 다짐) — 2026-10-06 개편으로 새로 만들 수는 없고, 지울 때까지 보인다.
 * 새 다짐은 행동 다짐(`PledgeForm`)으로 만든다.
 */
export function CommitmentManager({ commitments }: { commitments: CommitmentView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    start(async () => {
      const res = await deleteCommitmentAction(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  if (commitments.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {commitments.map((c) => {
          const p = c.progress;
          const barColor = p.done ? "bg-brand" : p.expired ? "bg-danger" : "bg-brand/60";
          return (
            <li key={c.id} className="app-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-base font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
                    {c.kind === "diet" ? (
                      <Salad aria-hidden="true" size={14} className="text-brand" />
                    ) : (
                      <Dumbbell aria-hidden="true" size={14} className="text-brand" />
                    )}
                    {c.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                    <CalendarClock aria-hidden="true" size={11} />
                    {c.startDate} ~ {c.deadline}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="다짐 삭제"
                  onClick={() => remove(c.id)}
                  disabled={pending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-end justify-between text-xs">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {c.metricLabel}
                    {p.done ? (
                      <span className="ml-1 font-semibold text-brand">달성 ✓</span>
                    ) : p.upcoming ? (
                      <span className="ml-1 text-zinc-400">시작 전</span>
                    ) : p.expired ? (
                      <span className="ml-1 font-semibold text-danger">기간 종료</span>
                    ) : (
                      <span className="ml-1 text-zinc-400">D-{p.daysLeft}</span>
                    )}
                  </span>
                  <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {p.current.toLocaleString()} / {p.target.toLocaleString()} {c.unit}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
