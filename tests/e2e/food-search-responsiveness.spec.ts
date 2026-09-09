import { expect, test } from "@playwright/test";
import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

test("이전 음식 검색이 느려도 새 검색 결과를 표시하고 이전 결과를 섞지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB credentials");
  await signUpAndOnboard(page);
  await page.goto("/diet");
  let oldRequestStarted = false;
  let releaseOld!: () => void;
  const held = new Promise<void>((resolve) => { releaseOld = resolve; });
  // 느리게 붙잡을 출처는 **custom** 이다. `db`(식약처)는 앞의 두 출처가 빈손일 때만
  // 부르도록 바뀌어서(2026-09-08), 정적 결과가 뜨는 이 시나리오에서는 아예 안 나간다.
  await page.route("**/api/foods/search?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const q = params.get("q");
    const source = params.get("source");
    if (q === "바나나" && source === "custom") {
      oldRequestStarted = true;
      await held;
      await route.fulfill({ json: [{ id: "old", name: "오래된 바나나", kcal: 100, protein: 1, fat: 0, carbs: 20, category: "기타", amount: "1개" }] }).catch(() => {});
      return;
    }
    const rows = source === "local" && q ? [{ id: q, name: q, kcal: 100, protein: 1, fat: 0, carbs: 20, category: "기타", amount: "1개" }] : [];
    await route.fulfill({ json: rows });
  });
  try {
    await page.getByRole("button", { name: "추가", exact: true }).first().click();
    const search = page.getByLabel("음식 검색");
    await search.fill("바나나");
    await expect(page.getByRole("button").filter({ hasText: "바나나" })).toBeVisible();
    await expect.poll(() => oldRequestStarted).toBe(true);
    await search.fill("닭가슴살");
    await expect(page.getByRole("button").filter({ hasText: "닭가슴살" })).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole("button").filter({ hasText: "바나나" })).toHaveCount(0);
    releaseOld();
    await expect(page.getByText("오래된 바나나")).toHaveCount(0);
    await search.fill("");
    await expect(page.getByRole("button").filter({ hasText: "닭가슴살" })).toHaveCount(0);
  } finally {
    releaseOld();
  }
});

test("실제 음식 검색 응답 시간과 결과를 확인한다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB credentials");
  await signUpAndOnboard(page);
  // 첫 라우트 컴파일은 미리 끝내고 실제 검색 왕복을 측정한다.
  const warmup = await page.request.get("/api/foods/search?source=local&q=");
  expect(warmup.status()).toBe(200);
  for (const q of ["우유", "닭가슴살"]) {
    const results = await Promise.all(["local", "custom"].map(async (source) => {
      const started = Date.now();
      const response = await page.request.get("/api/foods/search?" + new URLSearchParams({ source, q }));
      expect(response.status()).toBe(200);
      const rows = await response.json();
      return { source, q, ms: Date.now() - started, count: rows.length };
    }));
    console.log("food-search timing", JSON.stringify(results));
    for (const result of results) {
      expect(result.count).toBeGreaterThan(0);
      expect(result.ms).toBeLessThan(4000);
    }
  }
});
/**
 * 🔴 식약처(`db`) 출처는 **앞의 두 출처가 빈손일 때만** 부른다 — 2026-09-08.
 *
 * 이 API 는 `foodNm` 이 완전일치라 사용자가 치는 말에는 거의 항상 0건이다. 예전엔
 * 검색어마다 세 출처를 나란히 불러서, 대부분의 검색이 **결과도 안 나오는 외부 왕복**을
 * 한 번씩 더 태웠다. 요청이 실제로 안 나가는지는 화면만 봐서는 절대 모른다.
 */
test("결과가 있으면 식약처 실시간 조회를 안 부른다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB credentials");
  await signUpAndOnboard(page);
  await page.goto("/diet");

  const sources: string[] = [];
  await page.route("**/api/foods/search?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const source = params.get("source") ?? "";
    const q = params.get("q") ?? "";
    sources.push(source);
    // 정적 카탈로그가 결과를 준 상황을 만든다(= 평소 검색).
    const rows = source === "local" && q
      ? [{ id: q, name: q, kcal: 100, protein: 1, fat: 0, carbs: 20, category: "기타", amount: "1개" }]
      : [];
    await route.fulfill({ json: rows });
  });

  await page.getByRole("button", { name: "추가", exact: true }).first().click();
  await page.getByLabel("음식 검색").fill("바나나");
  await expect(page.getByRole("button").filter({ hasText: "바나나" })).toBeVisible();
  // 디바운스(db 는 600ms)를 넉넉히 넘겨도 안 나가야 한다.
  await page.waitForTimeout(1500);
  expect(sources).toContain("local");
  expect(sources).not.toContain("db");
});

test("아무 데서도 못 찾으면 그때 식약처 실시간 조회를 부른다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB credentials");
  await signUpAndOnboard(page);
  await page.goto("/diet");

  const sources: string[] = [];
  await page.route("**/api/foods/search?**", async (route) => {
    sources.push(new URL(route.request().url()).searchParams.get("source") ?? "");
    await route.fulfill({ json: [] }); // 세 출처 모두 빈손
  });

  await page.getByRole("button", { name: "추가", exact: true }).first().click();
  await page.getByLabel("음식 검색").fill("없는음식이름asdf");
  await expect.poll(() => sources.includes("db"), { timeout: 5_000 }).toBe(true);
});

/**
 * 🔴 날짜 이동은 Link + `prefetch` 여야 한다 — 2026-09-08.
 *
 * 버튼+`router.push` 로 되돌리면 누른 **다음에야** 서버 렌더가 시작돼 한국↔싱가포르
 * 왕복이 그대로 대기시간이 된다. 화면은 똑같이 동작해서 아무도 못 본다.
 * (`prefetch` 를 생략해도 마찬가지다 — 동적 라우트는 staleTimes.dynamic 이 0초라
 *  미리 받아 둔 게 즉시 낡은 것으로 처리된다.)
 */
test("어제 식단으로 가는 화살표가 미리 받아 두는 링크다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB credentials");
  await signUpAndOnboard(page);
  await page.goto("/diet");

  const prev = page.getByLabel("이전 날");
  await expect(prev).toHaveJSProperty("tagName", "A");
  await expect(prev).toHaveAttribute("href", /\/diet\?d=\d{4}-\d{2}-\d{2}/);

  // 실제로 이동하고, 거기서 '다음 날'(오늘로 복귀)도 링크가 된다.
  await prev.click();
  await expect(page).toHaveURL(/\/diet\?d=\d{4}-\d{2}-\d{2}/);
  const next = page.getByLabel("다음 날");
  await expect(next).toHaveJSProperty("tagName", "A");
  await next.click();
  await expect(page).toHaveURL(/\/diet$/);
});
