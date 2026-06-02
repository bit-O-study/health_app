"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * 본운동 순서를 드래그로 바꾼 뒤 "운동 시작"을 누르면 가이드 큐도 같은 순서여야 한다.
 *
 * 문제: 가이드 큐(queueItems)는 서버 렌더 시점의 plan 순서로 계산돼 WorkoutSessionTimer
 * 에 prop 으로 내려간다. 반면 드래그 정렬은 TodayPlanList 의 로컬 state 만 바꾸고
 * (perf 위해 revalidate 생략) 서버를 다시 그리지 않으므로, timer 의 queueItems 는 stale
 * 한 옛 순서로 남는다 → 시작 시 바뀌기 전 순서로 보였다.
 *
 * 해결: 두 형제 컴포넌트가 공유하는 가벼운 클라이언트 컨텍스트. TodayPlanList 가 정렬할
 * 때마다 본운동 row id 순서를 여기에 올리고, WorkoutSessionTimer 가 이를 읽어 큐의
 * main 항목을 재정렬한다. 서버 왕복 없이 즉시 반영된다.
 */
type Ctx = {
  /** 본운동 row id 의 현재 순서. null = 아직 정렬 안 함(서버 기본 순서 사용). */
  mainOrder: string[] | null;
  setMainOrder: (ids: string[]) => void;
};

const TodayOrderCtx = createContext<Ctx | null>(null);

export function TodayOrderScope({ children }: { children: ReactNode }) {
  const [mainOrder, setMainOrder] = useState<string[] | null>(null);
  return (
    <TodayOrderCtx.Provider value={{ mainOrder, setMainOrder }}>
      {children}
    </TodayOrderCtx.Provider>
  );
}

/** Provider 밖에서도 안전하게 쓰도록 null 허용(없으면 기본 순서 유지). */
export function useTodayOrder(): Ctx | null {
  return useContext(TodayOrderCtx);
}