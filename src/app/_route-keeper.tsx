"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isNativeApp } from "@/lib/platform/is-native-app";
import {
  decideRendererRecovery,
  parseRendererRecovery,
} from "@/lib/platform/renderer-recovery";
import type { SavedRoute } from "@/lib/platform/route-restore";

/**
 * 네이티브 앱(APK)에서 "잠깐 다른 앱 갔다 오면 앱이 초기화되는" 문제 완화.
 *
 * 이 앱은 리모트 URL 을 WebView 로 띄우는 구조라, OS(특히 국내폰 공격적 메모리 관리)가
 * 백그라운드 WebView 를 죽이면 복귀 시 base URL(→ /routine)부터 새로 로드돼 '보던 화면'을
 * 잃는다. 그래서 화면이 바뀔 때·백그라운드로 갈 때 현재 경로를 localStorage 에 저장해 두고,
 * 부팅 직후 홈(/ 또는 /routine)으로 튕겼는데 최근(30분 내)에 다른 화면을 보고 있었다면
 * 그 화면으로 복원(replace)한다.
 *
 * - 웹 브라우저에선 동작 안 함(isNativeApp). 북마크/딥링크로 홈을 여는 웹 사용자에게 방해 X.
 * - 30분 창: '방금 쓰다 튕긴' 경우만 이어보기. 하루 뒤 새로 열면 그냥 홈.
 * - renderer 종료가 5분 안에 반복되면 문제 경로를 버리고 /home 으로 복구.
 * - 폴더명이 `_` 로 시작해 라우트 대상에서 제외됨.
 */
const KEY = "heltch.lastRoute";

type RecoveryBridge = { consumeRendererRecovery?: () => string | null };

function currentRoute(): string {
  return window.location.pathname + window.location.search;
}

function save(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {
    /* noop */
  }
}

function readSaved(): SavedRoute | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedRoute>;
    if (typeof v.path === "string" && typeof v.ts === "number") {
      return { path: v.path, ts: v.ts };
    }
  } catch {
    /* noop */
  }
  return null;
}

function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

function consumeNativeRecovery(): string | null {
  try {
    return (window as unknown as { HelssuNative?: RecoveryBridge })
      .HelssuNative?.consumeRendererRecovery?.() ?? null;
  } catch {
    return null;
  }
}

export function RouteKeeper() {
  const pathname = usePathname();
  const router = useRouter();
  const restored = useRef(false);
  const skipSave = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 부팅 직후 1회: renderer 반복 종료면 안전 홈, 아니면 최근 화면을 한 번 복원.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (!isNativeApp()) return;

    const now = Date.now();
    const event = parseRendererRecovery(consumeNativeRecovery(), now);
    const decision = decideRendererRecovery(event, readSaved(), currentRoute(), now);
    if (decision.clearSavedRoute) clearSaved();
    if (decision.notice) {
      const recoveryNotice = decision.notice;
      queueMicrotask(() => setNotice(recoveryNotice));
    }
    if (decision.targetPath) {
      skipSave.current = true;
      router.replace(decision.targetPath);
    }
  }, [router]);

  // 화면 이동 때마다 현재 위치 저장.
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    save(currentRoute());
  }, [pathname]);

  // 백그라운드로 갈 때도 저장(WebView 가 그 상태로 죽을 수 있으므로 마지막에 확실히 기록).
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") save(currentRoute());
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return notice ? (
    <div
      role="status"
      className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 mx-auto max-w-md rounded-2xl bg-zinc-900/95 px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
    >
      {notice}
    </div>
  ) : null;
}
