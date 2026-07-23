"use client";

import { useEffect, useState } from "react";

import {
  AUTO_RELOAD_KEY,
  shouldAutoReload,
} from "@/lib/chunk-recovery";

/**
 * 라우트 에러 바운더리 — 다른 앱 갔다 복귀했을 때 옛 청크/RSC 로드가 깨져 화면이
 * 에러로 뜨면, 사용자에게 "리로드 하세요"를 요구하지 않고 **스스로 새로고침**해 복구한다.
 *
 * 배경: 이 앱은 리모트 URL 을 WebView 로 띄우는 구조라, 백그라운드에 오래 있다 돌아오면
 * (새 배포로 사라진 청크·얼어붙은 RSC 등) React 가 렌더 에러를 던진다. React 는 이 에러를
 * 에러 바운더리에 가두므로 window 'error' 리스너(_pwa-register 의 자동복구)로는 안 잡힌다.
 * 그래서 여기서 직접 자가복구한다. 무한 루프 방지: 30초 내 1회만 자동 리로드, 그 뒤엔
 * '다시 시도' 버튼을 보여준다.
 */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoReloading, setAutoReloading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
    } catch {
      /* sessionStorage 불가 — 그냥 진행 */
    }
    if (shouldAutoReload(last, Date.now())) {
      try {
        sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
      } catch {
        /* noop */
      }
      // 최신 빌드/정상 상태로 조용히 복구.
      window.location.reload();
      return;
    }
    // 방금 리로드했는데 또 에러 → 진짜 문제. 자동 리로드 멈추고 버튼 표시.
    setAutoReloading(false);
  }, []);

  if (autoReloading) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/40 border-t-emerald-500" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          다시 불러오는 중…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
        잠깐 문제가 생겼어요.
      </p>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        네트워크가 불안정하거나 앱이 오래 멈춰 있었을 수 있어요. 아래 버튼을
        눌러 다시 시도해 주세요.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          새로고침
        </button>
      </div>
    </main>
  );
}
