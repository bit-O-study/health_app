/** 식단 공용 타입·상수 — 서버/클라이언트 양쪽에서 import (server-only 아님). */

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

/** 캐러셀 인덱스를 [0, len) 범위로 순환(음수·초과도 감싼다). len<=0이면 0. */
export function wrapIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

export type FoodLog = {
  id: string;
  /**
   * React 렌더용 안정 key(선택). 낙관적 추가 항목은 인서트 성공 시 id 가 tempId→실제id 로
   * 바뀌는데, 목록 key 를 id 로 쓰면 그때 언마운트/재마운트가 일어난다. 안드로이드 WebView
   * 에선 이 재마운트가 밀려 같은 항목이 잠깐 2개로 보였다. rowKey 를 tempId 로 고정해 두면
   * id 가 바뀌어도 key 는 그대로라 재마운트가 없다. 서버에서 온 항목엔 없음(그땐 id 로 폴백).
   */
  rowKey?: string;
  meal: Meal;
  position: number;
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: string | null;
  category: string | null;
  photoUrl: string | null;
  /** 먹은 시간 "HH:MM"(24h). 없으면 null. */
  eatenAt: string | null;
};
