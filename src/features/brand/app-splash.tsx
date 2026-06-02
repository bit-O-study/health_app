"use client";

import { useEffect, useState } from "react";

import { LogoMark } from "@/features/brand/logo";

/**
 * 앱 진입 스플래시 — 앱을 처음 열거나 새로고침/PWA 실행 시 잠깐 보였다가 사라진다.
 * 루트 레이아웃에 한 번 마운트되므로 앱 내부 이동(클라이언트 네비)에서는 다시 안 뜬다.
 * 페이드아웃은 CSS 애니메이션(.app-splash)이 처리해 JS 없이도 사라지고,
 * 끝나면 JS 가 DOM 에서 제거한다.
 */
export function AppSplash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div
      className="app-splash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950"
      aria-hidden="true"
    >
      {/* 은은한 배경 글로우 */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />

      <div className="app-splash-inner relative flex flex-col items-center gap-5">
        <div className="app-splash-float">
          <LogoMark size={92} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            HELTCH
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            오늘 뭐 해야 하지? 루틴이 알려줍니다.
          </p>
        </div>
      </div>

      {/* 로딩 점 3개 */}
      <div className="relative flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
