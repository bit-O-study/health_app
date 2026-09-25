/**
 * 식단 **빠른 기록**(2026-09-25 리뉴얼) — 검색 없이 한 번에 담기.
 *
 * 사람이 실제로 먹는 건 매일 거의 같다(닭가슴살·현미밥·사과…). 그런데 예전 화면은
 * 그 한 줄을 남기려고 매번 `추가 → 검색 → 타이핑 → 결과 고르기 → 양 → 담기` 를 시켰다.
 * 기록이 귀찮아서 안 쓰게 되는 가장 큰 원인이 이거다.
 *
 * 그래서 **최근 먹은 것에서 자주 먹는 것을 뽑아** 칩 한 번으로 담고,
 * 어제 그 끼니를 통째로 복사할 수 있게 한다. 여기는 그 순수 계산만 둔다
 * (서버 조회는 `data-access.ts`, 쓰기는 `diet-actions.ts`).
 */

import type { FoodInput } from "@/features/diet/diet-actions";
import { MEAL_LABEL, type Meal } from "@/features/diet/meal";

/** 최근 기록 한 줄 — 빠른 기록 후보를 뽑는 입력. */
export type RecentFood = {
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: string | null;
  category: string | null;
  meal: Meal;
  /** 먹은 날짜(YYYY-MM-DD). */
  date: string;
  /** 먹은 시간 "HH:MM". 없으면 null. */
  eatenAt: string | null;
};

/** 칩 하나 = 같은 음식(이름+양)을 하나로 접은 것. */
export type QuickFood = RecentFood & {
  /** 목록 key — 이름+양. */
  key: string;
  /** 최근 기간 안에서 몇 번 먹었나. */
  count: number;
};

/** 후보를 몇 개까지 보여줄지 기본값 — 한 줄 반 정도가 한계다. */
export const QUICK_FOOD_LIMIT = 8;

/** 자주 먹는 것을 찾을 때 거슬러 보는 날 수. */
export const QUICK_FOOD_DAYS = 14;

/** 같은 음식으로 볼 기준 — 이름과 양이 같으면 같은 것(=한 번에 담는 단위가 같다). */
export function quickKey(f: { name: string; amount: string | null }): string {
  return `${f.name.trim()}|${f.amount?.trim() ?? ""}`;
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수 — 문자열 비교만으로 충분한 단순 계산. */
function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.round((b - a) / 86_400_000);
}

/**
 * 빠른 기록 후보 정렬.
 *
 * 점수는 셋을 섞는다 — **얼마나 자주**(count), **지금 끼니에 맞는지**(아침에 아침 먹던 것),
 * **최근인지**(며칠 전). 가중치는 "자주 먹는 게 우선이되, 끼니가 맞으면 한두 번 차이는
 * 뒤집는다" 는 감각으로 잡았다. 동점이면 최근 것, 그래도 같으면 이름순(결과가 흔들리지
 * 않게 — 화면이 새로고침마다 바뀌면 손가락이 위치를 못 외운다).
 */
export function rankQuickFoods(
  recent: RecentFood[],
  opts: { meal?: Meal; today: string; limit?: number } = { today: "" },
): QuickFood[] {
  const limit = opts.limit ?? QUICK_FOOD_LIMIT;
  const byKey = new Map<string, QuickFood>();

  for (const r of recent) {
    if (!r.name.trim()) continue;
    const key = quickKey(r);
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, { ...r, key, count: 1 });
      continue;
    }
    seen.count += 1;
    // 영양값은 **가장 최근 것**을 쓴다(같은 이름이라도 사용자가 고쳐 담았을 수 있다).
    if (r.date > seen.date) {
      byKey.set(key, { ...r, key, count: seen.count });
    }
  }

  const score = (f: QuickFood): number => {
    const ago = opts.today ? daysBetween(f.date, opts.today) : 99;
    const recency = ago <= 1 ? 2 : ago <= 3 ? 1 : 0;
    const mealFit = opts.meal && f.meal === opts.meal ? 3 : 0;
    return f.count * 2 + mealFit + recency;
  };

  return [...byKey.values()]
    .sort((a, b) => {
      const d = score(b) - score(a);
      if (d !== 0) return d;
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, limit);
}

/** 칩 → 담을 입력. 끼니와 시간은 화면이 정한다(칩은 '무엇을'만 안다). */
export function quickFoodInput(
  f: QuickFood,
  meal: Meal,
  eatenAt?: string | null,
): FoodInput {
  return {
    meal,
    name: f.name,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    amount: f.amount,
    category: f.category,
    eatenAt: eatenAt ?? null,
  };
}

/**
 * 지금 시각에 어울리는 끼니 — 빠른 기록의 기본 대상.
 *
 * 경계는 "밥 때" 기준으로 넉넉히 잡는다: ~10:30 아침, ~15:00 점심, ~21:00 저녁,
 * 그 밖(밤·새벽)은 간식. 틀려도 화면에서 한 번에 바꿀 수 있으니 완벽할 필요는 없다.
 */
export function mealByHour(hhmm: string): Meal {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "snack";
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (mins >= 4 * 60 && mins < 10 * 60 + 30) return "breakfast";
  if (mins >= 10 * 60 + 30 && mins < 15 * 60) return "lunch";
  if (mins >= 15 * 60 && mins < 21 * 60) return "dinner";
  return "snack";
}

/** "어제 아침 그대로 담기" 같은 버튼 문구. */
export function copyMealLabel(meal: Meal, fromYmd: string, today: string): string {
  const ago = daysBetween(fromYmd, today);
  const when = ago === 0 ? "오늘" : ago === 1 ? "어제" : ago === 2 ? "그저께" : `${ago}일 전`;
  return `${when} ${MEAL_LABEL[meal]} 그대로 담기`;
}

/** 복사 대상 요약 — "닭가슴살 외 2개 · 620kcal". 비어 있으면 null. */
export function copyMealSummary(items: RecentFood[]): string | null {
  if (items.length === 0) return null;
  const kcal = Math.round(items.reduce((s, i) => s + i.kcal, 0));
  const head = items[0].name;
  const rest = items.length - 1;
  return `${rest > 0 ? `${head} 외 ${rest}개` : head} · ${kcal}kcal`;
}

/**
 * 그 끼니를 **마지막으로 먹은 날**과 그날 담았던 것들.
 *
 * "어제 아침 그대로" 라고 말하고 싶지만 어제 아침을 안 먹었을 수도 있다.
 * 최근 기록에서 그 끼니가 있는 가장 최근 날을 찾아 그대로 쓴다(없으면 null).
 */
export function lastMealOf(
  recent: RecentFood[],
  meal: Meal,
): { date: string; items: RecentFood[] } | null {
  let date = "";
  for (const r of recent) {
    if (r.meal === meal && r.date > date) date = r.date;
  }
  if (!date) return null;
  return { date, items: recent.filter((r) => r.meal === meal && r.date === date) };
}

/**
 * 서울 기준 지금 "HH:MM"(24h).
 *
 * 🔴 식단 화면 여러 곳(빠른 기록의 기본 끼니·추가 대화상자의 먹은 시간)이 같은 시계를
 * 봐야 한다 — 각자 구현하면 경계에서 한쪽만 다른 끼니를 고른다.
 */
export function nowSeoulHHMM(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
