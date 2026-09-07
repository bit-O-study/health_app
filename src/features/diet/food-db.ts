/**
 * 식약처 식품영양성분 DB 연동 — 순수 로직. 실제 호출은 `food-db-actions.ts`.
 *
 * ## 왜 붙이나
 * 지금 식단 검색은 ① 정적 카탈로그(한식+세계 600여 개) ② AI 사진분석이 쌓은
 * `custom_foods` 둘뿐이다. 둘 다 없는 음식 — 특히 **편의점 도시락·가공식품처럼 제품마다
 * 값이 다른 것** — 은 사용자가 AI 사진 분석으로 찍는다. 그건 **우리가 돈을 내는 유일한
 * 기능**이고 월 한도(`ai_usage`)를 한 칸 먹는데, 그런 제품은 **이미 공표된 정답이 있다.**
 * 공공데이터라 무료고, AI 추정보다 숫자가 정확하다.
 *
 * ## 🔴 주소를 코드에 박지 않는다 — 서비스가 실제로 갈아엎어졌다
 * 2026-09-07 확인: 인터넷에 흔히 도는 식품안전나라 영양성분 서비스
 * (`I2790`·`I0750`)는 **둘 다 `ERROR-310 해당하는 서비스를 찾을 수 없습니다`** 를
 * 돌려준다. 예전 data.go.kr 경로(`FoodNtrIrdntInfoService1`)도 `NO_OPENAPI_SERVICE_ERROR`
 * (폐기)다. 현재 살아 있는 것은 **전국통합식품영양성분정보 표준데이터**(data.go.kr)인데,
 * 표준데이터 API 주소에는 신청자마다 다른 `uddi` 가 들어가서 **활용신청 전에는 주소를
 * 알 수 없다.**
 *
 * 그래서 주소를 **환경변수 템플릿**(`FOOD_DB_URL`)으로 받는다. 사용자가 활용신청 화면에서
 * 받은 주소를 그대로 붙여 넣으면 코드를 안 고치고 붙는다. 지금 죽어 있는 주소를 기본값으로
 * 박아 두면 "붙였는데 아무것도 안 나온다" 가 되고, 그건 안 붙인 것보다 나쁘다.
 *
 * ## 응답 모양도 두 가지를 다 받는다
 * 두 포털이 형식이 다르다. 어느 쪽 주소를 넣든 동작하게 둘 다 읽는다.
 * - **식품안전나라**: `{ "I0750": { RESULT: {CODE}, row: [{DESC_KOR, SERVING_WT, NUTR_CONT1..4}] } }`
 * - **data.go.kr 표준데이터**: `{ data: [{ "식품명", "영양성분함량기준량", "에너지(kcal)", … }] }`
 */

import type { FoodItem } from "@/features/diet/food-catalog-types";
import { normalizeFoodName } from "@/features/diet/food-catalog-types";

/** 한 번에 받아올 행 수. 같은 이름이 제조사별로 여러 줄 오므로 넉넉히 받고 접는다. */
export const FOOD_DB_ROWS = 30;

/**
 * 이보다 짧은 검색어로는 부르지 않는다 — 한 글자로는 수천 건이 걸린다.
 * 화면(디바운스 판단)과 서버(방어) 양쪽이 같은 값을 봐야 해서 순수 모듈에 둔다.
 * ⚠ `"use server"` 파일에서는 상수를 export 할 수 없다(async 함수만 허용).
 */
export const MIN_FOOD_DB_QUERY = 2;

/**
 * 주소 템플릿 → 실제 URL. `{key}`·`{query}`·`{rows}` 를 치환한다.
 *
 * 🔴 치환값은 **URL 인코딩**한다. 사용자가 치는 검색어라 "닭가슴살 100g" 처럼 공백이,
 * 표준데이터 쿼리에는 `cond[식품명::LIKE]` 처럼 대괄호가 실제로 들어온다.
 *
 * 템플릿에 `{query}` 가 없으면 그대로 둔다 — 검색어를 안 받는 주소도 있을 수 있고,
 * 여기서 임의로 파라미터를 덧붙이면 남의 API 규격을 우리가 지어내는 셈이다.
 */
export function buildFoodDbUrl(
  template: string,
  apiKey: string,
  query: string,
  rows: number = FOOD_DB_ROWS,
): string {
  return template
    .replaceAll("{key}", encodeURIComponent(apiKey))
    .replaceAll("{query}", encodeURIComponent(query.trim()))
    .replaceAll("{rows}", String(rows));
}

