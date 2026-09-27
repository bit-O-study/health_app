import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";

test("계정 준비는 화면을 열지 않고 첫 화면에서도 인증이 유지된다", async ({ page }) => {
  const navigations: string[] = [];
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  const email = await test.step("prepare account only", () => createOnboardedAccount(page));
  expect(email).toContain("@example.com");
  expect(page.url()).toBe("about:blank");
  expect(navigations).toEqual([]);
  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();
});
