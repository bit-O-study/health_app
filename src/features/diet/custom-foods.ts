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
 *
 * ## 왜 테이블 조회가 아니라 RPC 인가
 * 식약처 카탈로그를 적재하면서 이 표가 수십만 행이 됐다. 예전처럼 `hits` 만으로 줄
 * 세우면 새로 들어온 행은 전부 hits=1 이라 **상위 결과가 사실상 무작위**다 —
 * "우유" 를 치면 `빙수_팥_우유얼음` 이 먼저 떴다. 순위 규칙은 SQL 한 문장으로
 * 표현해야 정확하고 빨라서(정렬 기준 4개) `search_custom_foods` 로 옮겼다.
 *
 * 순위: ① 이름이 검색어와 같음 ② 검색어로 시작 ③ **이름이 짧은 것**(일반명이 짧다:
 * '우유' vs '빙수_팥_우유얼음') ④ hits ⑤ 이름 사전순(같은 조건에서 순서가 흔들리지
 * 않게).
 *
 * 🔴 `%`·`_` 는 함수 안에서 이스케이프한다. 예전에는 검색어를 그대로 `ilike` 에
 * 끼워 넣어서, 사용자가 `%` 한 글자만 쳐도 **전체 표가 걸렸다**.
 */
export async function searchCustomFoodsAction(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_custom_foods", {
    p_query: q,
    p_limit: 50,
  });
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