/** 숫자로 못 읽는 값(빈칸·`-`·`N/A`)은 0. 음수는 있을 수 없으니 0 으로 접는다. */
function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 두 포털의 행을 하나의 중립 모양으로 옮긴 것. */
type RawFood = {
  name: string;
  amount: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

/** 식품안전나라 행. */
function fromFoodSafetyRow(r: Record<string, unknown>): RawFood {
  const g = num(r.SERVING_WT);
  return {
    name: String(r.DESC_KOR ?? "").trim(),
    // "0g" 은 쓰지 않는다 — 0 을 보여주면 사용자가 양을 0 으로 읽는다.
    amount: g > 0 ? `${g}g` : "1회 제공량",
    kcal: num(r.NUTR_CONT1),
    carbs: num(r.NUTR_CONT2),
    protein: num(r.NUTR_CONT3),
    fat: num(r.NUTR_CONT4),
  };
}

/**
 * data.go.kr 표준데이터 행. 열 이름이 한글이다.
 *
 * ⚠ `영양성분함량기준량` 은 "100g" 처럼 **문자열**로 온다(숫자가 아니다). 이걸 숫자로
 * 읽으려 하면 0 이 되고, 그 순간 모든 음식이 "1회 제공량" 으로 뭉개진다. 그대로 쓴다.
 */
function fromStandardRow(r: Record<string, unknown>): RawFood {
  const basis = String(r["영양성분함량기준량"] ?? "").trim();
  return {
    name: String(r["식품명"] ?? "").trim(),
    amount: basis || "1회 제공량",
    kcal: num(r["에너지(kcal)"]),
    carbs: num(r["탄수화물(g)"]),
    protein: num(r["단백질(g)"]),
    fat: num(r["지방(g)"]),
  };
}

export type FoodDbParse =
  | { ok: true; foods: FoodItem[] }
  /** 부를 수는 있었지만 결과를 못 준 경우. `reason` 은 로그용(화면엔 안 띄운다). */
  | { ok: false; reason: string };

/**
 * 응답 → `FoodItem[]`.
 *
 * 🔴 **인증 실패·서비스 폐기도 HTTP 200 이다.** 두 포털 다 오류를 본문에 담아 200 으로
 * 준다. 이걸 안 보면 "검색 결과 없음"과 "키가 죽었음"이 화면에서 똑같아 보여, 연동이
 * 끊겨도 아무도 모른 채 몇 달이 지난다.
 */
export function parseFoodDb(data: unknown): FoodDbParse {
  const root = data as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return { ok: false, reason: "빈 응답" };

  // ── data.go.kr 공통 오류 봉투 ──
  const envelope = root.OpenAPI_ServiceResponse as
    | { cmmMsgHeader?: { errMsg?: string; returnAuthMsg?: string } }
    | undefined;
  if (envelope) {
    const h = envelope.cmmMsgHeader ?? {};
    return { ok: false, reason: `${h.errMsg ?? "오류"} ${h.returnAuthMsg ?? ""}`.trim() };
  }

  // ── 식품안전나라: 서비스 id 를 키로 쓰는 블록 하나 ──
  const fsRoot = findFoodSafetyBlock(root);
  if (fsRoot) return collect(fsRoot.rows.map(fromFoodSafetyRow), fsRoot.reason);

  // ── data.go.kr 표준데이터: { data: [...] } ──
  if (Array.isArray(root.data)) {
    return collect(
      (root.data as Record<string, unknown>[]).map(fromStandardRow),
      null,
    );
  }

  return { ok: false, reason: "모르는 응답 형식" };
}

/**
 * 식품안전나라 블록 찾기. 서비스 id 가 키라서(`I0750` 등) 이름을 고정할 수 없다 —
 * `row` 나 `RESULT` 를 가진 객체를 찾는다. 주소가 바뀌어도 파서는 따라간다.
 */
function findFoodSafetyBlock(
  root: Record<string, unknown>,
): { rows: Record<string, unknown>[]; reason: string | null } | null {
  // 키가 통째로 거절되면 최상위 RESULT 만 온다.
  const top = root.RESULT as { CODE?: string; MSG?: string } | undefined;
  if (top?.CODE) {
    return top.CODE === "INFO-000"
      ? { rows: [], reason: null }
      : { rows: [], reason: `${top.CODE} ${top.MSG ?? ""}`.trim() };
  }

  for (const value of Object.values(root)) {
    if (!value || typeof value !== "object") continue;
    const block = value as { RESULT?: { CODE?: string; MSG?: string }; row?: unknown };
    if (!block.RESULT && !Array.isArray(block.row)) continue;

    const code = block.RESULT?.CODE;
    // INFO-200 = 해당 데이터 없음. 오류가 아니라 '없음'이다.
    if (code && code !== "INFO-000" && code !== "INFO-200") {
      return { rows: [], reason: `${code} ${block.RESULT?.MSG ?? ""}`.trim() };
    }
    return {
      rows: Array.isArray(block.row) ? (block.row as Record<string, unknown>[]) : [],
      reason: null,
    };
  }
  return null;
}

/** 공통 후처리 — 중복 접기, 빈 값 버리기, `FoodItem` 으로. */
function collect(raw: RawFood[], reason: string | null): FoodDbParse {
  if (reason) return { ok: false, reason };

  const seen = new Set<string>();
  const foods: FoodItem[] = [];
  for (const r of raw) {
    if (!r.name) continue;
    // 같은 음식이 제조사·조사연도별로 여러 줄 온다. 첫 줄만 남긴다.
    const norm = normalizeFoodName(r.name);
    if (!norm || seen.has(norm)) continue;
    // 전부 0 인 행은 값이 안 채워진 것이다 — 목록에 올리면 0kcal 음식으로 기록된다.
    if (r.kcal === 0 && r.carbs === 0 && r.protein === 0 && r.fat === 0) continue;

    seen.add(norm);
    foods.push({
      // 정적·custom 과 겹치지 않는 접두사.
      id: `fooddb:${norm}`,
      name: r.name,
      // 식품군을 안 주는 응답이 있어 `custom_foods` 와 같게 '기타'로 둔다 — 이름으로
      // 분류를 추측하면 틀린 칸에 들어가 오히려 찾기 어려워진다.
      category: "기타",
      amount: r.amount,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    });
  }
  return { ok: true, foods };
}
