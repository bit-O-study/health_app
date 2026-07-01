"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * 완료/휴식 토글이 짧은 시간에 여러 번 일어나도 서버 재렌더(router.refresh)를 한 번으로
 * 합쳐, 전체 페이지가 토글마다 다시 그려지며 느려지는 것을 막는다.
 *
 * 행의 색·뱃지는 로컬 state 로 이미 즉시 반영되므로, 상단 '완료 kcal' 카드 같은 서버
 * 계산값만 마지막 토글 뒤 한 번 새로고침하면 된다.
 */
export function useCoalescedRefresh(delay = 400): () => void {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      router.refresh();
    }, delay);
  }, [router, delay]);
}
