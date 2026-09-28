import type { RecentFood } from "./quick-add";
import { MEALS } from "./meal";

/** Validate both server requests and the previous browser-only favorites. */
export function parseFavorite(value: unknown): RecentFood | null {
  if (!value || typeof value !== "object") return null;
  const f = value as Record<string, unknown>;
  if (typeof f.name !== "string" || !f.name.trim() || f.name.length > 60 ||
      typeof f.kcal !== "number" || !Number.isFinite(f.kcal) || f.kcal < 0 || f.kcal > 9000) return null;
  for (const key of ["protein", "carbs", "fat"]) {
    const n = f[key];
    if (n !== null && (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 2000)) return null;
  }
  if (f.amount !== null && (typeof f.amount !== "string" || f.amount.length > 40)) return null;
  if (f.category !== null && (typeof f.category !== "string" || f.category.length > 20)) return null;
  if (!MEALS.includes(f.meal as RecentFood["meal"])) return null;
  return { name: f.name.trim(), kcal: f.kcal, protein: f.protein as number | null,
    carbs: f.carbs as number | null, fat: f.fat as number | null,
    amount: f.amount as string | null, category: f.category as string | null,
    meal: f.meal as RecentFood["meal"], date: typeof f.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : "",
    eatenAt: null };
}
export const favoriteKey = (food: Pick<RecentFood, "name" | "amount">) => JSON.stringify([food.name.trim(), food.amount?.trim() ?? ""]);
