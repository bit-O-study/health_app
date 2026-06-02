"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/features/brand/logo";

/**
 * 앱 진입 스플래시 — 작은 로고가 잠깐 보였다가 빠르게 사라진다(약 0.85s).
 * 루트 레이아웃에 한 번 마운트되므로 앱 내부 이동에선 다시 안 뜬다.
 * 페이드아웃은 CSS(.app-splash)가 처리해 JS 없이도 사라지고, 끝나면 DOM 에서 제거.
 */
export function AppSplash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 950);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div
      className="app-splash fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-pink-50 via-white to-fuchsia-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-fuchsia-950"
      aria-hidden="true"
    >
      <div className="app-splash-inner">
        <Logo size={40} wordClassName="text-xl" />
      </div>
    </div>
  );
}
