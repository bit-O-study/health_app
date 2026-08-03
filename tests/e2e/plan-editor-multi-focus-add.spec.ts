import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const restOfWeek = [
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

async function setCustomWeek(email: string, firstDay: string[]) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify([firstDay, ...restOfWeek])],
  );
}

test("복합 일차는 선택한 이두 슬롯에 운동 행을 추가한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await setCustomWeek(email, ["shoulder", "biceps"]);

  await page.goto("/plan", { waitUntil: "networkidle" });

  const day = page.locator('[data-plan-day-index="0"]');
  await day.getByRole("button", { name: "운동 추가" }).click();

  const chooser = day.getByRole("group", {
    name: "1일차 추가할 부위",
  });
  await expect(chooser).toBeVisible();

  await chooser.getByRole("button", { name: "팔 운동 추가" }).click();

  await expect(chooser).toHaveCount(0);
  await expect(day.getByTestId("plan-row-0:arm-0")).toBeVisible();
  await expect(day.getByTestId("plan-row-0:shoulder-0")).toHaveCount(0);
});

test("단일 부위 일차는 선택 메뉴 없이 바로 운동 행을 추가한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await setCustomWeek(email, ["biceps"]);

  await page.goto("/plan", { waitUntil: "networkidle" });

  const day = page.locator('[data-plan-day-index="0"]');
  await day.getByRole("button", { name: "운동 추가" }).click();

  await expect(
    day.getByRole("group", { name: "1일차 추가할 부위" }),
  ).toHaveCount(0);
  await expect(day.getByTestId("plan-row-0:arm-0")).toBeVisible();
});
