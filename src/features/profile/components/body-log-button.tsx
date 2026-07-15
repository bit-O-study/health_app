"use client";

import { useState } from "react";
import Link from "next/link";
import { LineChart, Scale, X } from "lucide-react";

import { BodyLogForm } from "@/features/profile/components/body-log-form";

/** 목표 진행 표시(운동탭 체형기록) — 무엇이 얼마나 남았는지. 없으면 null. */
export type BodyGoalView = {
  /** 지표 이름(체중/체지방/근육). */
  metricLabel: string;
  /** 남은 양+단위(예: "3.2kg"). */
  remainingText: string;
  targetText: string;
  reached: boolean;
} | null;

export function BodyLogButton({
  current,
  goal = null,
}: {
  current: {
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
  };
  goal?: BodyGoalView;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {goal ? (
        // 목표가 있으면 '무엇이 얼마 남았는지'를 배지+숫자로 보여주고, 탭하면 기록 입력.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 flex-1 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-300 bg-white pl-1.5 pr-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-800 dark:text-emerald-200 dark:hover:bg-emerald-950/30 sm:flex-initial"
          title={goal.targetText}
        >
          <span className="inline-flex h-7 items-center rounded-full bg-emerald-600 px-2.5 text-xs font-bold text-white">
            {goal.metricLabel}
          </span>
          {goal.reached ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              목표 달성 🎉
            </span>
          ) : (
            <span>
              <span className="text-base font-black tabular-nums">
                {goal.remainingText}
              </span>
              <span className="ml-0.5 text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                남음
              </span>
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 sm:flex-initial sm:px-4"
        >
          <Scale aria-hidden="true" size={15} />
          체형 기록
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-4 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
                체형 기록
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <BodyLogForm current={current} onDone={() => setOpen(false)} />

            <Link
              href="/settings/profile"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <LineChart aria-hidden="true" size={15} />
              체형 그래프 보기
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
