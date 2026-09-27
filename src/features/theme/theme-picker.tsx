"use client";

import { useEffect, useState } from "react";

import {
  isThemeChoice,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/features/theme/theme";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "dark", label: "다크" },
  { value: "light", label: "라이트" },
  { value: "system", label: "시스템" },
];

/**
 * 화면 밝기 — 아이폰 세그먼트 컨트롤 한 줄. 옵션마다 붙어 있던 설명 문구와 상태 안내 줄은
 * 뺐다(사용자: "왜 필요한 건데?" 2026-09-15). localStorage 에 저장하고, 시스템 모드면
 * OS 의 prefers-color-scheme 변경에 실시간 반응한다.
 */
export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("dark");

  function apply(next: ThemeChoice) {
    const root = document.documentElement;
    if (resolveTheme(next) === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }

  function select(next: ThemeChoice) {
    setChoice(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    apply(next);
  }

  // 초기 mount 시점에 localStorage 에서 현재 선택값을 끌어와 UI 와 동기화.
  // SSR 시점엔 localStorage 가 없어 client 에서 1회만 읽어야 하므로 이 setState 는 의도된 패턴.
  useEffect(() => {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(isThemeChoice(raw) ? raw : "dark");
  }, []);

  // 시스템 모드일 때 OS 다크 토글에 실시간 반응
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-base text-zinc-900 dark:text-zinc-100">화면</span>
      <div
        role="radiogroup"
        aria-label="화면 밝기"
        className="grid grid-cols-3 rounded-[10px] bg-zinc-200/70 p-0.5 dark:bg-white/[0.08]"
      >
        {OPTIONS.map((opt) => {
          const selected = choice === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => select(opt.value)}
              className={`min-w-14 rounded-[8px] px-3 py-1 text-sm transition ${
                selected
                  ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
