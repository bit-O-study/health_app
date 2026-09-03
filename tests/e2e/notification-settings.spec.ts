import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 사용자별 알림 설정(로드맵 3.1) — 종류별 동의 + 야간 방해 금지.
//
// 지금까지 알림은 '전부 아니면 전무' 였다. 밤 11시에 "운동을 종료하시겠습니까?" 가
// 뜨면 사람은 알림 자체를 꺼 버리고, 그러면 정작 필요한 것도 못 받는다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("설정에서 들어가 종류를 끄면 바로 저장된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /알림 설정/ }).click();
  await expect(page).toHaveURL(/\/settings\/notifications$/);
  await expect(page.getByRole("heading", { name: "알림 설정" })).toBeVisible();

  // 행이 없어도 화면은 기본값(전부 켜짐)으로 뜬다 — 마이그레이션 없이 동작한다.
  const dietToggle = page.getByRole("switch", { name: "식단 리마인더" });
  await expect(dietToggle).toHaveAttribute("aria-checked", "true");

  await dietToggle.click();
  await expect(dietToggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("저장했습니다.")).toBeVisible({ timeout: 10_000 });

  // DB 에 그 종류만 꺼진 행이 생긴다(나머지는 켜진 채).
  const [row] = await dbQuery<{ diet: boolean; workout: boolean }>(
    `select diet_reminder as diet, workout_reminder as workout
       from public.notification_preferences where user_id=${uid}`,
    [email],
  );
  expect(row.diet).toBe(false);
  expect(row.workout).toBe(true);

  // 새로고침해도 유지된다.
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("switch", { name: "식단 리마인더" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("야간 방해 금지는 기본으로 켜져 있고 시간을 바꿀 수 있다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/settings/notifications", { waitUntil: "networkidle" });
  const quiet = page.getByRole("switch", { name: "야간 방해 금지" });
  await expect(quiet).toHaveAttribute("aria-checked", "true");

  // 기본 22:00 ~ 07:00.
  const start = page.getByLabel("방해 금지 시작 시각");
  await expect(start).toHaveValue("22");
  await expect(page.getByLabel("방해 금지 종료 시각")).toHaveValue("7");

  await start.selectOption("23");
  await expect(page.getByText("저장했습니다.")).toBeVisible({ timeout: 10_000 });

  const [row] = await dbQuery<{ s: number; e: number; on: boolean }>(
    `select quiet_start_hour as s, quiet_end_hour as e, quiet_hours as on
       from public.notification_preferences where user_id=${uid}`,
    [email],
  );
  expect(Number(row.s)).toBe(23);
  expect(Number(row.e)).toBe(7);
  expect(row.on).toBe(true);
});

test("방해 금지를 끄면 시간 선택이 사라진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/notifications", { waitUntil: "networkidle" });
  await expect(page.getByLabel("방해 금지 시작 시각")).toBeVisible();
  await page.getByRole("switch", { name: "야간 방해 금지" }).click();
  await expect(page.getByLabel("방해 금지 시작 시각")).toHaveCount(0);
});

test("남의 설정은 못 읽고 못 쓴다(RLS)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await page.goto("/settings/notifications", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "식단 리마인더" }).click();
  await expect(page.getByText("저장했습니다.")).toBeVisible({ timeout: 10_000 });

  const { openAuthenticatedDbClient } = await import("./helpers/db");
  const client = await openAuthenticatedDbClient(email, "notif-prefs-rls");
  try {
    // 자기 것은 보인다.
    const mine = await client.query(
      `select user_id from public.notification_preferences`,
    );
    expect(mine.rows).toHaveLength(1);
    // 남의 이름으로는 못 쓴다.
    await expect(
      client.query(
        `insert into public.notification_preferences (user_id) values ($1::uuid)`,
        ["00000000-0000-4000-8000-000000000000"],
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  } finally {
    await client.query("rollback");
    await client.end();
  }
});
