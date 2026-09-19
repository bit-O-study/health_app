import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";

for (const { scheme, width } of [
  { scheme: "light", width: 320 },
  { scheme: "dark", width: 430 },
] as const) {
  test(`재설계 탐색·영양 요약·좁은 화면 (${scheme}, ${width}px)`, async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await createOnboardedAccount(page);
    await page.goto("/home");
    await page.evaluate((theme) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }, scheme);

    const hero = page.getByRole("region", { name: "오늘의 운동 바로가기" });
    await expect(hero).toBeVisible();
    // CSS가 캐시에 남아 새 행동 영역이 무스타일로 표시되는 회귀도 검출한다.
    await expect(hero).toHaveCSS("padding", "24px");
    const workout = hero.getByRole("link", { name: "오늘 운동 보기" });
    await expect(workout).toHaveCSS("display", "inline-flex");
    // 변환 좌표의 부동소수점 오차(43.999969px)는 0.01px 단위로 비교한다.
    expect(Math.round((await workout.boundingBox())!.height * 100) / 100).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("navigation", { name: "기록 바로가기" }).getByRole("link")).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
    await workout.click();
    await expect(page).toHaveURL(/\/routine$/);

    for (const [name, path] of [
      ["식단", "/diet"], ["캘린더", "/calendar"], ["그룹", "/groups"],
      ["커뮤니티", "/community"], ["홈", "/home"],
    ]) {
      const nav = page.getByRole("navigation", { name: "주요 메뉴" });
      await nav.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const outside = await page.locator('[data-testid="page-header"] a, [data-testid="page-header"] button, nav[aria-label="주요 메뉴"] a, .app-shortcut').evaluateAll((elements) =>
        elements.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
        }).map((el) => el.textContent),
      );
      expect(outside).toEqual([]);
      if (path === "/diet") {
        const summary = page.getByRole("region", { name: "섭취 영양 요약" });
        await expect(summary.getByRole("progressbar")).toHaveCount(4);
        await expect(summary.getByRole("progressbar", { name: "섭취 칼로리", exact: true })).toHaveAttribute("aria-valuenow", "0");
        await expect(page.getByRole("button", { name: "추가", exact: true })).toHaveCount(4);
      }
      await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}.png`), fullPage: true });
    }

    await page.getByRole("link", { name: "설정", exact: true }).click();
    await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "체형 정보", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await expect(page.getByTestId("page-header")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("profile.png"), fullPage: true });
    expect(errors).toEqual([]);
  });
}
