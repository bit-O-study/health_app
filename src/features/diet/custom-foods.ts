"use server";

/**
 * 자동 성장 음식 카탈로그(custom_foods) — 정적 카탈로그(food-catalog.ts)에 없는 음식을
 * AI 사진분석이 감지하면 여기에 쌓아 두고, 다음부터 검색으로도 잡히게 한다.
 * 전역 공유(로그인 사용자면 누구나 읽기/추가). 정규화 이름으로 중복 방지.
 */

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isKnownFood } from "@/features/diet/food-catalog";
import {
  normalizeFoodName,
  type FoodItem,
} from "@/features/diet/food-catalog-types";
import type { ScannedFood } from "@/features/diet/meal-scan-parse";

type CustomRow = {
  id: string;
  name: string;
  category: string | null;
  cuisine: string | null;
  amount: string | null;
  kcal: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
};

const num = (v: number | string | null): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function toFoodItem(r: CustomRow): FoodItem {
  return {
    id: `custom:${r.id}`,
    name: r.name,
    category: "기타",
    amount: r.amount || "1인분",
    kcal: num(r.kcal),
    protein: num(r.protein_g),
    carbs: num(r.carbs_g),
    fat: num(r.fat_g),
  };
}

/**
 * 커스텀 카탈로그 검색 — 이름 부분일치. 검색 UI가 정적 결과와 합쳐 쓴다.
 * 클라이언트에서 호출하는 서버 액션.
 */
export async function searchCustomFoodsAction(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("custom_foods")
    .select("id, name, category, cuisine, amount, kcal, protein_g, carbs_g, fat_g")
    .ilike("name", `%${q}%`)
    .order("hits", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as CustomRow[]).map(toFoodItem);
}

/**
 * AI 스캔 결과 중 정적 카탈로그에 없는 음식을 custom_foods 에 추가(best-effort).
 * 정규화 이름 유니크 제약으로 이미 있으면 무시(중복 저장 안 함).
 * 실패해도 스캔 흐름은 막지 않는다.
 */
export async function persistScannedFoods(items: ScannedFood[]): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    // 정적 카탈로그에 없고 이름이 있는 것만. 요청 내부 중복(정규화)도 제거.
    const seen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    for (const it of items) {
      const name = (it.name ?? "").trim();
      if (!name) continue;
      const norm = normalizeFoodName(name);
      if (!norm || seen.has(norm) || isKnownFood(name)) continue;
      seen.add(norm);
      rows.push({
        name,
        norm_name: norm,
        category: null,
        cuisine: null,
        amount: it.amount || "1인분",
        kcal: it.kcal ?? 0,
        protein_g: it.protein ?? 0,
        carbs_g: it.carbs ?? 0,
        fat_g: it.fat ?? 0,
        source: "ai",
        created_by: user.id,
      });
    }
    if (rows.length === 0) return;

    const supabase = await createSupabaseServerClient();
    // norm_name 충돌 시 무시(기존 값 유지) — 첫 등록자 값 보존.
    await supabase
      .from("custom_foods")
      .upsert(rows, { onConflict: "norm_name", ignoreDuplicates: true });
  } catch {
    // 자동 성장은 부가 기능 — 실패해도 조용히 넘어간다.
  }
}
