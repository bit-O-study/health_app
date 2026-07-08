"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Clock, GripVertical, Plus, X } from "lucide-react";

import {
  DEFAULT_REST_SEC,
  REST_DEFAULT_KEY,
  REST_PRESETS,
  clampRest,
  formatRest,
} from "@/features/workout-timer/rest-logic";
import { playRestAlert } from "@/features/workout-timer/rest-sound";

type RestState = {
  /** 종료 예정 시각(ms epoch) */
  endsAt: number;
  /** 총 휴식 시간(초) — 진행률 바 계산용 */
  totalSec: number;
};

type Ctx = {
  /** seconds 만큼 휴식 타이머 시작. 생략하면 사용자 기본 휴식 시간 사용. (이미 진행 중이면 덮어쓰기) */
  trigger: (seconds?: number) => void;
  /** 사용자가 설정한 기본 휴식 시간(초). */
  defaultSec: number;
  /** 기본 휴식 시간 변경(보정 + localStorage 저장). */
  setDefaultSec: (seconds: number) => void;
  /**
   * 하단 액션 바(예: 가이드 오버레이의 완료/넘기기 버튼)가 떠 있는 동안 true.
   * true 면 휴식 알약을 그 위로 띄우고, 더 크게(가이드 화면 전용) 표시한다.
   */
  setLifted: (lifted: boolean) => void;
};

const RestCtx = createContext<Ctx>({
  trigger: () => {},
  defaultSec: DEFAULT_REST_SEC,
  setDefaultSec: () => {},
  setLifted: () => {},
});

/**
 * 휴식 타이머 컨텍스트 + 오버레이.
 * 자식 어디서든 `useRestTimer().trigger()` 으로 카운트다운 시작.
 * 종료 시 비프음(Web Audio) + 진동 + 브라우저 알림 — 앱이 백그라운드여도 알림 발화.
 * 휴식 동안 Wake Lock 으로 화면이 꺼지지 않게 유지(지원 기기).
 */
export function RestTimerProvider({
  children,
  sound = true,
  haptic = true,
}: {
  children: ReactNode;
  /** 개인설정: 휴식 종료 시 비프음. */
  sound?: boolean;
  /** 개인설정: 휴식 종료 시 진동. */
  haptic?: boolean;
}) {
  const [state, setState] = useState<RestState | null>(null);
  // 하단 버튼 바가 떠 있으면 알약을 그 위로 + 크게 — 가이드 화면 전용
  const [lifted, setLiftedState] = useState(false);
  const [defaultSec, setDefaultSecState] = useState(DEFAULT_REST_SEC);
  // AudioContext 는 timer 들 사이에 재사용 — provider 수명 동안 1개만.
  const audioCtxRef = useRef<AudioContext | null>(null);
  // 현재 휴식 종료 예정 시각(ms epoch) — 연장/취소 시 SW 재예약 기준.
  const endsAtRef = useRef<number | null>(null);

  // 사용자 기본 휴식 시간 복원 — 외부(localStorage) 동기화라 의도된 setState.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REST_DEFAULT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setDefaultSecState(clampRest(Number(raw)));
    } catch {
      /* noop */
    }
  }, []);

  const setDefaultSec = useCallback((seconds: number) => {
    const v = clampRest(seconds);
    setDefaultSecState(v);
    try {
      window.localStorage.setItem(REST_DEFAULT_KEY, String(v));
    } catch {
      /* noop */
    }
  }, []);

  const trigger = useCallback(
    (seconds?: number) => {
      const sec = clampRest(seconds ?? defaultSec);
      // 사용자 제스처(완료 버튼 탭) 직후라 알림 권한 요청이 허용됨
      requestNotifyPermission();
      const endsAt = Date.now() + sec * 1000;
      endsAtRef.current = endsAt;
      setState({ endsAt, totalSec: sec });
      // SW 에 종료시각 예약 — 페이지 JS 가 백그라운드에서 얼어도 SW 가 알림 발화.
      scheduleRestNotification(endsAt);
    },
    [defaultSec],
  );

  const setLifted = useCallback((v: boolean) => setLiftedState(v), []);

  const skip = useCallback(() => {
    endsAtRef.current = null;
    cancelRestNotification();
    setState(null);
  }, []);
  const addSec = useCallback((extra: number) => {
    const base = endsAtRef.current;
    if (base == null) return;
    const endsAt = base + extra * 1000;
    endsAtRef.current = endsAt;
    setState((s) => (s ? { endsAt, totalSec: s.totalSec + extra } : s));
    // 연장 시 SW 예약도 새 종료시각으로 갱신.
    scheduleRestNotification(endsAt);
  }, []);

  // ⚠ context value 는 반드시 useMemo — 인라인 객체면 매 렌더 새 ref 가 되어
  // 이를 구독하는 자식(예: 가이드 오버레이)의 effect 가 불필요하게 재실행된다.
  const value = useMemo(
    () => ({ trigger, defaultSec, setDefaultSec, setLifted }),
    [trigger, defaultSec, setDefaultSec, setLifted],
  );

  return (
    <RestCtx.Provider value={value}>
      {children}
      {/* 카운트다운 틱(250ms)은 RestOverlay 내부에 격리 — provider/children(워크아웃
          섹션 전체)을 매 틱 리렌더하지 않도록. 알약만 자체 리렌더된다. */}
      {state ? (
        <RestOverlay
          key={state.endsAt}
          state={state}
          lifted={lifted}
          onSkip={skip}
          onAdd={addSec}
          onClose={skip}
          audioCtxRef={audioCtxRef}
          sound={sound}
          haptic={haptic}
        />
      ) : null}
    </RestCtx.Provider>
  );
}

