import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

import type { TodayCommitment } from "@/features/home/home-data";

/** 오늘의 다짐 — 카드 안의 카드 없이 하나의 묶음 목록. */
export function HomeCommitments({ commitments }: { commitments: TodayCommitment[] }) {
  const done = commitments.filter((c) => c.done).length;
  return (
    <section aria-label="오늘의 다짐">
      <Link href="/commitments" className="app-section-head min-h-11 items-center">
        <h2>
          오늘의 다짐
          {commitments.length > 0 ? (
            <span className="app-num ml-2 text-sm text-brand">
              {done}/{commitments.length}
            </span>
          ) : null}
        </h2>
        <span className="inline-flex items-center text-sm font-medium text-brand">
          전체
          <ChevronRight aria-hidden="true" size={16} />
        </span>
      </Link>
      {commitments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          오늘 진행 중인 다짐이 없어요.
          <br />
          작은 목표부터 만들어 보세요.
        </p>
      ) : (
        <ul className="app-list">
          {commitments.map((c) => (
            <li key={c.id}>
              <Link href="/commitments" className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition active:bg-black/5 dark:active:bg-white/5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    c.done ? "border-brand bg-brand text-white dark:text-zinc-950" : "border-muted"
                  }`}
                >
                  {c.done ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                </span>
                <span className={`text-safe min-w-0 flex-1 text-sm ${c.done ? "text-muted line-through" : "font-semibold"}`}>
                  {c.title}
                </span>
                <span className="max-w-24 shrink-0 truncate text-xs tabular-nums text-muted">{c.valueText}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
