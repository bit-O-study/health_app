"use client";

import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";

import {
  LIGHT_MODE_KEY,
  parseLightModePreference,
  saveLightModePreference,
} from "@/features/performance/light-mode";

export function LightModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // SSR에서는 저장소를 읽을 수 없으므로 hydration 뒤 사용자 선택을 복원한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(
      parseLightModePreference(window.localStorage.getItem(LIGHT_MODE_KEY)) ===
        "light",
    );
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    saveLightModePreference(next ? "light" : "auto");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
          <Gauge aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            경량 모드
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            3D 효과를 줄여 배터리와 메모리 사용량을 낮춥니다. 저사양 기기에서는 자동 적용됩니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="경량 모드"
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-sky-600" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
