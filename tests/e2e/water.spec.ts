import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { openApp } from "./helpers/launcher";
import { dbQuery, hasDb } from "./helpers/db";

// 수분 섭취 — 식단 화면에서 컵을 누르면 그만큼 쌓이고, DB 에 하루 한 행으로 남는다.
// 여기서 확인하는 것 셋:
//  ① 컵을 누르면 화면과 DB 가 같이 늘어난다
//  ② 연타해도 잔이 사라지지 않는다(합산은 DB 함수 한 문장)
//  ③ 되돌리기가 마지막 잔만 빼고, 0 아래로는 안 내려간다

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function waterMl(email: string): Promise<number> {
  const rows = await dbQuery<{ ml: number }>(
    `select ml from public.water_logs where user_id=${uid}
      and for_date=(now() at time zone 'Asia/Seoul')::date`,
    [email],
  );
  return rows.length === 0 ? 0 : Number(rows[0].ml);
}

test("컵을 누르면 수분이 쌓이고 DB 에 남는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await openApp(page, "식단");
  await page.waitForURL("**/diet", { timeout: 10000 });

  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });
  await expect(card).toHaveAttribute("data-ml", "0");

  await card.getByRole("button", { name: "+350ml 텀블러" }).click();
  await expect(card).toHaveAttribute("data-ml", "350", { timeout: 8000 });
  await expect(card).toContainText("350ml");

  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(350);

  // 새로고침해도 남아 있다(화면 상태가 아니라 기록이다).
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("water-card")).toHaveAttribute("data-ml", "350", {
    timeout: 8000,
  });
});

test("연타해도 잔이 사라지지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });

  // 요청이 겹치도록 기다리지 않고 연속으로 누른다.
  const cup = card.getByRole("button", { name: "+200ml 컵" });
  for (let i = 0; i < 5; i += 1) await cup.click();

  await expect(card).toHaveAttribute("data-ml", "1000", { timeout: 10000 });
  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(1000);
});

test("되돌리기는 마지막 잔만 빼고, 0 아래로 안 내려간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });

  // 담은 게 없으면 되돌리기 버튼 자체가 없다 — 눌러도 아무 일 없는 버튼을 두지 않는다.
  await expect(card.getByRole("button", { name: /되돌리기/ })).toHaveCount(0);

  await card.getByRole("button", { name: "+200ml 컵" }).click();
  await expect(card).toHaveAttribute("data-ml", "200", { timeout: 8000 });
  await card.getByRole("button", { name: "+500ml 생수" }).click();
  await expect(card).toHaveAttribute("data-ml", "700", { timeout: 8000 });

  // 마지막에 담은 500만 빠진다.
  await card.getByRole("button", { name: /되돌리기/ }).click();
  await expect(card).toHaveAttribute("data-ml", "200", { timeout: 8000 });
  await card.getByRole("button", { name: /되돌리기/ }).click();
  await expect(card).toHaveAttribute("data-ml", "0", { timeout: 8000 });

  // 되돌릴 게 없으면 버튼이 다시 사라진다.
  await expect(card.getByRole("button", { name: /되돌리기/ })).toHaveCount(0);
  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(0);
});

test("목표는 체중에서 계산한다 — 70kg면 2.3L", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`update public.profiles set weight_kg=70 where user_id=${uid}`, [
    email,
  ]);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });
  await expect(card).toContainText("/ 2.3L");
});