export function useRestTimer(): Ctx {
  return useContext(RestCtx);
}

function RestOverlay({
  state,
  lifted,
  onSkip,
  onAdd,
  onClose,
  audioCtxRef,
  sound,
  haptic,
}: {
  state: RestState;
  /** 하단 버튼 바 위로 + 크게 — 가이드 오버레이가 떠 있을 때 true */
  lifted: boolean;
  onSkip: () => void;
  onAdd: (extra: number) => void;
  onClose: () => void;
  audioCtxRef: { current: AudioContext | null };
  /** 개인설정: 종료 비프음 / 진동. */
  sound: boolean;
  haptic: boolean;
}) {
  const totalSec = state.totalSec;
  // 250ms 틱 — 이 컴포넌트만 리렌더. provider/children(워크아웃 섹션)은 영향 없음.
  const [, setTick] = useState(0);
  // 백그라운드에서 setInterval 이 throttle 돼도 정확히 종료시각에 끝내기 위한 강제 종료 플래그.
  const [forceDone, setForceDone] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  // 종료 예정 시각에 1회짜리 timeout 예약 — 탭이 백그라운드여도(throttle 돼도)
  // interval 보다 신뢰성 있게 done 으로 전환시킨다.
  useEffect(() => {
    const ms = Math.max(0, state.endsAt - Date.now());
    const id = window.setTimeout(() => setForceDone(true), ms);
    return () => window.clearTimeout(id);
  }, [state.endsAt]);

  // 잔여 시간은 매 tick 마다 Date.now() 로 재계산 — 시계 기반 UI 의도된 패턴.
  // eslint-disable-next-line react-hooks/purity
  const remainingMs = Math.max(0, state.endsAt - Date.now());
  const remainingSec = Math.ceil(remainingMs / 1000);
  const done = forceDone || remainingMs <= 0;

  // 휴식 동안 화면이 꺼지지 않게 Wake Lock 유지 — 화면 꺼짐으로 타이머가 멈추는 것 방지.
  useEffect(() => {
    if (done) return;
    let lock: { release: () => Promise<void> } | null = null;
    let released = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        if (released) void l.release();
        else lock = l;
      })
      .catch(() => {
        /* 권한/지원 안 됨 — 무시 */
      });
    return () => {
      released = true;
      void lock?.release().catch(() => {});
    };
  }, [done]);

  // 종료 처리 — done 으로 전환될 때 한 번만 비프 + 진동 + 알림 + 1.5s 후 자동 닫기.
  // key={endsAt} 로 매 timer 마다 새 인스턴스라 ended 한 번만 안전하게 발화.
  useEffect(() => {
    if (!done) return;
    // 설정된 알림음(기본: 음성 "운동 시작하세요" / 비프 / 사용자 업로드)으로 알림.
    if (sound) void playRestAlert(audioCtxRef);
    if (haptic) tryVibrate([180, 80, 180, 80, 260]);
    // 시스템 알림은 SW 예약(schedule-rest)이 담당한다 — 앱이 백그라운드여도 발화.
    // SW 미제어(dev/미설치)일 때만 포그라운드 Notification 으로 폴백.
    if (!hasServiceWorkerController()) notifyRestDone();
    const closeId = window.setTimeout(onClose, 1500);
    return () => window.clearTimeout(closeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const progress = Math.min(1, 1 - remainingMs / Math.max(1, totalSec * 1000));

  // ── 드래그 이동 — 그립을 잡고 화면 어디든 옮긴다(위치는 localStorage 유지) ──
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REST_POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
      }
    } catch {
      /* noop */
    }
  }, []);

  // 위젯 '전체'를 꾹 눌러(롱프레스) 이동. 버튼은 빠른 탭이면 그대로 동작하고,
  // 길게 누르면 드래그가 시작된다.
  const lpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const LONG_PRESS = 180;

  function clearLp() {
    if (lpRef.current) {
      clearTimeout(lpRef.current);
      lpRef.current = null;
    }
  }
  function onCardDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    clearLp();
    lpRef.current = setTimeout(() => {
      const el = cardRef.current;
      const s = startRef.current;
      if (!el || !s) return;
      el.setPointerCapture?.(s.id);
      const r = el.getBoundingClientRect();
      dragRef.current = { dx: s.x - r.left, dy: s.y - r.top };
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8); // 잡혔다는 햅틱 힌트
      }
    }, LONG_PRESS);
  }
  function onCardMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const el = cardRef.current;
      if (!el) return;
      e.preventDefault();
      const x = clampPos(e.clientX - dragRef.current.dx, window.innerWidth - el.offsetWidth);
      const y = clampPos(e.clientY - dragRef.current.dy, window.innerHeight - el.offsetHeight);
      setPos({ x, y });
    } else {
      // 롱프레스 전에 많이 움직이면(스와이프/스크롤) 드래그로 치지 않는다.
      const s = startRef.current;
      if (s && (Math.abs(e.clientX - s.x) > 8 || Math.abs(e.clientY - s.y) > 8)) {
        clearLp();
      }
    }
  }
  function onCardUp() {
    clearLp();
    if (dragRef.current && pos) {
      try {
        window.localStorage.setItem(REST_POS_KEY, JSON.stringify(pos));
      } catch {
        /* noop */
      }
    }
    dragRef.current = null;
    startRef.current = null;
  }

  const anchored = pos !== null;
  // 드래그로 옮긴 위치가 있으면 그 좌표로, 없으면 기본(하단 중앙) 앵커.
  const outerClass = anchored
    ? "pointer-events-none fixed z-50"
    : "pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4";
  const outerStyle: React.CSSProperties = anchored
    ? { left: pos.x, top: pos.y }
    : {
        bottom: lifted
          ? "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)"
          : "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
      };
  // 위젯 전체에 붙는 드래그(롱프레스) 이벤트. 카드 컨테이너에 spread.
  const cardDragProps = {
    onPointerDown: onCardDown,
    onPointerMove: onCardMove,
    onPointerUp: onCardUp,
    onPointerCancel: onCardUp,
  };
  // 이동 가능하다는 시각 힌트(6점) — 실제 드래그는 카드 전체가 받는다.
  const Grip = (
    <span
      aria-hidden="true"
      className="relative z-10 flex h-7 w-4 shrink-0 items-center justify-center text-white/40"
    >
      <GripVertical size={14} />
    </span>
  );

  // 가이드 화면(lifted)에서는 더 크고 눈에 띄는 카드, 그 외에는 컴팩트 알약.
  if (lifted) {
    return (
      <div className={outerClass} style={outerStyle}>
        <div
          ref={cardRef}
          {...cardDragProps}
          className={`pointer-events-auto relative w-full max-w-md touch-none overflow-hidden rounded-2xl px-5 py-4 shadow-2xl ring-1 ${
            done
              ? "bg-emerald-600 text-white ring-emerald-400/50"
              : "bg-zinc-900 text-white ring-white/10 dark:bg-zinc-800"
          }`}
        >
          {/* 진행률 바 */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-emerald-500/25"
            style={{ width: `${progress * 100}%`, transition: "width 250ms linear" }}
          />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {Grip}
              <Clock aria-hidden="true" size={18} className="shrink-0 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {done ? "휴식 완료" : "휴식 중"}
              </span>
            </div>
            {!done ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAdd(30)}
                  className="inline-flex h-8 items-center gap-0.5 rounded-full bg-white/10 px-2.5 text-xs font-bold transition hover:bg-white/20"
                >
                  <Plus aria-hidden="true" size={13} />
                  30초
                </button>
                <button
                  type="button"
                  aria-label="휴식 건너뛰기"
                  onClick={onSkip}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <X aria-hidden="true" size={15} />
                </button>
              </div>
            ) : null}
          </div>
          <div className="relative z-10 mt-1 text-center">
            <span className="font-mono text-4xl font-black tabular-nums">
              {done ? "0:00" : formatRest(remainingSec)}
            </span>
            <p className="mt-0.5 text-xs opacity-80">
              {done ? "다음 세트를 시작하세요 💪" : "충분히 쉬고 다음 세트로"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={outerClass} style={outerStyle}>
      <div
        ref={cardRef}
        {...cardDragProps}
        className={`pointer-events-auto relative flex touch-none items-center gap-2 overflow-hidden rounded-full px-3 py-2.5 shadow-lg ${
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
        {Grip}
        <Clock aria-hidden="true" size={16} className="relative z-10 shrink-0" />
        <span className="relative z-10 font-mono text-sm font-bold tabular-nums">
          {done ? "휴식 완료" : `휴식 ${formatRest(remainingSec)}`}
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

/** 빠른 선택 프리셋(설정 UI 재사용용 export). */
export { REST_PRESETS };

/** 드래그로 옮긴 휴식 위젯 위치(localStorage 키). */
const REST_POS_KEY = "rest:widgetPos";
/** 화면 밖으로 못 나가게 좌표를 [4, max-4] 로 보정. */
function clampPos(v: number, max: number): number {
  return Math.max(4, Math.min(Math.max(4, max), v));
}

function requestNotifyPermission() {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    /* noop */
  }
}

/** SW 가 제어 중인지(= 예약 알림을 맡길 수 있는지). dev/미설치면 false. */
function hasServiceWorkerController(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    !!navigator.serviceWorker.controller
  );
}

/** SW 에 메시지 전달(활성 SW 준비되면). 실패는 조용히 무시. */
function postToServiceWorker(msg: Record<string, unknown>) {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage(msg))
      .catch(() => {});
  } catch {
    /* noop */
  }
}

/** 휴식 종료시각을 SW 에 예약 — 만료 시 (앱이 백그라운드면) 시스템 알림. */
function scheduleRestNotification(endsAt: number) {
  postToServiceWorker({
    type: "schedule-rest",
    endsAt,
    title: "휴식 완료! 💪",
    body: "다음 세트를 시작하세요.",
  });
}

/** 예약된 휴식 알림 취소(건너뛰기·완료 시). */
function cancelRestNotification() {
  postToServiceWorker({ type: "cancel-rest" });
}

function notifyRestDone() {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    // 탭이 보이는 동안엔 화면 카드/비프로 충분 — 백그라운드일 때만 시스템 알림.
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      return;
    }
    const n = new Notification("휴식 완료! 💪", {
      body: "다음 세트를 시작하세요.",
      tag: "rest-timer",
      icon: "/icon-192.png",
      // @ts-expect-error vibrate 는 일부 브라우저에서만 지원되는 비표준 옵션
      vibrate: [180, 80, 180],
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* noop */
      }
      n.close();
    };
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
