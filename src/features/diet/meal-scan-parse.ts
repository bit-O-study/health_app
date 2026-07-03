/** AI 식단 사진 인식 결과 파서 — 순수 로직(server-only 없음 → 테스트 가능). */

import { extractJsonObject } from "@/features/coach/parse";
import { MEALS, type Meal } from "@/features/diet/meal";

export type ScannedFood = {
  name: string;
  amount: string | null;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type MealScan = { meal: Meal | null; items: ScannedFood[] };

/** 0 이상 유한수만, max 로 클램프하고 소수 1자리 반올림. 그 외엔 null. */
function numOrNull(v: unknown, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(max, Math.round(n * 10) / 10);
}

function pickAmount(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, 40) : null;
}

/**
 * { meal, items:[{name, amount, kcal, protein, carbs, fat}] } 형태로 정규화.
 * `items` 대신 `foods`, 매크로에 `_g` 접미사가 와도 관대하게 받는다.
 */
export function parseMealScan(text: string): MealScan {
  const raw = extractJsonObject(text);
  if (!raw || typeof raw !== "object") return { meal: null, items: [] };
  const o = raw as Record<string, unknown>;

  const mealRaw = typeof o.meal === "string" ? o.meal.trim() : "";
  const meal = (MEALS as readonly string[]).includes(mealRaw)
    ? (mealRaw as Meal)
    : null;

  const arr = Array.isArray(o.items)
    ? o.items
    : Array.isArray(o.foods)
      ? o.foods
      : [];

  const items: ScannedFood[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const f = it as Record<string, unknown>;
    const name = typeof f.name === "string" ? f.name.trim().slice(0, 60) : "";
    if (!name) continue;
    items.push({
      name,
      amount: pickAmount(f.amount),
      kcal: numOrNull(f.kcal, 9000) ?? 0,
      protein: numOrNull(f.protein ?? f.protein_g, 2000),
      carbs: numOrNull(f.carbs ?? f.carbs_g, 2000),
      fat: numOrNull(f.fat ?? f.fat_g, 2000),
    });
  }
  return { meal, items };
}