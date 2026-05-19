"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Moon, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DAY_BLOCKS,
  DAY_BLOCK_IDS,
  TONE_STYLES,
  type DayBlockId,
} from "@/features/routine/data";
import {
  convertTodayToRestAction,
  restartRoutineFromTodayAction,
  setTodayFocusAction,
} from "@/features/routine/actions";

/** 오늘만 변경할 수 있는 부위(휴식 제외 — 휴식은 전용 버튼) */
const FOCUS_CHOICES = DAY_BLOCK_IDS.filter(
  (id): id is DayBlockId => id !== "rest",
);

export function TodayAdjustMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function run(action: () => Promise<void>) {
    start(async () => {
      await action();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <SlidersHorizontal aria-hidden="true" size={14} />
          오늘만 루틴 변경하기
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(restartRoutineFromTodayAction)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={14} />
          ) : (
            <RotateCcw aria-hidden="true" size={14} />
          )}
          오늘부터 다시 시작하기
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950">
                오늘만 루틴 변경
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => !pending && setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() => run(convertTodayToRestAction)}
              className="mt-5 flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-100 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600">
                <Moon aria-hidden="true" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-zinc-950">
                  오늘 휴식 전환하기
                </span>
                <span className="block text-xs text-zinc-500">
                  오늘 쉬고 루틴이 하루씩 미뤄집니다
                </span>
              </span>
            </button>

            <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              오늘만 다른 부위로 (내일부터는 원래 루틴)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_CHOICES.map((id) => {
                const style = TONE_STYLES[DAY_BLOCKS[id].day.tone];
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setTodayFocusAction(id))}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        style.dot,
                      )}
                    />
                    {DAY_BLOCKS[id].label}
                  </button>
                );
              })}
            </div>

            {pending ? (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                적용 중…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}