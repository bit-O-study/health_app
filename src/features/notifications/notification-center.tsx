"use client";

/**
 * 앱 내 알림 센터 — 헤더 벨에서 알림을 보고 '예/아니오'로 응답한다.
 * 현재는 '운동 종료 확인' 프롬프트 한 건을 다룬다(무활동 30분 감지 시 타이머가 띄움).
 * 전역(layout)에 Provider 를 두고, 헤더의 NotificationBell 이 소비한다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bell } from "lucide-react";

export type WorkoutEndPrompt = {
  id: string;
  title: string;
  body: string;
  /** '예' — 완료 외 모든 운동 휴식 처리 + 타이머 종료 */
  onYes: () => void;
  /** '아니오' — 닫고 다시 무활동 감지 */
  onNo: () => void;
};

type Ctx = {
  prompt: WorkoutEndPrompt | null;
  showPrompt: (p: WorkoutEndPrompt) => void;
  clearPrompt: () => void;
};

const NotificationCtx = createContext<Ctx | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<WorkoutEndPrompt | null>(null);
  const showPrompt = useCallback((p: WorkoutEndPrompt) => setPrompt(p), []);
  const clearPrompt = useCallback(() => setPrompt(null), []);
  return (
    <NotificationCtx.Provider value={{ prompt, showPrompt, clearPrompt }}>
      {children}
    </NotificationCtx.Provider>
  );
}

export function useNotificationCenter(): Ctx {
  const c = useContext(NotificationCtx);
  if (!c) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }
  return c;
}

/** 헤더 알림 벨 — 대기 중 알림이 있으면 빨간 점, 클릭 시 패널에서 예/아니오. */
export function NotificationBell() {
  const { prompt, clearPrompt } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 새 알림이 오면 자동으로 패널을 연다(놓치지 않게).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prompt) setOpen(true);
  }, [prompt]);

  // 바깥 클릭 시 닫기.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const has = prompt !== null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={has ? "알림 있음" : "알림"}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <Bell aria-hidden="true" size={18} />
        {has ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {prompt ? (
            <div className="p-3">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {prompt.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {prompt.body}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    prompt.onNo();
                    setOpen(false);
                  }}
                  className="h-9 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  아니오
                </button>
                <button
                  type="button"
                  onClick={() => {
                    prompt.onYes();
                    setOpen(false);
                  }}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                >
                  예
                </button>
              </div>
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              새 알림이 없어요
            </p>
          )}
          {prompt ? (
            <button
              type="button"
              onClick={() => {
                clearPrompt();
                setOpen(false);
              }}
              className="block w-full border-t border-zinc-100 py-2 text-[11px] font-semibold text-zinc-400 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              알림 지우기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
