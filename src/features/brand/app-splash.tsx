"use client";

import { useEffect, useState } from "react";

import { BRAND_NAME, LogoMark } from "@/features/brand/logo";

/**
 * 앱 진입 스플래시 — 로고 배지가 '팝'하고 튀어나오며 헤일로가 번지고, 워드마크가
 * 살짝 미끄러져 들어온 뒤 전체가 페이드아웃(약 1.3s).
 * 루트 레이아웃에 한 번 마운트되므로 앱 내부 이동에선 다시 안 뜬다.
 * 모션은 전부 CSS(.app-splash*)가 처리(JS 없이도 사라짐) — prefers-reduced-motion 이면 즉시.
 */
export function AppSplash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1350);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div
      className="app-splash fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-blue-50 via-white to-cyan-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex">
          {/* 배지 뒤에서 번지는 헤일로 */}
          <span
            aria-hidden="true"
            className="app-splash-glow absolute inset-0 rounded-[16px] bg-indigo-500/50 blur-lg"
          />
          <span className="app-splash-mark relative">
            <LogoMark size={52} />
          </span>
        </span>
        <span className="app-splash-word text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-100">
          {BRAND_NAME}
        </span>
      </div>
    </div>
  );
}
