import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

/**
 * 식약처 식품 DB 가 식단 검색의 **세 번째 출처**로 실제로 붙는지.
 *
 * ## 왜 조건부인가
 * 이 기능은 `FOOD_DB_URL`·`FOOD_DB_API_KEY` 가 있어야 켜지고, 그 값은 **dev 서버를 띄울 때**
 * 들어간다(서버 액션이 읽는다). 테스트가 나중에 넣을 수 없다. 그래서 서버를 그렇게 띄운
 * 경우에만 돌린다 — 평소 스위트에서는 건너뛰고, 대신 `diet.spec.ts` 가 **기능이 꺼져 있어도
 * 검색이 멀쩡한지**를 계속 지킨다.
 *
 * 돌리는 법(실제 공공 API 는 활용신청 전에는 주소를 알 수 없어 스텁으로 확인한다):
 *   node <스텁서버>            # 표준데이터 형식으로 응답
 *   FOOD_DB_URL='http://127.0.0.1:3399/?serviceKey={key}&perPage={rows}&cond[식품명::LIKE]={query}' \
 *     FOOD_DB_API_KEY=test pnpm exec next dev -p 3108
 *   E2E_FOOD_DB=1 E2E_BASE_URL=http://localhost:3108 pnpm exec playwright test tests/e2e/food-db-search.spec.ts
 */
const enabled = process.env.E2E_FOOD_DB === "1";

test("식약처 DB 결과가 검색 목록에 합쳐진다", async ({ page }) => {
  test.skip(!enabled, "needs dev server started with FOOD_DB_URL/FOOD_DB_API_KEY");
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /추가|기록/ }).first().click();

  const search = page.getByLabel("음식 검색");
  await search.waitFor();
  // 정적 카탈로그·custom_foods 에 없는 이름 → 식약처 DB 에서만 나올 수 있다.
  await search.fill("스텁 불고기도시락");

  // 외부 왕복이라 디바운스가 600ms 다. 넉넉히 기다린다.
  await expect(page.getByText("스텁 불고기도시락")).toBeVisible({ timeout: 15_000 });
});

test("식약처에서 받은 음식을 그대로 담을 수 있다", async ({ page }) => {
  test.skip(!enabled, "needs dev server started with FOOD_DB_URL/FOOD_DB_API_KEY");
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /추가|기록/ }).first().click();

  const search = page.getByLabel("음식 검색");
  await search.waitFor();
  await search.fill("스텁 불고기도시락");
  await page.getByText("스텁 불고기도시락").first().click({ timeout: 15_000 });

  // 목록에 보이는 것과 담기는 것이 갈리면 검색이 있으나 마나다.
  await expect(page.getByText("스텁 불고기도시락").first()).toBeVisible();
});

/**
 * ⚠ 두 글자 미만일 때 외부 DB 를 안 부르는 건 여기서 못 본다 — 한 번 받아온 음식은
 * `custom_foods` 에 쌓여 **그 다음부터는 한 글자로도 우리 DB 에서 잡히기 때문**이다
 * (그게 이 기능의 핵심 동작이다). 최소 글자 수 방어는 단위테스트가 지킨다
 * (`tests/be/logic/food-db.test.ts` 의 MIN_FOOD_DB_QUERY).
 */
