import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// 순서 변경 후 운동 시작 시, 가이드 큐가 세 종류(워밍업/본운동/마무리) 모두에서
// 바뀐 순서를 따라야 한다. (이전엔 본운동만 반영되고 워밍업·마무리는 누락됐었다.)

const GRIP = '[title="잡고 위·아래로 순서 변경"]';
// 본운동 리스트는 이름을 h3, 컨디셔닝(워밍업/마무리)은 h4 로 렌더한다.
const names = async (ul: Locator) =>
  (await ul.locator("li h3, li h4").allInnerTexts()).map((s) => s.split("\n")[0].trim());

// 한 리스트(ul)의 첫 행 그립을 마지막 행 위치로 드래그 → 첫 항목이 맨 끝으로.
async function dragFirstToLast(page: Page, ul: Locator) {
  const grips = ul.locator(GRIP);
  const n = await grips.count();
  await grips.nth(n - 1).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(150);
  const b0 = await grips.nth(0).boundingBox();
  const bL = await grips.nth(n - 1).boundingBox();
  const sx = b0!.x + b0!.width / 2;
  const sy = b0!.y + b0!.height / 2;
  const ty = bL!.y + bL!.height / 2 + 30;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(80);
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(sx, sy + ((ty - sy) * i) / 14, { steps: 2 });
    await page.waitForTimeout(35);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
}

test("순서 변경 후 운동 시작 시 워밍업·본운동·마무리 모두 바뀐 순서를 따른다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // ul.space-y-2 순서: [워밍업, 본운동, 마무리]
  const warmUl = page.locator("ul.space-y-2").nth(0);
  const mainUl = page.locator("ul.space-y-2").nth(1);
  const coolUl = page.locator("ul.space-y-2").nth(2);
  await expect(warmUl.locator(GRIP)).toHaveCount(3);
  await expect(mainUl.locator(GRIP)).toHaveCount(3);
  await expect(coolUl.locator(GRIP)).toHaveCount(3);

  const warmBefore = await names(warmUl);
  const mainBefore = await names(mainUl);
  const coolBefore = await names(coolUl);

  // 세 리스트 모두 첫 항목을 맨 끝으로
  await dragFirstToLast(page, warmUl);
  await dragFirstToLast(page, mainUl);
  await dragFirstToLast(page, coolUl);

  const warmAfter = await names(warmUl);
  const mainAfter = await names(mainUl);
  const coolAfter = await names(coolUl);
  expect(warmAfter).toEqual([warmBefore[1], warmBefore[2], warmBefore[0]]);
  expect(mainAfter).toEqual([mainBefore[1], mainBefore[2], mainBefore[0]]);
  expect(coolAfter).toEqual([coolBefore[1], coolBefore[2], coolBefore[0]]);

  // 운동 시작 → 가이드를 끝까지 넘기며 종류별 순서 수집
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.locator("div.z-40").last();
  const seq: { kind: string; name: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const name = (await overlay.locator("h2").first().innerText().catch(() => "")).trim();
    const badges = await overlay.locator("span").allInnerTexts().catch(() => []);
    const kind = badges.find((b) => ["워밍업", "마무리", "본운동"].includes(b.trim()))?.trim() ?? "";
    if (kind && name) seq.push({ kind, name });
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    const last = await page.getByRole("button", { name: "완료하고 종료" }).count();
    await next.click();
    await page.waitForTimeout(420);
    if (last) break;
  }

  const guideByKind = (k: string) => seq.filter((s) => s.kind === k).map((s) => s.name);
  // 가이드 이름은 깔끔(부위배지 없음) → 리스트 이름의 접두사로 비교
  const matches = (guide: string[], list: string[]) =>
    guide.length === list.length && guide.every((g, i) => list[i]?.startsWith(g));

  expect(matches(guideByKind("워밍업"), warmAfter), "워밍업 순서 불일치").toBe(true);
  expect(matches(guideByKind("본운동"), mainAfter)).toBe(true);
  expect(matches(guideByKind("마무리"), coolAfter)).toBe(true);
});
