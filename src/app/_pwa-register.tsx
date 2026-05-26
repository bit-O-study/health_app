"use client";

import { useEffect } from "react";

/**
 * service worker 등록 — 마운트되자마자 한 번만 시도.
 * 폴더명이`_` 로 시작해 라우트 대상에서 제외됨.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // dev 모드에서는 SW 캐시·업데이트 사이클이 HMR 과 충돌하기 쉬워 비활성화
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      // 등록 실패해도 앱 동작에는 영향 없음 — 콘솔에만 남김
      console.warn("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
