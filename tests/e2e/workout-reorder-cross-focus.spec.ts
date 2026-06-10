import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 멀티 부위(가슴 + 팔) 일자에서 부위 경계를 넘어 순서를 바꿔도(예: 팔 해머컬을
// 가슴 벤치프레스보다 앞/뒤로) 운동 시작 가이드 큐가 그 순서를 따라야 한다.
// 같은 부위끼리만 순서가 바뀌고 부위가 다르면 무시되던 버그의 회귀 테스트.
// 워밍업/마무리(컨디셔닝)도 같은 화면에서 함께 재정렬·검증한다.

const GRIP = '[title="잡고 위·아래로 순서 변경"]';
const names = async (ul: Locator) =>
  (await ul.locator("li h3, li h4").allInnerTexts()).map((s) =>
    s.split("\n")[0].trim(),
  );

// grips[fromIndex] 핸들을 잡아 grips[toIndex] 위치로 드래그.
async function dragRow(
  page: Page,
  ul: Locator,
  fromIndex: number,
  toIndex: number,
) {
  const grips = ul.locator(GRIP);
  await grips.nth(0).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(150);
  const bFrom = await grips.nth(fromIndex).boundingBox();
  const bTo = await grips.nth(toIndex).boundingBox();
  const sx = bFrom!.x + bFrom!.width / 2;
  const sy = bFrom!.y + bFrom!.height / 2;
  const ty = bTo!.y + bTo!.height / 2 + (toIndex < fromIndex ? -22 : 22);
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

test("부위가 달라도(가슴+팔) 순서 변경이 운동 시작 가이드에 반영된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 컨디셔닝(워밍업/마무리) 기본값 + 전 부위 본운동 등록
  await seedRecommendedExercises(page);

  // 오늘을 '가슴 + 팔' 멀티 부위로 강제(daily_plan 오버라이드) — 결정적 재현용.
  // focus 오름차순 정렬이라 기본 그룹 순서는 [팔(해머컬), 가슴(벤치프레스)].
  const insert = `insert into public.daily_plan
      (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
    values
      ((select id from auth.users where lower(email)=lower($1)),
        (now() at time zone 'Asia/Seoul')::date, 'arm', 0, 'hammer-curl', 'dumbbell', 3, 10, 12),
      ((select id from auth.users where lower(email)=lower($1)),
        (now() at time zone 'Asia/Seoul')::date, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40)`;
  await dbQuery(insert, [email]);

  // "/" 는 모드 선택 랜딩이라 운동 화면은 /routine 으로 직접 이동.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // ul.space-y-2 순서: [워밍업, 본운동, 마무리]
  const warmUl = page.locator("ul.space-y-2").nth(0);
  const mainUl = page.locator("ul.space-y-2").nth(1);
  const coolUl = page.locator("ul.space-y-2").nth(2);

  // 본운동은 2개(해머컬, 벤치프레스) — 부위가 다름
  await expect(mainUl.locator(GRIP)).toHaveCount(2);
  const mainBefore = await names(mainUl);
  expect(mainBefore.length).toBe(2);
  // 워밍업/마무리도 2개 이상이어야 의미 있는 재정렬
  const warmCount = await warmUl.locator(GRIP).count();
  const coolCount = await coolUl.locator(GRIP).count();
  expect(warmCount).toBeGreaterThanOrEqual(2);
  expect(coolCount).toBeGreaterThanOrEqual(2);
  const warmBefore = await names(warmUl);
  const coolBefore = await names(coolUl);

  // 부위 경계를 넘어 본운동 2번째(벤치프레스)를 맨 위로
  await dragRow(page, mainUl, 1, 0);
  const mainAfter = await names(mainUl);
  expect(mainAfter).toEqual([mainBefore[1], mainBefore[0]]);

  // 워밍업/마무리: 첫 항목을 맨 끝으로
  await dragRow(page, warmUl, 0, warmCount - 1);
  await dragRow(page, coolUl, 0, coolCount - 1);
  const warmAfter = await names(warmUl);
  const coolAfter = await names(coolUl);
  expect(warmAfter).toEqual([
    ...warmBefore.slice(1),
    warmBefore[0],
  ]);
  expect(coolAfter).toEqual([
    ...coolBefore.slice(1),
    coolBefore[0],
  ]);

  // 운동 시작 → 가이드 큐를 끝까지 넘기며 종류별 순서 수집
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.locator("div.z-40").last();
  const seq: { kind: string; name: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const name = (
      await overlay.locator("h2").first().innerText().catch(() => "")
    ).trim();
    const badges = await overlay
      .locator("span")
      .allInnerTexts()
      .catch(() => []);
    const kind =
      badges
        .find((b) => ["워밍업", "마무리", "본운동"].includes(b.trim()))
        ?.trim() ?? "";
    if (kind && name) seq.push({ kind, name });
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    const last = await page
      .getByRole("button", { name: "완료하고 종료" })
      .count();
    await next.click();
    await page.waitForTimeout(420);
    if (last) break;
  }

  const guideByKind = (k: string) =>
    seq.filter((s) => s.kind === k).map((s) => s.name);
  const matches = (guide: string[], list: string[]) =>
    guide.length === list.length && guide.every((g, i) => list[i]?.startsWith(g));

  // 핵심: 본운동이 부위 경계를 넘어 바뀐 순서(벤치프레스 → 해머컬)를 따른다.
  // 리스트 이름엔 부위 배지가 붙으므로 가이드(클린 이름)와는 접두사로 비교.
  expect(
    matches(guideByKind("본운동"), mainAfter),
    "본운동 부위 교차 순서 불일치",
  ).toBe(true);
  // 워밍업·마무리도 바뀐 순서를 따른다
  expect(matches(guideByKind("워밍업"), warmAfter), "워밍업 순서 불일치").toBe(
    true,
  );
  expect(matches(guideByKind("마무리"), coolAfter), "마무리 순서 불일치").toBe(
    true,
  );
});
