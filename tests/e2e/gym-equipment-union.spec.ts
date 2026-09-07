import { expect, test, type Page } from "@playwright/test";

import {
  freshEmail,
  signUpAndOnboard,
  TEST_PASSWORD,
} from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test.describe.configure({ timeout: 240_000 });

async function signUpToGymStep(page: Page) {
  const email = freshEmail();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.fill("#name", "합집합검증");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "남자" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator('input[placeholder="170"]').fill("175");
  await page.locator('input[placeholder="65"]').fill("75");
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: /현재 유지/ }).click();
  await page.getByRole("button", { name: "다음" }).click();
  return email;
}

test("개인 기구는 분리하고 같은 헬스장 기본값은 회원 합집합으로 제공한다", async ({
  page,
  browser,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const gymName = `합집합 헬스 ${Date.now()}`;
  const gymAddress = "서울 테스트구 10";

  const firstEmail = await signUpAndOnboard(page);
  await page.goto("/settings/gym", { waitUntil: "networkidle" });
  // 회원이 없는 새 헬스장은 일반 헬스장 기구가 기본 선택된다.
  await expect(page.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("헬스장 이름").fill(gymName);
  await page.getByLabel("주소 (선택)").fill(gymAddress);
  const selected = page.locator('button[aria-pressed="true"]');
  while ((await selected.count()) > 0) await selected.first().click();
  await page.getByRole("button", { name: "바벨", exact: true }).click();
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await page.waitForURL("**/settings");

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const secondEmail = await signUpToGymStep(secondPage);
  await secondPage.getByLabel("헬스장 이름").fill(gymName);
  const existing = secondPage.getByRole("button", { name: new RegExp(gymName) });
  await expect(existing).toBeVisible();
  await existing.click();
  // 첫 회원의 개인 목록(현재 합집합)이 가입 기본값으로 들어온다.
  await expect(secondPage.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(secondPage.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await secondPage.getByRole("button", { name: "덤벨", exact: true }).click();
  await secondPage.getByRole("button", { name: "추천 루틴 보기" }).click();
  await secondPage.getByRole("button", { name: "저장" }).last().click();
  await secondPage.waitForURL((url) => ["/", "/routine"].includes(new URL(url).pathname));

  const personal = await dbQuery<{
    email: string;
    gym_equipment_ids: string[];
  }>(
    `select lower(users.email) email, profiles.gym_equipment_ids
       from public.profiles as profiles
       join auth.users as users on users.id=profiles.user_id
      where profiles.user_id in (${uid}, (select id from auth.users where lower(email)=lower($2)))
      order by email`,
    [firstEmail, secondEmail],
  );
  const byEmail = new Map(personal.map((row) => [row.email, row.gym_equipment_ids]));
  expect(byEmail.get(firstEmail)).toEqual(["barbell"]);
  expect(new Set(byEmail.get(secondEmail))).toEqual(new Set(["barbell", "dumbbell"]));

  const aggregate = await dbQuery<{ equipment_ids: string[] }>(
    `select gyms.equipment_ids
       from public.gyms as gyms
       join public.profiles as profiles on profiles.gym_id=gyms.id
      where profiles.user_id=${uid}`,
    [firstEmail],
  );
  expect(new Set(aggregate[0].equipment_ids)).toEqual(new Set(["barbell", "dumbbell"]));

  // 합집합에 덤벨이 추가돼도 첫 회원의 개인 설정은 덮어쓰지 않는다.
  await page.goto("/settings/gym", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await secondContext.close();
});
