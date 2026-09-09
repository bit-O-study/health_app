"use client";

import { useEffect, useState } from "react";
import type { FoodItem } from "@/features/diet/food-catalog-types";

/**
 * 검색은 서버 액션 큐를 쓰지 않는다. 이전 요청을 취소하고 현재 검색어의 결과만 노출한다.
 *
 * `enabled` 는 **출처를 통째로 잠그는** 스위치다(검색어 길이 조건인 `minLength` 와 별개).
 * 식약처 실시간 조회처럼 비싼 출처를 "앞의 출처가 아무것도 못 찾았을 때만" 부르는 데 쓴다.
 * 잠긴 동안에는 요청도 안 나가고 `rows` 는 빈 배열, `loading` 도 false 다 —
 * loading 을 true 로 두면 켜지지 않는 출처 때문에 스피너가 영원히 돈다.
 */
export function useFoodSearch(
  source: "local" | "custom" | "db",
  query: string,
  delay: number,
  minLength = 0,
  enabled = true,
) {
  const q = query.trim();
  const on = enabled && q.length >= minLength;
  const [result, setResult] = useState<{ query: string; rows: FoodItem[] } | null>(null);
  useEffect(() => {
    if (!on) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ source, q });
      void fetch("/api/foods/search?" + params, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("음식 검색 실패");
          return await response.json() as FoodItem[];
        })
        .then((rows) => {
          if (!controller.signal.aborted) setResult({ query: q, rows });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ query: q, rows: [] });
        });
    }, q ? delay : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, q, delay, on]);
  return {
    rows: on && result?.query === q ? result.rows : [],
    loading: on && result?.query !== q,
  };
}
