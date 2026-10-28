"use client";

import { useState, useTransition } from "react";
import { useBackClose } from "@/lib/platform/use-back-close";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Footprints,
  House,
  Loader2,
  MapPin,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  deferRoutineOneDayAction,
  restartRoutineFromTodayAction,
} from "@/features/routine/actions";
import { TodayAdjustMenu } from "@/features/routine/components/today-adjust-menu";
import { FREE_GOAL, type RunGoal } from "@/features/running/run-guide";
import { lastRunLabel, runHref, type LastRunSetting } from "@/features/running/run-context";

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
  routineDay,
  lastRun = null,
}: {
  focusLabel: string;
  badgeClass: string;
  dotClass: string;
  isRestToday?: boolean;
  /** 오늘 루틴 일차(0~6) — 런닝 기록에 남겨 다음에 같은 일차가 오면 지난 설정으로 연다. */
  routineDay?: number;
  /** 이 루틴 일차(없으면 루틴에서 뛴 마지막)의 런닝 설정 — '지난번처럼 달리기'(런닝 이어하기, 2026-10-28). */
  lastRun?: LastRunSetting | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  // 런닝하기 → '오늘 런닝으로 대체할까요?' 확인.
  const [confirmRun, setConfirmRun] = useState(false);
  const [runMode, setRunMode] = useState<"indoor" | "outdoor">("indoor");
  // 런닝 모드 시작 화면에 미리 골라 둘 목표 — 같은 모드의 지난 목표, 없으면 자유 달리기.
  const [runGoal, setRunGoal] = useState<RunGoal>(FREE_GOAL);
  const hrefFor = (mode: "indoor" | "outdoor", replaced: boolean) =>
    runHref(mode, routineDay === undefined ? null : { routineDay, goal: runGoal, replaced });
  const [pending, start] = useTransition();
  // 저장이 실패하면 배지 아래에 말한다(2026-10-14) — 예전엔 실패해도 그냥 다시 읽혔다.
  const [error, setError] = useState<string | null>(null);
  useBackClose(menuOpen, () => {
    if (!pending) setMenuOpen(false);
  });
  useBackClose(confirmRun, () => {
    if (!pending) setConfirmRun(false);
  });

  function restart() {
    setError(null);
    start(async () => {
      const r = await restartRoutineFromTodayAction();
      if (!r.ok) {
        setMenuOpen(false);
        setError(r.error);
        return;
      }
      // 모달 back()이 갱신된 서버 화면을 이전 상태로 되돌리지 않도록 문서를 다시 읽는다.
      window.location.reload();
    });
  }

  // 런닝하기 — 대체 여부를 먼저 물어본다.
  function runToday(mode: "indoor" | "outdoor") {
    setRunMode(mode);
    setRunGoal(lastRun && lastRun.mode === mode ? lastRun.goal : FREE_GOAL);
    setMenuOpen(false);
    setConfirmRun(true);
  }

  // 예 — 오늘 운동을 내일로 미루고(런닝으로 대체) 런닝 모드로.
  function replaceAndRun() {
    start(async () => {
      // 미루지 못했으면 런닝으로 가지 않는다 — 가면 오늘 운동과 런닝이 겹친다.
      const r = await deferRoutineOneDayAction();
      if (!r.ok) {
        setConfirmRun(false);
        setError(r.error);
        return;
      }
      router.push(hrefFor(runMode, true));
    });
  }

  // 아니요 — 기존 운동은 그대로 두고 런닝 모드로(런닝은 마무리운동에 기록).
  function keepAndRun() {
    router.push(hrefFor(runMode, false));
  }

  // 지난번처럼 — 마무리로 뛰었으면 바로 시작. 오늘 운동을 대체(내일로 미루기)했으면 되돌리기 번거로워 한 번 묻는다.
  function runLikeLast() {
    if (!lastRun) return;
    setRunMode(lastRun.mode);
    setRunGoal(lastRun.goal);
    if (lastRun.replaced) {
      setMenuOpen(false);
      setConfirmRun(true);
      return;
    }
    // 메뉴를 먼저 닫으면 모달의 history.back() 이 이 이동을 취소한다('운동 편집'과 같은 이유) —
    // 닫지 않고 이동하고, 메뉴는 화면이 바뀌며 사라진다.
    router.push(runHref(lastRun.mode, routineDay === undefined ? null : { routineDay, goal: lastRun.goal, replaced: false }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-haspopup="dialog"
        data-today-focus-badge
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
            className="app-card w-full max-w-md bg-[var(--surface-strong)] p-5 shadow-xl"
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
                  // 먼저 닫으면 모달의 history.back()이 진행 중인 이동을 취소한다.
                  // 이동이 완료되어 메뉴가 unmount될 때 히스토리를 정리한다.
                  router.push("/plan");
                }}
                className="flex w-full items-center gap-3 rounded-xl border app-field px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60"
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
                className="flex w-full items-center gap-3 rounded-xl border app-field px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
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
                className="flex w-full items-center gap-3 rounded-xl border app-field px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60"
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

              {lastRun ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={runLikeLast}
                  data-testid="run-like-last"
                  className="flex w-full items-center gap-3 rounded-xl border border-brand bg-brand-soft px-4 py-3 text-left transition hover:bg-brand-soft disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white dark:text-zinc-950">
                    <Footprints aria-hidden="true" size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                      지난번처럼 달리기
                    </span>
                    <span className="block text-xs text-zinc-600 dark:text-zinc-300">
                      {lastRunLabel(lastRun)} · {lastRun.sameRoutine ? "이 루틴" : "최근"} {Number(lastRun.forDate.slice(5, 7))}/{Number(lastRun.forDate.slice(8, 10))}
                    </span>
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => runToday("indoor")}
                className="flex w-full items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white dark:text-zinc-950">
                  <House aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    실내 런닝
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    카메라로 제자리 달리기 (마무리운동에 자동 기록)
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={() => runToday("outdoor")}
                className="flex w-full items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-left transition hover:border-sky-400 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-800 dark:bg-sky-950/30 dark:hover:border-sky-700 dark:hover:bg-sky-950/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                  <MapPin aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    야외 런닝
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    GPS로 거리와 페이스 기록 (마무리운동에 자동 기록)
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 런닝 대체 확인 — 예: 오늘 운동 미루고 런닝 / 아니요: 기존 운동 유지하고 런닝 */}
      {confirmRun ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setConfirmRun(false)}
        >
          <div
            className="app-card w-full max-w-sm bg-[var(--surface-strong)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Footprints aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  오늘 {runMode === "indoor" ? "실내" : "야외"} 런닝으로 대체할까요?
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {runMode === "indoor" ? "실내" : "야외"} 런닝을 시작합니다. 오늘
                  예정된 운동을 런닝으로 바꿀지 선택하세요.
                </p>
                {lastRun ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    지난번엔 {lastRun.replaced ? "'대체'" : "'그대로 두고 런닝'"}을 골랐어요.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={pending}
                onClick={replaceAndRun}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white dark:text-zinc-950 transition hover:bg-brand/90 disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                ) : null}
                예 — 오늘 운동을 런닝으로 대체 (운동은 내일로)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={keepAndRun}
                className="flex w-full items-center justify-center rounded-xl border app-field px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                아니요 — 기존 운동은 그대로 두고 런닝
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
      {error ? (
        <p role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
