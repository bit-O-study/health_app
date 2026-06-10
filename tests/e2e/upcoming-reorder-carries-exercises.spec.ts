import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀 가드: "다가오는 7일"에서 카드를 드래그해 일차 순서를 바꾸면, 본운동도 카드를
// 따라 옮겨져야 한다. 특히 0·1일차가 같은 부위(하체)지만 운동이 다를 때, 1일차 카드를
// 오늘(0일차)로 끌면 1일차 하체 운동(스쿼트/레그프레스/레그컬)이 오늘 화면에 떠야 한다.
// (과거엔 부위 배열만 저장하고 운동 day_index 는 안 옮겨, 같은 부위면 아무 변화가
//  없었다 — 드래그해도 오늘 운동이 그대로였다.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

// 본운동 행(li h3)에는 이름 뒤에 부위·기구 배지가 붙어 한 덩어리로 온다
// (예: "루마니안 데드리프트전신햄스트링바벨") → 부분일치로 본다.
/** 본운동 행 텍스트들 — 워밍업/마무리는 h4 라서 안 잡힌다. */
async function mainNames(page: Page): Promise<string[]> {
  return (await page.locator("li h3").allInnerTexts()).map((s) => s.trim());
}
const has = (names: string[], kw: string) => names.some((n) => n.includes(kw));

/** 0·1일차 모두 하체 — 0일차=RDL, 1일차=스쿼트/레그프레스/레그컬 로 시드 후 /routine. */
async function setupTwoLowerDays(page: Page): Promise<string> {
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["lower"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'lower', 0, 'rdl', 'barbell', 4, 8, 60),
       (${uid}, 1, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
       (${uid}, 1, 'lower', 1, 'leg-press', 'machine', 4, 10, 100),
       (${uid}, 1, 'lower', 2, 'leg-curl', 'machine', 4, 12, 30)`,
    [email],
  );
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return email;
}

/** 화면 위치 from 카드를 to 카드 위로 끌어다 놓는다(포인터 드래그 시뮬). */
async function dragCard(page: Page, from: number, to: number) {
  const src = page.locator(`[data-day-index="${from}"]`);
  const dst = page.locator(`[data-day-index="${to}"]`);
  await src.scrollIntoViewIfNeeded();
  const a = await src.boundingBox();
  const b = await dst.boundingBox();
  if (!a || !b) throw new Error("카드 위치를 찾지 못함");
  const sx = a.x + a.width / 2;
  const sy = a.y + a.height / 2;
  const tx = b.x + b.width / 2;
  const ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(100);
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(sx + ((tx - sx) * i) / 12, sy + ((ty - sy) * i) / 12, {
      steps: 2,
    });
    await page.waitForTimeout(35);
  }
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(1500);
}

test("다가오는 7일 드래그 → 본운동이 카드를 따라 오늘로 이동한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await setupTwoLowerDays(page);

  // 드래그 전: 오늘 본운동 = 루마니안 데드리프트만 (스쿼트 없음)
  const before = await mainNames(page);
  expect(has(before, "루마니안 데드리프트")).toBe(true);
  expect(has(before, "스쿼트")).toBe(false);

  // 순서 변경(본운동·하단 7일 모두)은 '편집하기' 모드에서만 가능.
  await page.getByRole("button", { name: "편집하기" }).click();

  // 0일차 카드(오늘)와 1일차 카드를 바꾼다 → 0번 카드를 1번 위치로.
  await dragCard(page, 0, 1);

  // 드래그 후: 1일차였던 하체 운동이 오늘로 와야 한다.
  await expect(page.locator("li h3", { hasText: "스쿼트" })).toBeVisible({
    timeout: 10_000,
  });
  const after = await mainNames(page);
  expect(has(after, "스쿼트")).toBe(true);
  expect(has(after, "레그프레스")).toBe(true);
  expect(has(after, "레그컬")).toBe(true);
  expect(has(after, "루마니안 데드리프트")).toBe(false);

  // DB 확인: 0일차(오늘) 하체가 스쿼트/레그프레스/레그컬로 바뀜
  const d0 = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
       where user_id=${uid} and day_index=0 and focus='lower' order by position`,
    [email],
  );
  expect(d0.map((r) => r.exercise_id)).toEqual([
    "squat",
    "leg-press",
    "leg-curl",
  ]);
});

test("편집모드가 아니면 순서 변경이 막힌다(그립 없음 + 드래그 무시)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await setupTwoLowerDays(page);

  // 편집하기 누르기 전: 순서변경 그립 핸들이 어디에도 없어야 한다(본운동·컨디셔닝).
  await expect(
    page.locator('[title="잡고 위·아래로 순서 변경"]'),
  ).toHaveCount(0);

  // 그래도 하단 7일 카드를 끌어본다 → 편집모드가 아니라 무시돼야 한다.
  await dragCard(page, 0, 1);

  // 오늘 본운동은 그대로 RDL (스쿼트 안 옴), DB 도 0일차=rdl 유지.
  const after = await mainNames(page);
  expect(has(after, "루마니안 데드리프트")).toBe(true);
  expect(has(after, "스쿼트")).toBe(false);
  const d0 = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
       where user_id=${uid} and day_index=0 and focus='lower' order by position`,
    [email],
  );
  expect(d0.map((r) => r.exercise_id)).toEqual(["rdl"]);
});