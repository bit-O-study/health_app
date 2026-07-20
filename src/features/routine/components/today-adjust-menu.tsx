"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Moon,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DAY_BLOCKS,
  MUSCLE_BLOCK_GROUPS,
  TONE_STYLES,
  type DayBlockId,
} from "@/features/routine/data";
import {
  convertTodayToRestAction,
  deferRoutineOneDayAction,
  restartRoutineFromTodayAction,
  undoTodayRestAction,
} from "@/features/routine/actions";
import {
  clearDailyPlanForDateAction,
  pinRoutineFocusesForTodayAction,
} from "@/features/routine/daily-plan-actions";
import { seoulYmd } from "@/features/routine/data";
import { TodayAddExercises } from "@/features/routine/components/today-add-exercises";

// "오늘만 바꾸기" 부위 선택 — 루틴 빌더와 **동일한 집합**을 제시해야 한다(원칙 #1):
// 기본 부위(전체) + 세부근육 블록 + 세션 묶음. (MUSCLE_BLOCK_GROUPS = 빌더와 공유.)
const SESSION_GROUPS: DayBlockId[] = ["fullbody", "upper", "push", "pull"];

/** 부위/세부근육 선택 칩 (다중선택 토글). */
function FocusToggle({
  id,
  label,
  active,
  disabled = false,
  onClick,
  whole = false,
}: {
  id: DayBlockId;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** 부위 전체·세션 묶음이면 살짝 강조(굵게). */
  whole?: boolean;
}) {
  const style = TONE_STYLES[DAY_BLOCKS[id].day.tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
        whole ? "font-bold" : "font-semibold",
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {label}
    </button>
  );
}

