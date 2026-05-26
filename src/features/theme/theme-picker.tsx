"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  isThemeChoice,
  resolveTheme,
  systemPrefersDark,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/features/theme/theme";

const OPTIONS: {
  value: ThemeChoice;
  label: string;
  Icon: typeof Moon;
  hint: string;
}[] = [
  { value: "dark", label: "다크", Icon: Moon, hint: "어두운 배경 — 권장" },
  { value: "light", label: "라이트", Icon: Sun, hint: "밝은 배경" },
  { value: "system", label: "시스템", Icon: Monitor, hint: "OS 설정 따라가기" },
];

/**
 * 테마 선택 UI. localStorage 에 사용자의 선택을 저장하고, 시스템 모드일 때는
 * OS 의 prefers-color-scheme 변경에 실시간 반응한다.
 */
export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("dark");
  const [mounted, setMounted] = useState(false);

  function apply(next: ThemeChoice) {
    const root = document.documentElement;
    const effective = resolveTheme(next);
    if (effective === "dark") root.classList.add("dark");
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
    setMounted(true);
  }, []);

  // 시스템 모드일 때 OS 다크 토글에 실시간 반응
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const effective = mounted ? resolveTheme(choice) : "dark";
  const systemNow = mounted ? (systemPrefersDark() ? "다크" : "라이트") : "—";

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
        화면 밝기
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        현재 적용: <strong>{effective === "dark" ? "다크" : "라이트"}</strong>
        {choice === "system" ? ` · 시스템 = ${systemNow}` : ""}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.Icon;
          const selected = choice === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-semibold transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 ring-1 ring-emerald-300 dark:ring-emerald-700"
                  : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <Icon aria-hidden="true" size={20} />
              <span>{opt.label}</span>
              <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
