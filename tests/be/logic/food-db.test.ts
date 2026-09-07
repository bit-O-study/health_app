import { describe, expect, it } from "vitest";

import {
  MIN_FOOD_DB_QUERY,
  buildFoodDbUrl,
  parseFoodDb,
} from "@/features/diet/food-db";

/** 식품안전나라 형식(서비스 id 가 최상위 키). */
const fsRows = (rows: unknown[]) => ({
  I0750: { total_count: String(rows.length), RESULT: { CODE: "INFO-000", MSG: "정상" }, row: rows },
});

const FS_ROW = {
  DESC_KOR: "닭가슴살구이",
  SERVING_WT: "100",
  NUTR_CONT1: "165",
  NUTR_CONT2: "0",
  NUTR_CONT3: "31",
  NUTR_CONT4: "3.6",
};

/** data.go.kr 표준데이터 형식(한글 열 이름). */
const STD_ROW = {
  식품명: "편의점 불고기도시락",
  영양성분함량기준량: "100g",
  "에너지(kcal)": "182",
  "탄수화물(g)": "27.5",
  "단백질(g)": "8.2",
  "지방(g)": "4.1",
};

describe("buildFoodDbUrl", () => {
  it("{key}·{query}·{rows} 를 치환한다", () => {
    const url = buildFoodDbUrl(
      "https://x.test/api/{key}/svc/json/1/{rows}/DESC_KOR={query}",
      "KEY123",
      "사과",
      5,
    );
    expect(url).toBe(
      `https://x.test/api/KEY123/svc/json/1/5/DESC_KOR=${encodeURIComponent("사과")}`,
    );
  });

  it("🔴 치환값을 인코딩한다 — 공백·슬래시가 들어오면 주소가 깨진다", () => {
    const url = buildFoodDbUrl("https://x.test/?q={query}", "K", "닭가슴살 100g");
    expect(url).not.toContain(" ");
    expect(buildFoodDbUrl("https://x.test/?q={query}", "K", "a/b")).toContain("a%2Fb");
  });

  it("같은 자리표가 여러 번 나와도 전부 바꾼다", () => {
    expect(buildFoodDbUrl("{key}|{key}|{query}|{query}", "K", "x")).toBe("K|K|x|x");
  });

  it("표준데이터의 대괄호 조건절 주소도 그대로 쓸 수 있다", () => {
    const url = buildFoodDbUrl(
      "https://api.odcloud.kr/api/1/v1/uddi:abc?serviceKey={key}&perPage={rows}&cond[식품명::LIKE]={query}",
      "K+/=",
      "두부",
      30,
    );
    // 키에 들어 있는 +·/·= 는 인코딩돼야 한다(공공포털 키에 실제로 들어간다).
    expect(url).toContain("serviceKey=K%2B%2F%3D");
    expect(url).toContain("perPage=30");
    expect(url).toContain(`cond[식품명::LIKE]=${encodeURIComponent("두부")}`);
  });

  it("{query} 없는 템플릿은 건드리지 않는다 — 규격을 우리가 지어내지 않는다", () => {
    expect(buildFoodDbUrl("https://x.test/all?key={key}", "K", "사과")).toBe(
      "https://x.test/all?key=K",
    );
  });

  it("앞뒤 공백은 떼고 보낸다", () => {
    expect(buildFoodDbUrl("{query}", "K", "  사과  ")).toBe("%EC%82%AC%EA%B3%BC");
  });
});

