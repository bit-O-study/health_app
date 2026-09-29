"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

/**
 * 달리는 동안 화면이 꺼지지 않게(2026-09-28 런닝 2단계). 웹으로 폴백되면 화면이 꺼지는 순간
 * 위치 추적도 멈춰서, 앱을 다시 켰을 때 그 구간이 비었다.
 * 탭을 떠났다 돌아오면 브라우저가 잠금을 풀어 버리므로 다시 건다. 지원 안 하면 조용히 넘어간다.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null;
    let released = false;
    const acquire = () => {
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          if (released) void l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
