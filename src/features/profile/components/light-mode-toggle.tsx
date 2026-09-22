"use client";

import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";

import {
  LIGHT_MODE_KEY,
  parseLightModePreference,
  saveLightModePreference,
} from "@/features/performance/light-mode";

/** 개인설정 목록 한 줄 — 아이폰 설정처럼 아이콘 · 제목 · 스위치(설명 문장 없음, 2026-09-16 8단계). */
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
    <div className="app-row">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
        <Gauge aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-base text-zinc-900 dark:text-zinc-100">
        경량 모드
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="경량 모드"
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
