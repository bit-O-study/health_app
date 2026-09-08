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
  await page.route("**/api/foods/search?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const q = params.get("q");
    const source = params.get("source");
    if (q === "바나나" && source === "db") {
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