export function TodayAdjustMenu({
  isRestToday = false,
  embedded = false,
  open: openProp,
  onClose,
}: {
  isRestToday?: boolean;
  /** true 면 자체 트리거 버튼을 숨기고 open/onClose 로 외부에서 시트를 제어한다. */
  embedded?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = embedded ? Boolean(openProp) : openState;
  const [picked, setPicked] = useState<Set<DayBlockId>>(new Set());
  const [pending, start] = useTransition();

  const closeSheet = () => {
    if (embedded) onClose?.();
    else setOpenState(false);
  };

  function close() {
    if (pending) return;
    closeSheet();
    setPicked(new Set());
  }

  function run(action: () => Promise<void>) {
    start(async () => {
      await action();
      closeSheet();
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

  // "운동 전체 바꾸기": 오늘 부위를 선택 부위로 '대체'. 기존 daily_plan 을 비운다.
  // 이미 완료한 운동은 오늘 화면에 완료 배지로 그대로 남는다(today-exercises 가 합쳐 보임).
  function replaceAndGo() {
    if (picked.size === 0) return;
    const focuses = Array.from(picked).join(",");
    start(async () => {
      if (isRestToday) await undoTodayRestAction();
      // 루틴 전체를 하루씩 민다(오늘 원래 운동→내일, 아무 날도 안 사라짐) + 오늘을
      // '변경된 날'로 마킹(선택 부위 기억)해 원래 운동을 숨긴다. 오늘 plan/conditioning 비움.
      await deferRoutineOneDayAction(focuses);
      await clearDailyPlanForDateAction(seoulYmd());
      closeSheet();
      setPicked(new Set());
      // push 뒤 refresh 는 넣지 않는다 — /plan/today 이동 시 서버 컴포넌트가 새로 렌더되고,
      // push 직후 refresh 는 (현재 /routine 을 리페치해) push 를 취소하는 레이스가 있다.
      router.push(`/plan/today?focus=${focuses}`);
    });
  }

  // "오늘만 부위 추가": 기존 부위는 그대로 두고 선택 부위를 더한다. 기존 루틴 부위를
  // 오늘 daily_plan 으로 고정(pin)해 둔 뒤 추가 부위를 편집하면, today 가 (기존+추가)로 보인다.
  function addAndGo() {
    if (picked.size === 0) return;
    const focuses = Array.from(picked).join(",");
    start(async () => {
      if (isRestToday) await undoTodayRestAction();
      await pinRoutineFocusesForTodayAction();
      closeSheet();
      setPicked(new Set());
      // add=1 → 편집기가 '현재 오늘 운동 + 추가한 부위'를 함께 보여준다.
      // push 직후 refresh 는 push 를 취소하는 레이스가 있어 넣지 않는다(부위 추가가
      // /plan/today 로 이동 안 하고 /routine 에 머물던 원인). 이동 시 새로 렌더됨.
      router.push(`/plan/today?focus=${focuses}&add=1`);
    });
  }

  return (
    <>
      {!embedded ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenState(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <SlidersHorizontal aria-hidden="true" size={14} />
            오늘만 운동 바꾸기
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(restartRoutineFromTodayAction)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={14} />
            ) : (
              <RotateCcw aria-hidden="true" size={14} />
            )}
            오늘부터 다시 시작하기
          </button>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
                오늘만 운동 바꾸기
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200"
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
                className="mt-5 flex w-full items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700 dark:text-emerald-400">
                  <Play aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    다시 운동하기
                  </span>
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                    휴식을 해제하고 직전 운동 데이터를 다시 불러옵니다
                  </span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(convertTodayToRestAction)}
                className="mt-5 flex w-full items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                  <Moon aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    오늘 휴식 전환하기
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    오늘 쉬고 루틴이 하루씩 미뤄집니다
                  </span>
                </span>
              </button>
            )}

            {/* ① 운동 직접 담기 — 전체 운동 검색·다중선택(오늘만) */}
            <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              운동 직접 담기
            </p>
            <TodayAddExercises />

            {/* ② 오늘만 부위 바꾸기 — 부위 선택 후 대체/추가.
                루틴 빌더와 동일하게 기본 부위 + 세부근육 블록까지 고를 수 있다(원칙 #1). */}
            <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              오늘만 부위 바꾸기 — 부위 선택 (세부근육까지, 여러 개)
            </p>
            <div className="space-y-2.5">
              {MUSCLE_BLOCK_GROUPS.map((g) => (
                <div key={g.whole}>
                  <div className="flex flex-wrap gap-1.5">
                    <FocusToggle
                      id={g.whole}
                      label={`${g.label} 전체`}
                      active={picked.has(g.whole)}
                      disabled={pending}
                      onClick={() => toggleFocus(g.whole)}
                      whole
                    />
                    {g.subs.map((s) => (
                      <FocusToggle
                        key={s}
                        id={s}
                        label={DAY_BLOCKS[s].label}
                        active={picked.has(s)}
                        disabled={pending}
                        onClick={() => toggleFocus(s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* 세션 묶음(전신/상체/푸시/풀) */}
              <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                {SESSION_GROUPS.map((s) => (
                  <FocusToggle
                    key={s}
                    id={s}
                    label={DAY_BLOCKS[s].label}
                    active={picked.has(s)}
                    disabled={pending}
                    onClick={() => toggleFocus(s)}
                    whole
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={pending || picked.size === 0}
                onClick={replaceAndGo}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                운동 전체 바꾸기
                <ArrowRight aria-hidden="true" size={15} />
              </button>
              <button
                type="button"
                disabled={pending || picked.size === 0}
                onClick={addAndGo}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-500 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-300 dark:bg-zinc-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <Plus aria-hidden="true" size={15} />
                오늘만 부위 추가
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
              <strong>전체 바꾸기</strong>는 오늘 부위를 선택 부위로 바꿉니다(이미
              완료한 운동은 그대로 남아요). <strong>부위 추가</strong>는 오늘
              운동에 선택 부위를 더합니다. 둘 다 <strong>오늘 하루만</strong>{" "}
              반영됩니다.
            </p>

            {pending ? (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={15}
                />
                적용 중…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
