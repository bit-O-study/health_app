"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleCommitmentCheckAction } from "@/features/commitments/actions";
import type { TodayCommitment } from "@/features/commitments/data-access";

/**
 * 오늘의 다짐 체크리스트 — 다짐 화면 맨 위.
 *
 * 수동 미션(물·술·수면)은 **여기서 바로 체크**한다. 자동 미션은 기록에서 판정되므로
 * 눌러도 바뀌지 않고, 그 이유를 화면이 먼저 말한다(점선 네모 + '자동').
 *
 * 체크는 낙관적으로 먼저 칠하고 서버에 보낸다 — 누르고 반응이 없으면 사람은 또 누른다.
 * 실패하면 원래대로 되돌리고 이유를 보여준다.
 */
export function TodayChecklist({
  items,
  today,
}: {
  items: TodayCommitment[];
  /** 오늘(YYYY-MM-DD) — 체크가 어느 날짜에 달리는지 서버와 맞춘다. */
  today: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  function toggle(commitmentId: string, missionId: string, next: boolean) {
    const key = `${commitmentId}:${missionId}`;
    setOptimistic((o) => ({ ...o, [key]: next }));
    setError(null);
    start(async () => {
      const res = await toggleCommitmentCheckAction({
        commitmentId,
        missionId,
        forDate: today,
        on: next,
      });
      if (!res.ok) {
        setOptimistic((o) => {
          const copy = { ...o };
          delete copy[key];
          return copy;
        });
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-3" data-testid="today-checklist">
      {items.map((c) => {
        const rows = c.missions.map((m) => ({
          ...m,
          done: optimistic[`${c.id}:${m.id}`] ?? m.done,
        }));
        const done = rows.filter((r) => r.done).length;
        return (
          <div key={c.id} className="app-card p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-sm font-bold">{c.title}</h2>
              <span
                className="shrink-0 text-xs font-bold tabular-nums text-brand"
                data-testid="today-progress"
              >
                {done}/{c.total}
              </span>
            </div>
            <ul className="space-y-1">
              {rows.map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-1.5">
                  <button
                    type="button"
                    disabled={!m.manual || busy}
                    aria-pressed={m.done}
                    aria-label={
                      m.manual
                        ? `${m.label} ${m.done ? "체크 해제" : "체크"}`
                        : `${m.label} (자동 판정)`
                    }
                    data-testid={m.manual ? "manual-check" : "auto-check"}
                    onClick={() => toggle(c.id, m.id, !m.done)}
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs transition ${
                      m.done
                        ? "border-brand bg-brand text-white dark:text-zinc-950"
                        : "border-zinc-300 text-transparent dark:border-zinc-600"
                    } ${m.manual ? "" : "border-dashed"} ${
                      m.manual ? "app-press" : "cursor-default"
                    }`}
                  >
                    ✓
                  </button>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${
                        m.done ? "font-semibold text-zinc-500 line-through dark:text-zinc-400" : ""
                      }`}
                    >
                      {m.label}
                    </span>
                    {m.why ? (
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {m.why}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      m.manual
                        ? "bg-warn/10 text-warn"
                        : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400"
                    }`}
                  >
                    {m.manual ? "수동" : "자동"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-[var(--line)] pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              이번 주 <b>{c.weeklyTarget}일</b>이 목표예요 — 매일은 아무도 못 해요.
            </p>
          </div>
        );
      })}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}
