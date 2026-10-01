"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { applyFitPicksAction } from "@/features/routine/fit-actions";
import type { ApplyMode } from "@/features/routine/today-apply";

export type FitPickView = {
  exerciseId: string;
  name: string;
  equipment: string;
  fills: { label: string; add: number }[];
};

/**
 * 맞춤 운동 추천 카드 — [오늘 운동을 이걸로 바꾸기] / [더하기]. **오늘만 운동 변경으로만**
 * (사용자 결정). 적용하면 오늘 운동 화면으로 간다.
 */
export function FitApplyCard({ picks }: { picks: FitPickView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = picks.length;

  function apply(mode: ApplyMode) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await applyFitPicksAction(
        picks.map((p) => ({ exerciseId: p.exerciseId, equipment: p.equipment })),
        mode,
      );
      if (!r.ok) return setError(r.error);
      if (r.added === 0) return setNotice("추천 운동은 오늘 이미 하게 돼 있어요.");
      router.push("/routine");
    });
  }

  return (
    <section className="app-card space-y-2 p-3" data-testid="fit-picks">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">오늘 이걸 하면</h2>
      <ul className="space-y-1.5">
        {picks.map((p) => (
          <li key={p.exerciseId} className="flex items-center justify-between gap-2 text-sm" data-testid={`fit-pick-${p.exerciseId}`}>
            <span className="min-w-0 font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {p.fills.map((f) => (
                <span key={f.label} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                  {f.label} +{f.add}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-testid="fit-replace"
        onClick={() => apply("replace")}
        disabled={pending || n === 0}
        className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
      >
        {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
        오늘 운동을 이 {n}개로 바꾸기
      </button>
      <button
        type="button"
        data-testid="fit-add"
        onClick={() => apply("add")}
        disabled={pending || n === 0}
        className="app-press inline-flex h-10 w-full items-center justify-center rounded-full border border-brand text-sm font-semibold text-brand disabled:opacity-50"
      >
        오늘 운동에 {n}개 더하기
      </button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <b>오늘만</b> 바뀌고 내 루틴은 그대로예요. 바꾸기를 고르면 오늘 원래 운동은 내일로 미뤄져요. 무게·세트는 내 기록 기준.
      </p>
      {error ? <p role="alert" className="text-xs font-semibold text-danger">{error}</p> : null}
      {notice ? <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{notice}</p> : null}
    </section>
  );
}
