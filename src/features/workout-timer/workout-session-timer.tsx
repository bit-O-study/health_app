"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, Timer } from "lucide-react";

import {
  elapsedMs,
  formatElapsed,
  readTimer,
  writeTimer,
  type TimerState,
} from "@/features/workout-timer/timer-store";

/**
 * "오늘 할 운동" 상단의 세션 스톱워치.
 * - 미시작 상태: "운동 시작" 버튼만 표시
 * - 실행/일시정지: 경과 시간 + 일시정지·재개·종료 버튼
 * - 새로고침해도 localStorage 의 시작시각으로 복원
 */
export function WorkoutSessionTimer() {
  const [state, setState] = useState<TimerState | null>(null);
  // tick — 매초 리렌더 (1초 단위 갱신)
  const [, setTick] = useState(0);

  // localStorage 는 client 에서만 가능 — mount 후 한 번만 동기화. setState in effect 의도된 패턴.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readTimer());
  }, []);

  useEffect(() => {
    if (!state || state.pausedAt !== null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  function start() {
    const s: TimerState = {
      startedAt: Date.now(),
      pausedAt: null,
      accumulated: 0,
    };
    writeTimer(s);
    setState(s);
  }
  function pause() {
    if (!state || state.pausedAt !== null) return;
    const now = Date.now();
    const s: TimerState = {
      startedAt: state.startedAt,
      pausedAt: now,
      accumulated: state.accumulated + (now - state.startedAt),
    };
    writeTimer(s);
    setState(s);
  }
  function resume() {
    if (!state || state.pausedAt === null) return;
    const s: TimerState = {
      startedAt: Date.now(),
      pausedAt: null,
      accumulated: state.accumulated,
    };
    writeTimer(s);
    setState(s);
  }
  function stop() {
    if (!confirm("운동을 종료할까요? 현재 시간은 사라집니다.")) return;
    writeTimer(null);
    setState(null);
  }

  if (!state) {
    return (
      <button
        type="button"
        onClick={start}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
      >
        <Play aria-hidden="true" size={16} />
        운동 시작
      </button>
    );
  }

  const running = state.pausedAt === null;
  const time = formatElapsed(elapsedMs(state));

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
      <Timer
        aria-hidden="true"
        size={16}
        className={`text-emerald-700 dark:text-emerald-300 ${running ? "animate-pulse" : ""}`}
      />
      <span className="font-mono text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
        {time}
      </span>
      {running ? (
        <button
          type="button"
          aria-label="일시정지"
          onClick={pause}
          className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <Pause aria-hidden="true" size={14} />
        </button>
      ) : (
        <button
          type="button"
          aria-label="재개"
          onClick={resume}
          className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <Play aria-hidden="true" size={14} />
        </button>
      )}
      <button
        type="button"
        aria-label="종료"
        onClick={stop}
        className="flex h-7 w-7 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <Square aria-hidden="true" size={13} />
      </button>
    </div>
  );
}
