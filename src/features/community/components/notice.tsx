"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 짧은 안내 한 줄 — 브라우저 알림창(alert) 대신(커뮤니티 2단계, 2026-09-30).
 *
 * alert 은 안드로이드 WebView 에서 앱과 다른 모양의 창이 뜨고, 화면을 멈춘다.
 * 화면 아래에 3.5초 떠 있다 사라지는 한 줄로 알린다. 화면 읽기 프로그램에는 바로 읽힌다.
 */
export function useNotice(): [string | null, (text: string) => void] {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const id = window.setTimeout(() => setText(null), 3500);
    return () => window.clearTimeout(id);
  }, [text]);
  const show = useCallback((t: string) => setText(t), []);
  return [text, show];
}

export function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      role="alert"
      data-testid="community-notice"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4"
    >
      <p className="pointer-events-auto max-w-sm rounded-full bg-zinc-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg dark:bg-zinc-100/95 dark:text-zinc-900">
        {text}
      </p>
    </div>
  );
}
