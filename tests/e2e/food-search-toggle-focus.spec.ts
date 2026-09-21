import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";

test("음식 검색 토글은 초록 박스 없이 키보드 포커스를 표시한다", async ({ page }) => {
  await createOnboardedAccount(page);
  await page.route("**/api/foods/search?**", (route) => route.fulfill({ json: [] }));
  await page.goto("/diet");
  for (const scheme of ["light", "dark"]) {
    await page.evaluate((s) => document.documentElement.classList.toggle("dark", s === "dark"), scheme);
    await page.getByRole("button", { name: "추가", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "아침 추가" });
    const search = dialog.getByRole("textbox", { name: "음식 검색", exact: true });
    await expect(search).toBeFocused();
      for (const name of ["직접 입력", "검색"]) {
        await page.keyboard.press("Shift+Tab");
        const toggle = dialog.getByRole("button", { name, exact: true });
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveCSS("outline-style", "none");
        await expect(toggle).toHaveCSS("text-decoration-line", "underline");
      }
      await dialog.getByRole("button", { name: "직접 입력", exact: true }).click();
      await dialog.getByRole("button", { name: "검색", exact: true }).click();
      await expect(search).toBeVisible();
      await expect(dialog.getByRole("button", { name: "검색", exact: true })).toHaveCSS("outline-style", "none");
    await expect(dialog.getByRole("button", { name: "검색", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "검색", exact: true })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  }
});
