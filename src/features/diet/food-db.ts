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
 * ## 🔴 흔히 도는 주소는 전부 죽어 있다 (2026-09-07 실측)
 * - 식품안전나라 `I2790`·`I0750` → `ERROR-310 해당하는 서비스를 찾을 수 없습니다`
 *   (문서 페이지는 아직 살아 있는데 서비스가 없다)
 * - data.go.kr `FoodNtrIrdntInfoService1` → `NO_OPENAPI_SERVICE_ERROR`(폐기)
 *
 * **지금 살아 있는 것**은 data.go.kr 표준데이터다(빈 키로 불러 `SERVICE_KEY_IS_NOT_
 * REGISTERED_ERROR` 가 오는 것으로 확인 — 서비스는 있고 키만 없다는 뜻):
 *
 *   https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api      (음식·요리)
 *   https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api  (원재료성 식품)
 *
 * 요청: `serviceKey`·`pageNo`·`numOfRows`·`type=json` + `foodNm`.
 *
 * 🔴 **`foodNm` 은 부분일치가 아니라 완전일치다**(실측: "피자" → 4건, "김치"·"밥" → NODATA,
 * "피자_" → NODATA). 그래서 이 실시간 조회만으로는 검색이 거의 쓸모없다 — 사용자가
 * 카탈로그의 이름을 글자 하나까지 맞춰 칠 리가 없다. **실제 검색은 `scripts/import-food-db.mjs`
 * 로 전체(음식 19,495건)를 `custom_foods` 에 한 번 받아 두고 우리 DB 에서 한다.**
 * 여기 실시간 조회는 가져온 뒤 새로 추가된 항목을 주워 오는 보조 경로로만 남긴다.
 *
 * 그래도 주소는 **환경변수 템플릿**(`FOOD_DB_URL`)으로 받는다. 위 실측이 말해 주듯 이
 * 계열 API 는 몇 년 단위로 통째로 갈린다 — 박아 두면 다음에 갈릴 때 코드를 고쳐야 하고,
 * 그 사이 화면에는 "검색 결과 없음"만 조용히 뜬다.
 *
 * ## 응답 모양을 세 가지 다 받는다
 * 어느 주소를 넣든 동작하게.
 * - **표준데이터**(현재): `{ header:{resultCode}, body:{ items:{ item:[{foodNm, nutConSrtrQua, enerc, prot, fatce, chocdf}] } } }`
 * - **odcloud/파일 미리보기**: `{ data: [{ "식품명", "영양성분함량기준량", "에너지(kcal)", … }] }`
 * - **식품안전나라**(옛 형식): `{ "I0750": { RESULT: {CODE}, row: [{DESC_KOR, SERVING_WT, NUTR_CONT1..4}] } }`
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

/**
 * data.go.kr 표준데이터 API 행. 영문 약어 열 이름이다(공공데이터 공통표준용어).
 * `nutConSrtrQua`(영양성분함량기준량)는 "100g" 같은 **문자열**이다 — 숫자로 읽으면 0 이 되고
 * 그 순간 모든 음식이 "1회 제공량" 으로 뭉개진다.
 * ⚠ `fatce`(지방)를 `fasat`(포화지방)·`fatrn`(트랜스지방)과 헷갈리면 안 된다.
 */
function fromStandardApiRow(r: Record<string, unknown>): RawFood {
  const basis = String(r.nutConSrtrQua ?? "").trim();
  return {
    name: String(r.foodNm ?? "").trim(),
    amount: basis || "1회 제공량",
    kcal: num(r.enerc),
    carbs: num(r.chocdf),
    protein: num(r.prot),
    fat: num(r.fatce),
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

  // ── data.go.kr 표준데이터 API ──
  // 실제 응답(2026-09-07 실호출):
  //   { header:{resultCode,resultMsg}, body:{ items:{ item:[…] }, totalCount } }
  // ⚠ `response` 로 한 겹 더 감싸는 API 도 있어 둘 다 본다. 그리고 목록이 `items` 바로
  //    아래가 아니라 **`items.item`** 이다 — XML 을 JSON 으로 옮긴 흔적이라, 여기를
  //    잘못 짚으면 정상 응답인데 조용히 0건이 된다.
  const std = (root.response ?? root) as {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: unknown } | null;
  };
  if (std.header?.resultCode !== undefined) {
    const code = std.header.resultCode;
    // '03' = NODATA_ERROR. 이름이 'ERROR' 지만 **오류가 아니라 '없음'** 이다
    // (foodNm 은 완전일치 검색이라 조금만 달라도 이게 온다).
    if (code === "03") return { ok: true, foods: [] };
    if (code !== "00") {
      return { ok: false, reason: `${code} ${std.header.resultMsg ?? ""}`.trim() };
    }
    const items = std.body?.items as { item?: unknown } | unknown[] | undefined;
    const raw = Array.isArray(items)
      ? items
      : items && typeof items === "object" && "item" in items
        ? (items as { item?: unknown }).item
        : items;
    // 결과가 1건일 때 배열이 아니라 객체로 오는 변환기가 있다 — 감싸서 같은 길로 보낸다.
    const rows = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : raw && typeof raw === "object"
        ? [raw as Record<string, unknown>]
        : [];
    return collect(rows.map(fromStandardApiRow), null);
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
