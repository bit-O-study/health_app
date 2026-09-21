import { expect, test } from "@playwright/test";

for (const path of ["/login", "/find-id"] as const) {
  test(`${path}: 스크립트 준비 전 입력을 막고 준비 후 첫 조작을 처리한다`, async ({ page }) => {
    let releaseScripts!: () => void;
    const scripts = new Promise<void>((resolve) => { releaseScripts = resolve; });
    await page.route(/\/_next\/.*\.js(?:\?.*)?$/, async (route) => {
      await scripts;
      await route.continue();
    });
    try {
      // HTML은 먼저 표시하되 이벤트 핸들러가 아직 연결되지 않은 상태를 유지한다.
      await page.goto(path, { waitUntil: "commit" });
      const input = page.locator(path === "/login" ? "#email" : "#name");
      await expect(input).toBeVisible();
      await expect(input).toBeDisabled();
      const action = page.getByRole("button", {
        name: path === "/login" ? "회원가입" : "아이디 찾기",
        exact: true,
      });
      await expect(action).toBeDisabled();
      releaseScripts();
      await expect(input).toBeEditable();
      await action.click();
      if (path === "/login") {
        await expect(page.locator("#name")).toBeVisible();
        await page.locator("#name").fill("수화검증");
        await expect(page.locator("#name")).toHaveValue("수화검증");
      } else {
        await expect(page.getByText("이름과 휴대폰 번호를 입력해 주세요.")).toBeVisible();
        expect(new URL(page.url()).search).toBe("");
      }
    } finally {
      releaseScripts();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}