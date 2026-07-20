import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 홈: 오늘 식단 기준 필요 운동량(원형 그래프) + 탄단지 기준 더 먹어야 하는 양.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("식단 기록이 없으면 홈에 '기록 없음' 안내가 나오고, 누르면 식단탭으로 이동한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const card = page.getByRole("link", { name: /오늘 식단 기록이 없어요/ });
  await expect(card).toBeVisible({ timeout: 8000 });
  await card.click();
  await expect(page).toHaveURL(/\/diet/, { timeout: 10000 });
});

test("식단 기록이 있으면 필요 운동량과 탄단지 남은 양을 보여준다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 온보딩 값(키175/몸무게75/남자) 기준 목표 kcal=2550, 단백질120g/탄수358g/지방71g.
  // 500kcal(단백질50/탄수60/지방10)만 먹었으면 목표 이내 → 남은 양: 탄수298/단백70/지방61.
  await dbQuery(
    `insert into public.food_logs
       (user_id, for_date, meal, position, name, kcal, protein_g, carbs_g, fat_g)
     values (${uid}, ${today}, 'breakfast', 0, '테스트 식단', 500, 50, 60, 10)`,
    [email],
  );

  await page.goto("/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await expect(page.getByText("목표 이내")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("298g")).toBeVisible();
  await expect(page.getByText("70g")).toBeVisible();
  await expect(page.getByText("61g")).toBeVisible();
});