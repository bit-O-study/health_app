"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Moon,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";

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
  undoTodayRestAction,
} from "@/features/routine/actions";

const FOCUS_CHOICES = DAY_BLOCK_IDS.filter(
  (id): id is DayBlockId => id !== "rest",
);

export function TodayAdjustMenu({
  isRestToday = false,
}: {
  isRestToday?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<DayBlockId>>(new Set());
  const [pending, start] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setPicked(new Set());
  }

  function run(action: () => Promise<void>) {
    start(async () => {
      await action();
      setOpen(false);
      setPicked(new Set());
      router.refresh();
    });
  }

  function toggleFocus(id: DayBlockId) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyAndGo() {
    if (picked.size === 0) return;
    const focuses = Array.from(picked).join(",");
    start(async () => {
      // 휴식 상태였다면 운동 상태로 전환한 뒤 편집 화면으로 이동
      if (isRestToday) await undoTodayRestAction();
      setOpen(false);
      setPicked(new Set());
      router.push(`/plan/today?focus=${focuses}`);
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
          오늘만 운동 바꾸기
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
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950">
                오늘만 운동 바꾸기
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {/* 휴식 전환 / 다시 운동하기 토글 */}
            {isRestToday ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(undoTodayRestAction)}
                className="mt-5 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700">
                  <Play aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-bold text-zinc-950">
                    다시 운동하기
                  </span>
                  <span className="block text-xs text-zinc-600">
                    휴식을 해제하고 직전 운동 데이터를 다시 불러옵니다
                  </span>
                </span>
              </button>
            ) : (
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
                  <span className="block whitespace-nowrap text-sm font-bold text-zinc-950">
                    오늘 휴식 전환하기
                  </span>
                  <span className="block text-xs text-zinc-500">
                    오늘 쉬고 루틴이 하루씩 미뤄집니다
                  </span>
                </span>
              </button>
            )}

            <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              오늘 바꿀 부위 선택 (여러 개)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_CHOICES.map((id) => {
                const active = picked.has(id);
                const style = TONE_STYLES[DAY_BLOCKS[id].day.tone];
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={pending}
                    onClick={() => toggleFocus(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition",
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-emerald-300 hover:bg-emerald-50",
                    )}
                  >
                    <span
                      className={cn("h-4 w-4 shrink-0 rounded border", {
                        "border-emerald-600 bg-emerald-600": active,
                        "border-zinc-300 bg-white": !active,
                      })}
                    />
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />
                    {DAY_BLOCKS[id].label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={pending || picked.size === 0}
              onClick={applyAndGo}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              바꾸기 ({picked.size}개)
              <ArrowRight aria-hidden="true" size={15} />
            </button>

            <p className="mt-3 text-[11px] text-zinc-500">
              선택한 부위만 보여주는 편집 화면으로 이동합니다. 저장하면 오늘
              운동 목록에 바로 반영되고, 이미 완료한 운동은 그대로 남습니다.
            </p>

            {pending ? (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500">
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
