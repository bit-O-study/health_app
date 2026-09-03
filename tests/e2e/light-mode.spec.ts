import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

test("경량 모드 설정이 유지되고 근육 선택 3D를 기능 폴백으로 바꾼다", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await page.goto("/settings/personal", { waitUntil: "networkidle" });

  const lightMode = page.getByRole("switch", { name: "경량 모드" });
  await expect(lightMode).toHaveAttribute("aria-checked", "false");
  await lightMode.click();
  await expect(lightMode).toHaveAttribute("aria-checked", "true");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("heltch.performance.lightMode")),
    )
    .toBe("light");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("switch", { name: "경량 모드" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.goto("/plan/muscle", { waitUntil: "networkidle" });
  await expect(page.getByTestId("light-mode-mannequin-fallback")).toBeVisible();
  await expect(page.getByTestId("muscle-mannequin-canvas")).toHaveCount(0);
  await expect(page.getByTestId("muscle-chip-chest")).toBeVisible();
});
