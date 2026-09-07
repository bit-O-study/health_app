"use server";

/**
 * 식약처 식품영양성분 DB 검색 — 정적 카탈로그·`custom_foods` 다음의 **세 번째 출처**.
 *
 * ## 이게 AI 한도를 아낀다
 * 편의점 도시락·가공식품처럼 제품마다 값이 다른 음식은 지금 사용자가 AI 사진분석으로
 * 찍는다. 우리가 돈을 내고 월 한도를 한 칸 먹는 일인데, 그런 제품은 이미 공표된 정답이
 * 있다. 공공데이터라 무료고 숫자도 AI 추정보다 정확하다.
 *
 * ## 찾은 건 `custom_foods` 에 쌓는다
 * 한 번 찾아온 음식은 다음부터 **우리 DB 에서 바로** 나온다 — 외부 API 를 다시 부르지
 * 않으니 일일 한도도 안 먹고, 공공 API 가 죽어 있어도 그 음식은 계속 검색된다.
 * (AI 스캔 결과를 쌓는 `persistScannedFoods` 와 같은 자리·같은 이유. 출처만 `food-db`.)
 *
 * ## 실패는 조용히 넘긴다
 * 이건 **보조 출처**다. 설정이 없거나 공공 API 가 느리거나 죽어도 정적·custom 결과는
 * 그대로 나와야 한다. 여기서 던지면 멀쩡한 검색까지 같이 죽는다.
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
import {
  MIN_FOOD_DB_QUERY,
  buildFoodDbUrl,
  parseFoodDb,
} from "@/features/diet/food-db";
import { consumeRate } from "@/lib/rate-limit/consume";

/** 공공 API 가 느릴 때 검색창이 붙잡히지 않게. 넘기면 그냥 결과 없음으로 둔다. */
const TIMEOUT_MS = 4_000;

/**
 * 이름으로 조회. 미설정·실패면 빈 배열(화면은 정적·custom 결과만 보여준다).
 *
 * 주소는 `FOOD_DB_URL` 템플릿에서 온다 — 살아 있는 공공 API 주소가 신청자마다 다르고
 * (표준데이터 `uddi`), 인터넷에 도는 옛 주소들은 이미 폐기됐다(`food-db.ts` 머리말).
 */
export async function searchFoodDbAction(query: string): Promise<FoodItem[]> {
  const template = process.env.FOOD_DB_URL;
  const apiKey = process.env.FOOD_DB_API_KEY;
  if (!template || !apiKey) return [];

  const q = (typeof query === "string" ? query : "").trim().slice(0, 60);
  if (q.length < MIN_FOOD_DB_QUERY) return [];

  try {
    const user = await getCurrentUser();
    if (!user) return [];
    // 키 하나를 모두가 나눠 쓰고 일일 한도가 있다 — 한 사람의 멈추지 않는 재시도가
    // 그날 남은 조회를 통째로 태우지 않게.
    if (!(await consumeRate("food-db:user", user.id))) return [];

    const res = await fetch(buildFoodDbUrl(template, apiKey, q), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 같은 검색어는 하루 종일 같은 답이다. 어차피 우리 DB 에 쌓이면 여기까지 다시
      // 오지 않으므로 캐시는 짧게만.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const parsed = parseFoodDb(await res.json().catch(() => null));
    if (!parsed.ok) {
      // 🔴 키 만료·쿼터 초과·서비스 폐기가 전부 여기로 온다(공공 API 는 오류도 200 이다).
      // 화면엔 안 띄우되(보조 출처다) 로그엔 남긴다 — 안 남기면 '검색 결과 없음'과
      // 구분이 안 돼 연동이 끊겨도 몇 달을 모른다.
      console.warn(`[food-db] ${parsed.reason}`);
      return [];
    }

    // 정적 카탈로그에 이미 있는 건 뺀다 — 화면에서 합칠 때 어차피 접히지만, 아래
    // 저장까지 가면 같은 음식이 두 출처로 갈라진다.
    const fresh = parsed.foods.filter((f) => !isKnownFood(f.name));
    if (fresh.length > 0) await persistFoodDbFoods(fresh, user.id);
    return fresh;
  } catch {
    return [];
  }
}

/**
 * 찾은 음식을 공용 카탈로그에 쌓는다(best-effort).
 * `norm_name` 유니크라 이미 있으면 무시 — **먼저 등록된 값을 덮지 않는다**
 * (사용자가 고쳐 놓은 값을 공공 데이터가 되돌리면 그건 고장으로 읽힌다).
 */
async function persistFoodDbFoods(foods: FoodItem[], userId: string): Promise<void> {
  try {
    const rows = foods.map((f) => ({
      name: f.name,
      norm_name: normalizeFoodName(f.name),
      category: null,
      cuisine: null,
      amount: f.amount,
      kcal: f.kcal,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
      source: "food-db",
      created_by: userId,
    }));
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("custom_foods")
      .upsert(rows, { onConflict: "norm_name", ignoreDuplicates: true });
  } catch {
    // 쌓기는 부가 기능 — 실패해도 이번 검색 결과는 그대로 나간다.
  }
}
