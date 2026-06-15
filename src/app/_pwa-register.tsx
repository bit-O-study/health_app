"use client";

import { useEffect } from "react";

import { isChunkLoadError } from "@/lib/chunk-recovery";

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

  // 청크/동적 import 로드 실패 → 1회 자동 새로고침으로 자가복구.
  // 설치형 PWA 는 옛 빌드 세션을 백그라운드에 물고 있다가, 새 배포로 사라진
  // 청크를 불러오면 "this page couldn't load" 가 난다. 최신 빌드로 한 번
  // 새로고침하면 복구된다. (무한 루프 방지: 30초 내 1회만)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const recover = (msg: string) => {
      if (!isChunkLoadError(msg)) return;
      const KEY = "heltch.chunkReloadAt";
      try {
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last < 30_000) return; // 최근에 이미 새로고침함 → 루프 방지
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* sessionStorage 불가 시 그냥 진행 */
      }
      // 최신 청크를 받도록 캐시 무시 새로고침.
      window.location.reload();
    };

    const onError = (e: ErrorEvent) =>
      recover(e?.message || String((e as ErrorEvent).error ?? ""));
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e?.reason as { message?: string } | string | undefined;
      recover(typeof r === "string" ? r : (r?.message ?? ""));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
