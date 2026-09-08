"use client";

import { useEffect, useState } from "react";
import type { FoodItem } from "@/features/diet/food-catalog-types";

/** 검색은 서버 액션 큐를 쓰지 않는다. 이전 요청을 취소하고 현재 검색어의 결과만 노출한다. */
export function useFoodSearch(source: "local" | "custom" | "db", query: string, delay: number, minLength = 0) {
  const q = query.trim();
  const [result, setResult] = useState<{ query: string; rows: FoodItem[] } | null>(null);
  useEffect(() => {
    if (q.length < minLength) return;
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
  }, [source, q, delay, minLength]);
  const enabled = q.length >= minLength;
  return {
    rows: enabled && result?.query === q ? result.rows : [],
    loading: enabled && result?.query !== q,
  };
}
