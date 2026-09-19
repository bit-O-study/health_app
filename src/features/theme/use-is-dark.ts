"use client";

import { useSyncExternalStore } from "react";

// 실제 적용된 테마는 <html class="dark"> 가 기준이다(theme-script / theme-picker 가 붙이고 뗀다).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** 현재 다크 테마 여부. 서버 렌더·하이드레이션 중에는 모르므로 null. */
export function useIsDark(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => null,
  );
}
