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

test("기록 목록에서 잘못 담은 잔만 골라 지운다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });

  // 담은 게 없으면 목록 자체가 없다 — 빈 목록을 두지 않는다.
  await expect(card.getByTestId("water-entries")).toHaveCount(0);

  await card.getByRole("button", { name: "+200ml 컵" }).click();
  await expect(card).toHaveAttribute("data-ml", "200", { timeout: 8000 });
  await card.getByRole("button", { name: "+500ml 생수" }).click();
  await expect(card).toHaveAttribute("data-ml", "700", { timeout: 8000 });

  // 🔴 예전엔 '마지막 것 되돌리기' 뿐이었고 그 기억은 화면을 떠나면 사라졌다.
  //    이제 기록이 남으므로 **원하는 줄**을 골라 지운다.
  const list = card.getByTestId("water-entries");
  await expect(list.getByRole("listitem")).toHaveCount(2, { timeout: 8000 });
  await list.getByRole("button", { name: /200ml 기록 지우기/ }).click();
  await expect(card).toHaveAttribute("data-ml", "500", { timeout: 8000 });
  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(500);

  await list.getByRole("button", { name: /500ml 기록 지우기/ }).click();
  await expect(card).toHaveAttribute("data-ml", "0", { timeout: 8000 });
  await expect(card.getByTestId("water-entries")).toHaveCount(0);
  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(0);
});

test("컵에 없는 양은 직접 입력해 담는다 — 그리고 새로고침해도 남는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const card = page.getByTestId("water-card");
  await expect(card).toBeVisible({ timeout: 8000 });

  await card.getByTestId("water-custom-open").click();
  await card.getByRole("spinbutton", { name: "마신 양(ml)" }).fill("620");
  await card.getByTestId("water-custom-add").click();

  await expect(card).toHaveAttribute("data-ml", "620", { timeout: 8000 });
  await expect.poll(() => waterMl(email), { timeout: 10000 }).toBe(620);

  // 기록에 '언제 얼마' 가 남는다.
  await page.reload({ waitUntil: "networkidle" });
  const back = page.getByTestId("water-card");
  await expect(back).toHaveAttribute("data-ml", "620", { timeout: 8000 });
  await expect(back.getByTestId("water-entries")).toContainText("620ml");
  await expect(back.getByTestId("water-since")).toBeVisible();
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
