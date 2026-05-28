"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Pause, Play, Save, Timer } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { addWorkoutDurationAction } from "@/features/workout-timer/workout-session-actions";
import {
  elapsedMs,
  formatElapsed,
  readTimer,
  seoulTodayYmd,
  writeTimer,
  type TimerState,
} from "@/features/workout-timer/timer-store";
import {
  GuidedOverlay,
  type GuidedItem,
} from "@/features/workout-timer/guided-workout";

/**
 * "오늘 할 운동" 상단 세션 스톱워치 + 가이드 트리거.
 *
 * 동작
 * - 운동 시작: 새 세션. forDate = 오늘
 * - 일시정지/재개: 누적 시간 freeze/unfreeze
 * - 정지(Save): 그때까지 누적된 시간을 DB 에 더하고 타이머 reset (캘린더에 반영)
 * - 자정 롤오버: forDate 와 오늘이 다르면 자동으로 어제 분 저장 + 새 세션 시작
 *   (사용자가 자정 넘긴 후 앱을 켜도 어제분이 캘린더에 정확히 기록됨)
 */
export function WorkoutSessionTimer({
  queueItems = [],
}: {
  queueItems?: GuidedItem[];
}) {
  const router = useRouter();
  const [state, setState] = useState<TimerState | null>(null);
  const [guided, setGuided] = useState(false);
  const [saveAsk, setSaveAsk] = useState(false);
  const [savingErr, setSavingErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  // 자정 롤오버 중복 방지 — 한 번 처리한 forDate 는 다시 처리 안 함
  const rolledOverRef = useRef<string | null>(null);

  /** 서버 액션 호출 + 결과 처리. 실패 시 사용자에게 알림. */
  async function saveDuration(forDate: string, sec: number): Promise<boolean> {
    if (sec <= 0) return true;
    try {
      const res = await addWorkoutDurationAction(forDate, sec);
      if (!res.ok) {
        setSavingErr(res.error);
        // 콘솔에도 — 실패 원인이 schema 미적용일 가능성 높음
        // eslint-disable-next-line no-console
        console.error("[workout] 저장 실패:", res.error);
        return false;
      }
      // 캘린더·히스토리 화면 즉시 반영
      router.refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSavingErr(msg);
      // eslint-disable-next-line no-console
      console.error("[workout] 저장 예외:", e);
      return false;
    }
  }

  // 1) localStorage 복원 + 자정 롤오버 체크
  useEffect(() => {
    const restored = readTimer();
    if (restored) {
      // forDate 와 오늘이 다르면: 어제까지의 시간을 저장하고 타이머는 reset
      const today = seoulTodayYmd();
      if (restored.forDate !== today && rolledOverRef.current !== restored.forDate) {
        rolledOverRef.current = restored.forDate;
        const elapsedSec = Math.floor(elapsedMs(restored) / 1000);
        void saveDuration(restored.forDate, elapsedSec);
        // 새 세션 시작 (계속 운동 중이라고 가정 — 일시정지 상태였으면 유지)
        const fresh: TimerState = {
          startedAt: Date.now(),
          pausedAt: restored.pausedAt !== null ? Date.now() : null,
          accumulated: 0,
          forDate: today,
        };
        writeTimer(fresh);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(fresh);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(restored);
    // saveDuration 은 closure 로 고정 — deps 에 넣을 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 1초마다 리렌더 + 자정 체크
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => {
      // 자정 체크 — 실행 중일 때만 (일시정지면 시간 흐르지 않으니 굳이 X)
      if (state.pausedAt === null) {
        const today = seoulTodayYmd();
        if (state.forDate !== today && rolledOverRef.current !== state.forDate) {
          rolledOverRef.current = state.forDate;
          const elapsedSec = Math.floor(elapsedMs(state) / 1000);
          void saveDuration(state.forDate, elapsedSec);
          const fresh: TimerState = {
            startedAt: Date.now(),
            pausedAt: null,
            accumulated: 0,
            forDate: today,
          };
          writeTimer(fresh);
          setState(fresh);
          return;
        }
      }
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
    // saveDuration 은 closure 로 고정 — state 만 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function start() {
    const s: TimerState = {
      startedAt: Date.now(),
      pausedAt: null,
      accumulated: 0,
      forDate: seoulTodayYmd(),
    };
    writeTimer(s);
    setState(s);
    if (queueItems.length > 0) setGuided(true);
  }
  function pause() {
    if (!state || state.pausedAt !== null) return;
    const now = Date.now();
    const s: TimerState = {
      startedAt: state.startedAt,
      pausedAt: now,
      accumulated: state.accumulated + (now - state.startedAt),
      forDate: state.forDate,
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
      forDate: state.forDate,
    };
    writeTimer(s);
    setState(s);
  }
  function requestSave() {
    setSaveAsk(true);
  }
  /**
   * 정지 = 누적 시간을 DB 에 더하고 타이머 reset.
   * "없애는 게 아니라 캘린더에 올린다" 의미.
   */
  async function confirmSave() {
    if (!state) {
      setSaveAsk(false);
      return;
    }
    const sec = Math.floor(elapsedMs(state) / 1000);
    setSaveAsk(false);
    const ok = await saveDuration(state.forDate, sec);
    if (!ok) return; // 실패 시 상태 유지해 재시도 가능
    writeTimer(null);
    setState(null);
  }

  /**
   * 가이드 오버레이가 마지막 항목까지 모두 처리됐을 때 호출.
   * 운동이 끝났으니 누적 시간을 저장하고 타이머 reset.
   * 사용자가 명시적 정지 안 눌러도 자동으로 캘린더 반영.
   */
  async function handleGuidedAllComplete() {
    if (!state) return;
    const sec = Math.floor(elapsedMs(state) / 1000);
    const ok = await saveDuration(state.forDate, sec);
    if (!ok) return;
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

  const overlay =
    guided && queueItems.length > 0 ? (
      <GuidedOverlay
        items={queueItems}
        onClose={() => setGuided(false)}
        onAllComplete={handleGuidedAllComplete}
      />
    ) : null;

  const running = state.pausedAt === null;
  const time = formatElapsed(elapsedMs(state));

  return (
    <>
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
        <Timer
          aria-hidden="true"
          size={16}
          className={`text-emerald-700 dark:text-emerald-300 ${running ? "animate-pulse" : ""}`}
        />
        <span className="font-mono text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
          {time}
        </span>
        {queueItems.length > 0 && !guided ? (
          <button
            type="button"
            aria-label="가이드 다시 열기"
            title="가이드 다시 열기"
            onClick={() => setGuided(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <ListChecks aria-hidden="true" size={14} />
          </button>
        ) : null}
        {running ? (
          <button
            type="button"
            aria-label="일시정지"
            title="일시정지"
            onClick={pause}
            className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <Pause aria-hidden="true" size={14} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="재개"
            title="재개"
            onClick={resume}
            className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <Play aria-hidden="true" size={14} />
          </button>
        )}
        <button
          type="button"
          aria-label="정지하고 시간 저장"
          title="정지하고 시간 저장"
          onClick={requestSave}
          className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <Save aria-hidden="true" size={13} />
        </button>
      </div>
      {overlay}
      <ConfirmDialog
        open={saveAsk}
        title="운동 정지 + 저장"
        message={`${formatElapsed(elapsedMs(state))} 만큼 ${state.forDate} 에 누적합니다.`}
        confirmLabel="저장"
        tone="default"
        onConfirm={confirmSave}
        onCancel={() => setSaveAsk(false)}
      />
      <ConfirmDialog
        open={savingErr !== null}
        title="저장 실패"
        message={
          savingErr +
          "\n\n원인: 'workout_sessions' 테이블이 Supabase 에 없을 가능성이 큽니다. supabase/schema.sql 의 workout_sessions 블록을 실행해주세요."
        }
        confirmLabel="확인"
        cancelLabel=""
        tone="danger"
        onConfirm={() => setSavingErr(null)}
        onCancel={() => setSavingErr(null)}
      />
    </>
  );
}
