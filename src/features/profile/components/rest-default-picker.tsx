"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

import {
  DEFAULT_REST_SEC,
  REST_DEFAULT_KEY,
  REST_PRESETS,
  clampRest,
  formatRest,
} from "@/features/workout-timer/rest-logic";

/**
 * 개인설정: 기본 휴식 시간. 운동 화면의 휴식 타이머가 이 값을 기본으로 쓴다.
 * 휴식 타이머와 같은 localStorage 키(REST_DEFAULT_KEY)를 공유해 즉시 반영된다.
 */
export function RestDefaultPicker() {
  const [sec, setSec] = useState(DEFAULT_REST_SEC);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REST_DEFAULT_KEY);
      // 저장된 기본값 복원 — 외부(localStorage) 동기화라 의도된 setState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSec(clampRest(Number(raw)));
    } catch {
      /* noop */
    }
  }, []);

  function pick(next: number) {
    setSec(next);
    try {
      window.localStorage.setItem(REST_DEFAULT_KEY, String(next));
    } catch {
      /* noop */
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
          <Timer aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            기본 휴식 시간
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            세트 완료 시 시작되는 휴식 타이머의 기본값입니다. (운동 화면에서도 조절 가능)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REST_PRESETS.map((s) => {
              const active = s === sec;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => pick(s)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  }`}
                >
                  {formatRest(s)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
