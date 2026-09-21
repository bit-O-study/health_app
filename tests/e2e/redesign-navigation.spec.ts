import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { silenceDevOverlay } from "./helpers/dev-overlay";

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
    await silenceDevOverlay(page);
  await createOnboardedAccount(page);
    await page.goto("/home");
    await page.evaluate((theme) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }, scheme);

    // 2026-09-20 런처 전환 — 홈은 히어로·바로가기 대신 **앱 아이콘 판 + 요약 위젯**이다.
    const grid = page.getByRole("navigation", { name: "앱" });
    await expect(grid).toBeVisible();
    await expect(grid.getByRole("link")).toHaveCount(6);
    // 매일 쓰는 세 앱은 홈에서 요약 한 줄로 보이고, 눌러서 1탭에 들어간다.
    await expect(page.getByRole("region", { name: "오늘 요약" }).getByRole("link")).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

    // 앱 타일 → 그 앱. 하단바가 그 앱 메뉴로 갈리고, **가운데 칸은 어디서나 홈**이다.
    for (const [app, path, firstTab] of [
      ["운동", "/routine", "오늘"],
      ["식단", "/diet", "오늘"],
      ["캘린더", "/calendar", "달력"],
      ["그룹", "/groups", "내 그룹"],
      ["커뮤니티", "/community", "피드"],
    ] as const) {
      const nav = page.getByRole("navigation", { name: "주요 메뉴" });
      await page.getByRole("navigation", { name: "앱" })
        .getByRole("link", { name: app, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // 하단바 5칸 · 3번째가 홈 — 앱이 바뀌어도 이 자리는 안 움직인다.
      const tabs = nav.getByRole("link");
      await expect(tabs).toHaveCount(5);
      await expect(tabs.nth(2)).toHaveText("홈");
      await expect(tabs.first()).toHaveText(firstTab);

      const outside = await page.locator('[data-testid="page-header"] a, [data-testid="page-header"] button, nav[aria-label="주요 메뉴"] a, nav[aria-label="앱"] a').evaluateAll((elements) =>
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

      // 가운데 홈으로 런처 복귀 — 어느 앱에서든 1탭.
      await tabs.nth(2).click();
      await expect(page).toHaveURL(/\/home$/);
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
