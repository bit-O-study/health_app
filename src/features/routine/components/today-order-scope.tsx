"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * 순서를 드래그로 바꾼 뒤 "운동 시작"을 누르면 가이드 큐도 같은 순서여야 한다.
 *
 * 문제: 가이드 큐(queueItems)는 서버 렌더 시점 순서로 계산돼 WorkoutSessionTimer
 * 에 prop 으로 내려간다. 반면 드래그 정렬은 각 리스트(본운동=TodayPlanList,
 * 워밍업·마무리=TodayConditioningList)의 로컬 state + DB 저장만 하고 서버를 다시
 * 그리지 않아, timer 의 queueItems 는 옛 순서로 남는다.
 *
 * 해결: 세 리스트가 공유하는 클라이언트 컨텍스트. 각 리스트가 정렬할 때마다 그
 * 종류(main/warmup/cooldown)의 row id 순서를 올리고, WorkoutSessionTimer 가 이를
 * 읽어 큐의 해당 종류 항목들을 재정렬한다. 서버 왕복 없이 즉시 반영된다.
 */
export type OrderKind = "main" | "warmup" | "cooldown";

type OrderMap = Record<OrderKind, string[] | null>;

type Ctx = {
  /** 종류별 row id 의 현재 순서. null = 아직 정렬 안 함(서버 기본 순서 사용). */
  order: OrderMap;
  setOrder: (kind: OrderKind, ids: string[]) => void;
};

const TodayOrderCtx = createContext<Ctx | null>(null);

export function TodayOrderScope({ children }: { children: ReactNode }) {
  const [order, setOrderState] = useState<OrderMap>({
    main: null,
    warmup: null,
    cooldown: null,
  });
  const setOrder = (kind: OrderKind, ids: string[]) =>
    setOrderState((prev) => ({ ...prev, [kind]: ids }));
  return (
    <TodayOrderCtx.Provider value={{ order, setOrder }}>
      {children}
    </TodayOrderCtx.Provider>
  );
}

/** Provider 밖에서도 안전하게 쓰도록 null 허용(없으면 기본 순서 유지). */
export function useTodayOrder(): Ctx | null {
  return useContext(TodayOrderCtx);
}
