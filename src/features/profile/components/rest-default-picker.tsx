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

  // 목록 한 줄(아이콘 · 제목) 아래 시간 칩 — 설명 문장은 뺐다(2026-09-16 8단계).
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
          <Timer aria-hidden="true" size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-base text-zinc-900 dark:text-zinc-100">
          기본 휴식 시간
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
        {REST_PRESETS.map((s) => {
          const active = s === sec;
          return (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              aria-pressed={active}
              className={`h-7 rounded-full px-2.5 text-xs font-semibold tabular-nums transition ${
                active
                  ? "bg-brand text-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
              }`}
            >
              {formatRest(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
