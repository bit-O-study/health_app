"use client";

import { useState } from "react";
import Link from "next/link";
import { LineChart, Scale, Target, X } from "lucide-react";

import { BodyLogForm } from "@/features/profile/components/body-log-form";

/** 목표 진행 표시(운동탭 체형기록) — 목표까지 남은 양. 없으면 null. */
export type BodyGoalView = {
  label: string;
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
        // 목표가 있으면 '목표까지 N kg/%' 를 크게 보여주고, 탭하면 기록 입력.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-bold transition sm:flex-initial sm:px-4 ${
            goal.reached
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          }`}
          title={goal.targetText}
        >
          <Target aria-hidden="true" size={15} />
          {goal.label}
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
