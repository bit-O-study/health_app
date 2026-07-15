"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { restartRoutineFromTodayAction } from "@/features/routine/actions";
import { TodayAdjustMenu } from "@/features/routine/components/today-adjust-menu";

/**
 * 오늘 부위 배지("등 +팔")를 탭하면 열리는 액션 메뉴 —
 *   ① 운동 편집(/plan)  ② 오늘만 운동 바꾸기(상세 시트)  ③ 오늘부터 다시 시작하기.
 * 배지 자체가 트리거라, 기존 우측 버튼 줄을 대체해 화면을 깔끔하게 유지한다.
 */
export function TodayFocusMenu({
  focusLabel,
  badgeClass,
  dotClass,
  isRestToday = false,
}: {
  focusLabel: string;
  badgeClass: string;
  dotClass: string;
  isRestToday?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pending, start] = useTransition();

  function restart() {
    start(async () => {
      await restartRoutineFromTodayAction();
      setMenuOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition active:scale-95 ${badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {focusLabel}
        <ChevronDown aria-hidden="true" size={14} className="opacity-60" />
      </button>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={() => !pending && setMenuOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                오늘 운동 관리
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => !pending && setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/plan");
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  <SlidersHorizontal aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    운동 편집
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    루틴·부위·운동을 직접 편집합니다
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  setAdjustOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Shuffle aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    오늘만 운동 바꾸기
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    오늘 하루만 부위·운동을 바꾸거나 휴식 전환
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={restart}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {pending ? (
                    <Loader2 aria-hidden="true" size={18} className="animate-spin" />
                  ) : (
                    <RotateCcw aria-hidden="true" size={18} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    오늘부터 다시 시작하기
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    변경사항을 초기화하고 오늘을 루틴 1일차로
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 상세 '오늘만 운동 바꾸기' 시트(부위 선택·운동 담기·휴식 전환) */}
      <TodayAdjustMenu
        embedded
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        isRestToday={isRestToday}
      />
    </>
  );
}