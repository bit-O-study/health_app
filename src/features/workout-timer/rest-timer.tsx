"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Clock, Plus, X } from "lucide-react";

type RestState = {
  /** 종료 예정 시각(ms epoch) */
  endsAt: number;
  /** 총 휴식 시간(초) — 진행률 바 계산용 */
  totalSec: number;
};

type Ctx = {
  /** seconds 만큼 휴식 타이머 시작 (이미 진행 중이면 덮어쓰기) */
  trigger: (seconds: number) => void;
  /**
   * 하단 액션 바(예: 가이드 오버레이의 완료/넘기기 버튼)가 떠 있는 동안 true.
   * true 면 휴식 알약을 그 위로 띄워서 버튼 탭을 가리지 않게 한다.
   */
  setLifted: (lifted: boolean) => void;
};

const RestCtx = createContext<Ctx>({ trigger: () => {}, setLifted: () => {} });

/**
 * 휴식 타이머 컨텍스트 + 하단 오버레이.
 * 자식 어디서든 `useRestTimer().trigger(90)` 으로 90초 카운트다운 시작.
 * 종료 시 비프음(Web Audio) + 진동(지원 기기) — 두 번째 종료까지 자동.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestState | null>(null);
  // 하단 버튼 바가 떠 있으면 알약을 그 위로 — 탭 가림 방지
  const [lifted, setLiftedState] = useState(false);
  // 0.25s 마다 렌더 — 잔여 시간 표시 부드럽게
  const [, setTick] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const trigger = useCallback((seconds: number) => {
    setState({
      endsAt: Date.now() + seconds * 1000,
      totalSec: seconds,
    });
  }, []);

  const setLifted = useCallback((v: boolean) => setLiftedState(v), []);

  // tick
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [state]);

  // 잔여 0 도달 여부 — 시계 기반 파생값. tick 마다 재계산되어 false→true 로 한 번 전환된다.
  // eslint-disable-next-line react-hooks/purity
  const ended = state !== null && state.endsAt - Date.now() <= 0;

  // 종료 처리 — ended 가 true 로 전환될 때 한 번만 비프 + 진동 + 자동 닫기 예약.
  // ⚠ deps 에 [ended] 를 둬야 함: deps 가 없으면 매 렌더(250ms tick)마다 effect 가
  // 재실행되며 직전 렌더의 cleanup 이 close 타이머를 clearTimeout 해버려 영원히 안 닫힘.
  useEffect(() => {
    if (!ended) return;
    playBeep(audioCtxRef);
    tryVibrate([180, 80, 180]);
    // 알약은 1.5초 더 보여주고 자동 닫기 (사용자가 끝났음을 인지)
    const closeId = window.setTimeout(() => setState(null), 1500);
    return () => window.clearTimeout(closeId);
  }, [ended]);

  function skip() {
    setState(null);
  }
  function addSec(extra: number) {
    if (!state) return;
    setState({
      endsAt: state.endsAt + extra * 1000,
      totalSec: state.totalSec + extra,
    });
  }

  // 잔여 시간은 매 tick 마다 Date.now() 로 재계산 — purity 룰은 무시 (시계 기반 UI 의도된 패턴).
  // eslint-disable-next-line react-hooks/purity
  const remainingMs = state ? Math.max(0, state.endsAt - Date.now()) : 0;

  return (
    <RestCtx.Provider value={{ trigger, setLifted }}>
      {children}
      {state ? (
        <RestOverlay
          remainingMs={remainingMs}
          totalSec={state.totalSec}
          lifted={lifted}
          onSkip={skip}
          onAdd={addSec}
        />
      ) : null}
    </RestCtx.Provider>
  );
}

export function useRestTimer(): Ctx {
  return useContext(RestCtx);
}

function RestOverlay({
  remainingMs,
  totalSec,
  lifted,
  onSkip,
  onAdd,
}: {
  remainingMs: number;
  totalSec: number;
  /** 하단 버튼 바 위로 띄울지 — 가이드 오버레이가 떠 있을 때 true */
  lifted: boolean;
  onSkip: () => void;
  onAdd: (extra: number) => void;
}) {
  const remainingSec = Math.ceil(remainingMs / 1000);
  const done = remainingMs <= 0;
  const progress = Math.min(
    1,
    1 - remainingMs / Math.max(1, totalSec * 1000),
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{
        // 가이드 오버레이의 하단 완료/넘기기 버튼 바(≈4.5rem + 안전영역) 위로 띄워서 탭을 가리지 않게.
        bottom: lifted
          ? "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)"
          : "1rem",
      }}
    >
      <div
        className={`pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full px-4 py-2.5 shadow-lg ${
          done
            ? "bg-emerald-600 text-white"
            : "bg-zinc-900 text-white dark:bg-zinc-800"
        }`}
      >
        {/* 진행률 바 — 뒤에 깔리는 그라데이션 */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-emerald-500/30"
          style={{ width: `${progress * 100}%`, transition: "width 250ms linear" }}
        />
        <Clock aria-hidden="true" size={16} className="relative z-10 shrink-0" />
        <span className="relative z-10 font-mono text-sm font-bold tabular-nums">
          {done ? "휴식 완료" : `휴식 ${formatSec(remainingSec)}`}
        </span>
        {!done ? (
          <>
            <button
              type="button"
              onClick={() => onAdd(30)}
              className="relative z-10 inline-flex h-7 items-center gap-0.5 rounded-full bg-white/10 px-2 text-xs font-semibold transition hover:bg-white/20"
            >
              <Plus aria-hidden="true" size={12} />
              30s
            </button>
            <button
              type="button"
              aria-label="휴식 건너뛰기"
              onClick={onSkip}
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function playBeep(ctxRef: { current: AudioContext | null }) {
  try {
    // 사용자 제스처 후에만 동작 — 운동 시작 버튼 탭으로 unlock 됨
    type WindowWithAudio = Window &
      typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
    const w = window as WindowWithAudio;
    const AC = window.AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    // 두 번 짧게 삐
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch {
    /* noop */
  }
}

function tryVibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}
