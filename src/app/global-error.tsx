"use client";

import { useEffect, useState } from "react";

import {
  AUTO_RELOAD_KEY,
  recordAppErrorDiagnostic,
  shouldRecoverAppError,
} from "@/lib/chunk-recovery";

/**
 * 루트 레이아웃까지 터지는 에러의 최종 바운더리 — error.tsx 와 동일하게 복구 가능한
 * 로드 오류만 자동 새로고침한다. global-error 는 root layout 을 대체하므로 자체
 * <html>/<body> 를 렌더한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoReloading, setAutoReloading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    recordAppErrorDiagnostic(error, window.location.pathname, now);
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
    } catch {
      /* noop */
    }
    if (shouldRecoverAppError(error, last, now)) {
      try {
        sessionStorage.setItem(AUTO_RELOAD_KEY, String(now));
      } catch {
        /* noop */
      }
      window.location.reload();
      return;
    }
    const id = window.setTimeout(() => setAutoReloading(false), 0);
    return () => window.clearTimeout(id);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#059669",
          color: "#fff",
        }}
      >
        {autoReloading ? (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                border: "4px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "heltch-spin 0.9s linear infinite",
              }}
            />
            <p style={{ fontSize: 14 }}>다시 불러오는 중…</p>
            <style>{"@keyframes heltch-spin{to{transform:rotate(360deg)}}"}</style>
          </>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 700 }}>잠깐 문제가 생겼어요.</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 4,
                borderRadius: 10,
                border: "none",
                background: "#fff",
                color: "#059669",
                fontWeight: 700,
                padding: "10px 18px",
                fontSize: 14,
              }}
            >
              다시 시도
            </button>
          </>
        )}
      </body>
    </html>
  );
}