describe("parseFoodDb — 식품안전나라 형식", () => {
  it("1회 제공량 기준 영양값을 옮긴다", () => {
    const res = parseFoodDb(fsRows([FS_ROW]));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.foods[0]).toMatchObject({
      name: "닭가슴살구이",
      amount: "100g",
      kcal: 165,
      carbs: 0,
      protein: 31,
      fat: 3.6,
      category: "기타",
    });
    expect(res.foods[0]!.id.startsWith("fooddb:")).toBe(true);
  });

  it("🔴 서비스 폐기(ERROR-310)를 '결과 없음'과 구분한다", () => {
    // 2026-09-07 실제 응답: I2790·I0750 둘 다 이걸 돌려준다.
    const res = parseFoodDb({
      I0750: {
        total_count: "0",
        RESULT: { CODE: "ERROR-310", MSG: "해당하는 서비스를 찾을 수 없습니다." },
      },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toContain("ERROR-310");
  });

  it("키가 통째로 거절되면 최상위 RESULT 로 온다", () => {
    const res = parseFoodDb({ RESULT: { CODE: "ERROR-300", MSG: "필수 값 누락" } });
    expect(res.ok).toBe(false);
  });

  it("INFO-200(해당 데이터 없음)은 오류가 아니라 빈 결과다", () => {
    const res = parseFoodDb({
      I0750: { RESULT: { CODE: "INFO-200", MSG: "해당하는 데이터가 없습니다." } },
    });
    expect(res).toEqual({ ok: true, foods: [] });
  });

  it("서비스 id 가 뭐든 읽는다 — 주소가 바뀌어도 파서는 따라간다", () => {
    const res = parseFoodDb({
      SOME_NEW_SVC: { RESULT: { CODE: "INFO-000" }, row: [FS_ROW] },
    });
    expect(res.ok && res.foods).toHaveLength(1);
  });

  it("제공량이 없으면 '1회 제공량' — 0g 이라고 쓰면 양을 0 으로 읽는다", () => {
    const res = parseFoodDb(fsRows([{ ...FS_ROW, SERVING_WT: "" }]));
    expect(res.ok && res.foods[0]!.amount).toBe("1회 제공량");
  });
});

describe("parseFoodDb — data.go.kr 표준데이터 형식", () => {
  it("한글 열 이름을 읽는다", () => {
    const res = parseFoodDb({ currentCount: 1, data: [STD_ROW] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.foods[0]).toMatchObject({
      name: "편의점 불고기도시락",
      amount: "100g",
      kcal: 182,
      carbs: 27.5,
      protein: 8.2,
      fat: 4.1,
    });
  });

  it("⚠ 기준량은 문자열이다 — 숫자로 읽으면 전부 '1회 제공량' 으로 뭉개진다", () => {
    const res = parseFoodDb({ data: [{ ...STD_ROW, 영양성분함량기준량: "1접시(250g)" }] });
    expect(res.ok && res.foods[0]!.amount).toBe("1접시(250g)");
  });

  it("천 단위 쉼표가 붙어 와도 숫자로 읽는다", () => {
    const res = parseFoodDb({ data: [{ ...STD_ROW, "에너지(kcal)": "1,024" }] });
    expect(res.ok && res.foods[0]!.kcal).toBe(1024);
  });

  it("🔴 data.go.kr 공통 오류 봉투를 알아본다", () => {
    // 2026-09-07 실제 응답: 폐기된 경로를 부르면 이게 200 으로 온다.
    const res = parseFoodDb({
      OpenAPI_ServiceResponse: {
        cmmMsgHeader: {
          errMsg: "NO_OPENAPI_SERVICE_ERROR",
          returnAuthMsg: "해당 오픈API 서비스가 없거나 폐기됨",
          returnReasonCode: "12",
        },
      },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toContain("NO_OPENAPI_SERVICE_ERROR");
  });

  it("빈 목록은 빈 결과", () => {
    expect(parseFoodDb({ currentCount: 0, data: [] })).toEqual({ ok: true, foods: [] });
  });
});

describe("parseFoodDb — data.go.kr 표준데이터 API 형식(현재 살아 있는 것)", () => {
  // 실제 필드명: 2026-09-07 data.go.kr 15100070 명세에서 확인.
  const API_ROW = {
    foodCd: "D202-120000000-1180",
    foodNm: "피자_페퍼로니피자",
    nutConSrtrQua: "100g",
    enerc: "240",
    chocdf: "30.1",
    prot: "12.47",
    fatce: "5.75",
    fasat: "2.1",
    fatrn: "0.1",
    servSize: "",
    foodSize: "1640g",
  };
  // 실제 봉투(2026-09-07 실호출): response 로 감싸지 않고, 목록이 items.item 이다.
  const ok = (item: unknown) => ({
    header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
    body: { items: { item }, numOfRows: 30, pageNo: 1, totalCount: 1 },
  });

  it("영문 약어 열 이름을 읽는다", () => {
    const res = parseFoodDb(ok([API_ROW]));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.foods[0]).toMatchObject({
      name: "피자_페퍼로니피자",
      amount: "100g",
      kcal: 240,
      carbs: 30.1,
      protein: 12.47,
      fat: 5.75,
    });
  });

  it("🔴 지방은 fatce 다 — fasat(포화)·fatrn(트랜스)과 헷갈리면 값이 통째로 틀린다", () => {
    const res = parseFoodDb(ok([API_ROW]));
    expect(res.ok && res.foods[0]!.fat).toBe(5.75);
    expect(res.ok && res.foods[0]!.fat).not.toBe(2.1);
  });

  it("⚠ 기준량은 문자열이다 — 숫자로 읽으면 전부 '1회 제공량' 으로 뭉개진다", () => {
    const res = parseFoodDb(ok([{ ...API_ROW, nutConSrtrQua: "1접시(250g)" }]));
    expect(res.ok && res.foods[0]!.amount).toBe("1접시(250g)");
  });

  it("결과가 1건이면 items 가 객체로 오는 변환기가 있다 — 그것도 읽는다", () => {
    const res = parseFoodDb(ok(API_ROW));
    expect(res.ok && res.foods).toHaveLength(1);
  });

  it("🔴 목록은 items 가 아니라 items.item 이다 — 잘못 짚으면 정상 응답인데 조용히 0건", () => {
    // items 바로 아래를 읽던 구현은 이 응답에서 아무것도 못 찾았다.
    const res = parseFoodDb(ok([API_ROW]));
    expect(res.ok && res.foods).toHaveLength(1);
  });

  it("response 로 한 겹 더 감싼 API 도 읽는다", () => {
    const res = parseFoodDb({ response: ok([API_ROW]) });
    expect(res.ok && res.foods).toHaveLength(1);
  });

  it("🔴 resultCode '03'(NODATA_ERROR)은 오류가 아니라 '없음'이다", () => {
    // 이름이 ERROR 지만 foodNm 완전일치가 안 맞으면 늘 이게 온다. 오류로 다루면
    // 정상적인 '검색 결과 없음'마다 로그가 쌓이고 화면에도 실패로 보인다.
    const res = parseFoodDb({
      header: { resultCode: "03", resultMsg: "NODATA_ERROR" },
      body: null,
    });
    expect(res).toEqual({ ok: true, foods: [] });
  });

  it("resultCode 가 00·03 이 아니면 오류다 — 키 만료·쿼터 초과가 여기로 온다", () => {
    const res = parseFoodDb({
      header: { resultCode: "30", resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toContain("SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
  });

  it("빈 목록은 빈 결과", () => {
    expect(parseFoodDb(ok([]))).toEqual({ ok: true, foods: [] });
    expect(parseFoodDb({ header: { resultCode: "00" }, body: {} })).toEqual({
      ok: true,
      foods: [],
    });
  });
});

describe("parseFoodDb — 공통 후처리", () => {
  it("같은 음식이 제조사·조사연도별로 여러 줄 와도 한 줄만 남는다", () => {
    const res = parseFoodDb(
      fsRows([FS_ROW, { ...FS_ROW, NUTR_CONT1: "170" }, { ...FS_ROW, DESC_KOR: " 닭가슴살구이 " }]),
    );
    expect(res.ok && res.foods).toHaveLength(1);
    // 첫 줄 값을 지킨다.
    expect(res.ok && res.foods[0]!.kcal).toBe(165);
  });

  it("값이 전부 0 인 행은 버린다 — 0kcal 음식으로 기록되면 안 된다", () => {
    const empty = {
      DESC_KOR: "값없음",
      SERVING_WT: "100",
      NUTR_CONT1: "",
      NUTR_CONT2: "-",
      NUTR_CONT3: "N/A",
      NUTR_CONT4: "",
    };
    expect(parseFoodDb(fsRows([empty]))).toEqual({ ok: true, foods: [] });
  });

  it("일부 값만 비어도 나머지는 살린다", () => {
    const res = parseFoodDb(fsRows([{ ...FS_ROW, NUTR_CONT2: "", NUTR_CONT4: "-" }]));
    expect(res.ok && res.foods[0]).toMatchObject({ kcal: 165, carbs: 0, fat: 0 });
  });

  it("이름 없는 행은 버린다", () => {
    expect(parseFoodDb(fsRows([{ ...FS_ROW, DESC_KOR: "  " }]))).toEqual({
      ok: true,
      foods: [],
    });
    expect(parseFoodDb({ data: [{ ...STD_ROW, 식품명: "" }] })).toEqual({
      ok: true,
      foods: [],
    });
  });

  it("응답이 이상해도 던지지 않는다 — 보조 출처가 검색 전체를 죽이면 안 된다", () => {
    for (const bad of [null, undefined, "문자열", 42, {}, { data: "배열아님" }]) {
      expect(() => parseFoodDb(bad)).not.toThrow();
    }
    expect(parseFoodDb(null).ok).toBe(false);
    expect(parseFoodDb({}).ok).toBe(false);
  });
});

describe("MIN_FOOD_DB_QUERY", () => {
  it("한 글자로는 안 부른다 — 수천 건이 걸린다", () => {
    expect(MIN_FOOD_DB_QUERY).toBeGreaterThanOrEqual(2);
  });
});
