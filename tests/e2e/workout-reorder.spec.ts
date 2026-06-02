import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// The ORIGINAL bug: reorder main exercises (drag) then 운동 시작 — the guide queue
// must follow the reordered order (not the stale server order).
test("순서 변경 후 운동 시작 시 가이드가 바뀐 순서를 따른다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // main list is the 2nd ul.space-y-2 (order: 워밍업 / 본운동 / 마무리)
  const mainUl = page.locator("ul.space-y-2").nth(1);
  const grips = mainUl.locator('[title="잡고 위·아래로 순서 변경"]');
  await expect(grips).toHaveCount(3);

  const names = async () =>
    (await mainUl.locator("li h3").allInnerTexts()).map((s) => s.split("\n")[0].trim());
  const before = await names();
  expect(before.length).toBe(3);

  // drag first row's grip down past the last row → it lands last
  await grips.nth(2).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(150);
  const b0 = await grips.nth(0).boundingBox();
  const b2 = await grips.nth(2).boundingBox();
  const sx = b0!.x + b0!.width / 2;
  const sy = b0!.y + b0!.height / 2;
  const ty = b2!.y + b2!.height / 2 + 30;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(80);
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(sx, sy + ((ty - sy) * i) / 14, { steps: 2 });
    await page.waitForTimeout(35);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);

  const after = await names();
  // expected: first item moved to the end
  expect(after).toEqual([before[1], before[2], before[0]]);

  // start workout → walk the guide, collect 본운동 order
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.locator("div.z-40").last();

  const guideMains: string[] = [];
  for (let i = 0; i < 40; i++) {
    const name = (await overlay.locator("h2").first().innerText().catch(() => "")).trim();
    const badges = await overlay.locator("span").allInnerTexts().catch(() => []);
    const badge = badges.find((b) => ["워밍업", "마무리", "본운동"].includes(b.trim())) ?? "";
    if (badge === "본운동" && name) guideMains.push(name);
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    const last = await page.getByRole("button", { name: "완료하고 종료" }).count();
    await next.click();
    await page.waitForTimeout(420);
    if (last) break;
  }

  // guide 본운동 names are clean (no body-part badge suffix). The reordered list
  // names carry a badge suffix, so compare by prefix in order.
  expect(guideMains.length).toBe(3);
  for (let i = 0; i < 3; i++) {
    expect(after[i].startsWith(guideMains[i])).toBe(true);
  }
});
