"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";

import {
  markAllTodayCompleteAction,
  type CondMarkInput,
  type PlanMarkInput,
} from "@/features/routine/mark-all-actions";

export function MarkAllDoneButton({
  planRows,
  warmup,
  cooldown,
}: {
  planRows: PlanMarkInput[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const total = planRows.length + warmup.length + cooldown.length;

  function run() {
    if (total === 0) return;
    start(async () => {
      await markAllTodayCompleteAction({ planRows, warmup, cooldown });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending || total === 0}
      onClick={run}
      title={total === 0 ? "완료 처리할 운동이 없습니다" : undefined}
      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" size={14} />
      ) : (
        <CheckCheck aria-hidden="true" size={14} />
      )}
      오늘 전부 완료
      {total > 0 ? (
        <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {total}
        </span>
      ) : null}
    </button>
  );
}
