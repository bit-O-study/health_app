"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  flushAppEvents,
  reportAppEvent,
} from "@/lib/observability/report-client";
import { isSlowLoad, memoryWarningMb } from "@/lib/observability/app-event";

/**
 * 로그인 상태에서만 붙는 관측 부품 — 로드맵 1.3.
 *
 * 하는 일 셋. 전부 조용하고, 화면에 아무것도 안 그린다.
 *  1) **모아 둔 사건 전송** — 로그인 전에 쌓인 것(로그인 실패)과 지난 부팅에서
 *     못 보낸 것(WebView 가 죽어서)이 여기서 나간다.
 *  2) **느린 화면** — 첫 로딩이 임계치를 넘으면 남긴다. 저사양 폰의 체감이
 *     실제로 얼마나 나쁜지 숫자로 보려는 것.
 *  3) **메모리 경고** — JS 힙이 한계에 가까워지면 남긴다. 힙이 차서 렌더러가
 *     죽는 게 팅김의 주된 경로라, 죽기 직전 신호를 잡아 두면 원인을 좁힐 수 있다.
 */

/** 힙 확인 주기. 잦으면 그 자체가 부담이고, 드물면 죽기 직전을 놓친다. */
const MEMORY_SAMPLE_MS = 30_000;

type ChromiumMemory = {
  usedJSHeapSize?: number;
  jsHeapSizeLimit?: number;
};

export function AppEventReporter() {
  const pathname = usePathname();

  // 부팅 직후 1회: 쌓여 있던 사건을 보내고, 이번 로딩이 느렸는지 남긴다.
  useEffect(() => {
    void flushAppEvents();
    try {
      const [nav] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      // 클라이언트 이동은 navigation 항목이 안 생긴다 — 전체 로딩(첫 진입)만 본다.
      if (nav && isSlowLoad(nav.duration)) {
        reportAppEvent("slow_route", {
          value: Math.round(nav.duration),
          // 메시지는 **초 단위로 뭉갠다** — 밀리초를 그대로 넣으면 매번 문자열이 달라
          // 대기열 합산(같은 사건 = 종류+화면+메시지)이 절대 안 걸린다. 정확한 값은
          // value 에 그대로 있다.
          message: `첫 로딩 ${Math.round(nav.duration / 1000)}초대`,
        });
      }
    } catch {
      /* 지원 안 하는 브라우저면 그냥 넘어간다. */
    }
  }, []);

  // 화면이 보이는 동안만 힙을 살핀다(백그라운드에서 재는 건 의미가 없다).
  useEffect(() => {
    const perf = performance as Performance & { memory?: ChromiumMemory };
    if (!perf.memory) return; // 크로미움 계열에만 있다
    function sample() {
      if (document.visibilityState !== "visible") return;
      const mb = memoryWarningMb(
        perf.memory?.usedJSHeapSize,
        perf.memory?.jsHeapSizeLimit,
      );
      if (mb !== null) {
        // 같은 이유로 100MB 단위로 뭉갠다(정확한 값은 value).
        reportAppEvent("memory_warning", {
          value: mb,
          message: `힙 ${Math.round(mb / 100) * 100}MB대`,
        });
      }
    }
    const timer = window.setInterval(sample, MEMORY_SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // 화면을 옮길 때마다 모아 둔 게 있으면 내보낸다(전송 실패분 재시도 포함).
  useEffect(() => {
    void flushAppEvents();
  }, [pathname]);

  return null;
}
