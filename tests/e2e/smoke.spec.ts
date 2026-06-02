import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

// Broad smoke: after signup, every major route must render without a Next.js
// runtime-error overlay or pageerror. Catches schema/render regressions cheaply.
const ROUTES: { path: string; expect?: RegExp }[] = [
  { path: "/", expect: /오늘의 운동/ },
  { path: "/plan", expect: /운동 등록/ },
  { path: "/plan/today" },
  { path: "/settings" },
  { path: "/settings/routine", expect: /루틴/ },
  { path: "/settings/score", expect: /점수/ },
  { path: "/settings/history" },
  { path: "/settings/profile" },
  { path: "/settings/gym" },
  { path: "/settings/body-composition" },
  { path: "/exercises" },
];

test("주요 페이지가 회원가입 후 에러 없이 렌더된다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await signUpAndOnboard(page);

  const failures: string[] = [];
  for (const r of ROUTES) {
    pageErrors.length = 0;
    const resp = await page.goto(r.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const status = resp?.status() ?? 0;
    const body = await page.locator("body").innerText().catch(() => "");
    const runtimeErr = /Unhandled Runtime Error|Application error|Server Error/i.test(body);
    const expectOk = r.expect ? r.expect.test(body) : true;
    if (status >= 400 || pageErrors.length || runtimeErr || !expectOk) {
      failures.push(
        `${r.path} (http=${status}, pageerrors=${pageErrors.length}, runtimeErr=${runtimeErr}, expectMatch=${expectOk})`,
      );
    }
  }
  expect(failures, `Pages with problems:\n${failures.join("\n")}`).toEqual([]);
});
