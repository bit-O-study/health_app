"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Target } from "lucide-react";

import { suggestCommitmentsAction } from "@/features/coach/coach-actions";
import { addCommitmentAction } from "@/features/commitments/actions";
import {
  metricMeta,
  type CommitmentMetric,
} from "@/features/commitments/commitment";
import type { SuggestedCommitment } from "@/features/coach/parse";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function CommitmentSuggestions() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<SuggestedCommitment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  function suggest() {
    setError(null);
    setAdded(new Set());
    start(async () => {
      const r = await suggestCommitmentsAction();
      if (r.ok) setItems(r.suggestions);
      else setError(r.error);
    });
  }

  function add(s: SuggestedCommitment, idx: number) {
    setAddingIdx(idx);
    start(async () => {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + s.days);
      const res = await addCommitmentAction({
        title: s.title,
        tag: "ai",
        metric: s.metric,
        target: s.target,
        startDate: ymd(today),
        deadline: ymd(end),
      });
      if (res.ok) {
        setAdded((prev) => new Set(prev).add(idx));
        router.refresh();
      } else {
        setError(res.error);
      }
      setAddingIdx(null);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Target aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            AI 다짐 짜주기
          </h2>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            내 운동·식단 데이터로 실천 가능한 다짐을 제안받고, 바로 추가하세요.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={suggest}
        disabled={pending && addingIdx === null}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending && addingIdx === null ? (
          <Loader2 aria-hidden="true" size={16} className="animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" size={16} />
        )}
        {pending && addingIdx === null ? "생각 중…" : "다짐 제안받기"}
      </button>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {items ? (
        <ul className="mt-4 space-y-2">
          {items.map((s, i) => {
            const meta = metricMeta(s.metric as CommitmentMetric);
            const done = added.has(i);
            return (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {meta.label} {s.target.toLocaleString()}
                    {meta.unit} · {s.days}일
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => add(s, i)}
                  disabled={pending || done}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold transition disabled:opacity-60 ${
                    done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {addingIdx === i ? (
                    <Loader2 aria-hidden="true" size={13} className="animate-spin" />
                  ) : done ? (
                    <Check aria-hidden="true" size={13} />
                  ) : null}
                  {done ? "추가됨" : "추가"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
