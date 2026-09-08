import { expect, test, type Page } from "@playwright/test";

import {
  freshEmail,
  seedRecommendedExercises,
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

test("검색에 없는 헬스장은 직접 입력하고 기본 보유기구로 시작한다", async ({
  page,
}) => {
  const gymName = `검색없는 헬스 ${Date.now()}`;

  await signUpAndOnboard(page);
  await page.goto("/settings/gym", { waitUntil: "networkidle" });

  // 헬스장을 고르기 전에는 기구 목록이 아예 뜨지 않는다 — 기본값이 뭔지 아직 모른다.
  await expect(page.getByRole("button", { name: "바벨", exact: true })).toHaveCount(
    0,
  );

  await page.getByLabel("헬스장 검색").fill(gymName);
  await expect(
    page.getByText("검색 결과가 없어요", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "직접 헬스장 입력하기" }).click();

  // 검색어가 이름으로 넘어와 있고, 주소만 직접 넣으면 된다.
  await expect(page.getByLabel("헬스장 이름")).toHaveValue(gymName);
  await page.getByLabel("주소").fill("서울 테스트구 99");
  await page.getByRole("button", { name: "이 헬스장으로 진행" }).click();

  // 정보가 없는 헬스장이라 평균 한국 헬스장 기본 보유기구로 시작한다.
  await expect(
    page.getByText("아직 등록된 정보가 없어", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

/**
 * 케이블·머신이 하나도 없는 헬스장의 회원에게 케이블·머신 전용 운동을 추천하면,
 * 사용자는 그 칸을 매번 손으로 갈아야 한다.
 *
 * 5분할(고급)로 가입한다 — 초급 기본 루틴은 전신 4개(스쿼트·벤치·로우·OHP)뿐이라
 * 전부 바벨로 되고, 그러면 이 검사가 **아무것도 검증하지 못한다.**
 * 어깨·팔·하체가 들어와야 페이스풀·푸시다운·레그프레스가 후보에 오른다.
 */
test("내 헬스장에 없는 기구의 운동은 추천에 안 들어온다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const gymName = `프리웨이트 헬스 ${Date.now()}`;
  const email = freshEmail();

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.fill("#name", "기구검증");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "남자" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator("section button.w-full").last().click(); // 고급 → 5분할
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator('input[placeholder="170"]').fill("175");
  await page.locator('input[placeholder="65"]').fill("75");
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: /현재 유지/ }).click();
  await page.getByRole("button", { name: "다음" }).click();

  // 가입 단계에서 바로 헬스장을 등록한다 — 바벨·덤벨만 있는 곳.
  await page.getByLabel("헬스장 검색").fill(gymName);
  await page.getByRole("button", { name: "직접 헬스장 입력하기" }).click();
  await page.getByLabel("헬스장 이름").fill(gymName);
  await page.getByLabel("주소").fill("서울 테스트구 1");
  await page.getByRole("button", { name: "이 헬스장으로 진행" }).click();
  const selected = page.locator('button[aria-pressed="true"]');
  while ((await selected.count()) > 0) await selected.first().click();
  await page.getByRole("button", { name: "바벨", exact: true }).click();
  await page.getByRole("button", { name: "덤벨", exact: true }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "저장" }).last().click();
  await page.waitForURL((url) => ["/", "/routine"].includes(new URL(url).pathname));

  /** 이 헬스장에선 못 하는 운동들(전부 케이블/머신 전용). */
  const IMPOSSIBLE = ["face-pull", "triceps-pushdown", "leg-press", "hip-adduction"];

  async function planRows() {
    return dbQuery<{ exercise_id: string; focus: string }>(
      `select exercise_id, focus from public.routine_exercises where user_id = ${uid}`,
      [email],
    );
  }

  // ① 루틴 저장의 '추천으로 채우기' 경로(routine actions) — 빈 슬롯 자동 채우기.
  //    (가입 마법사는 fillMode 를 넘기지 않아 운동을 안 채운다 — 설정에서 저장해야 돈다.)
  await page.goto("/settings/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "저장" }).last().click();
  await page.waitForURL((url) => ["/", "/routine"].includes(new URL(url).pathname));

  const afterFill = await planRows();
  expect(afterFill.length).toBeGreaterThan(0);
  // 이 부위들이 실제로 루틴에 있어야 위 목록이 후보에 오른다(검사가 헛돌지 않게).
  const focuses = new Set(afterFill.map((r) => r.focus));
  for (const f of ["shoulder", "arm", "lower"]) expect(focuses).toContain(f);
  for (const id of IMPOSSIBLE) {
    expect(afterFill.map((r) => r.exercise_id)).not.toContain(id);
  }

  // ② /plan '추천으로 등록' 경로(plan actions) — 전체 재등록
  await seedRecommendedExercises(page);
  const afterPlan = await planRows();
  expect(afterPlan.length).toBeGreaterThan(0);
  for (const id of IMPOSSIBLE) {
    expect(afterPlan.map((r) => r.exercise_id)).not.toContain(id);
  }
});

test("개인 기구는 분리하고 같은 헬스장 기본값은 회원 합집합으로 제공한다", async ({
  page,
  browser,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const gymName = `합집합 헬스 ${Date.now()}`;
  const gymAddress = "서울 테스트구 10";

  const firstEmail = await signUpAndOnboard(page);
  await page.goto("/settings/gym", { waitUntil: "networkidle" });

  // 검색에 안 나오는 새 헬스장 → 직접 입력.
  await page.getByLabel("헬스장 검색").fill(gymName);
  await page.getByRole("button", { name: "직접 헬스장 입력하기" }).click();
  await page.getByLabel("헬스장 이름").fill(gymName);
  await page.getByLabel("주소").fill(gymAddress);
  await page.getByRole("button", { name: "이 헬스장으로 진행" }).click();

  // 회원이 없는 새 헬스장은 일반 헬스장 기구가 기본 선택된다.
  await expect(page.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const selected = page.locator('button[aria-pressed="true"]');
  while ((await selected.count()) > 0) await selected.first().click();
  await page.getByRole("button", { name: "바벨", exact: true }).click();
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await page.waitForURL("**/settings");

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const secondEmail = await signUpToGymStep(secondPage);
  // 두 번째 회원은 이름으로 검색해서 고른다 — 주소는 결과에서 따라온다.
  await secondPage.getByLabel("헬스장 검색").fill(gymName);
  const existing = secondPage.getByRole("button", { name: new RegExp(gymName) });
  await expect(existing).toBeVisible();
  await expect(existing).toContainText(gymAddress);
  await existing.click();
  // 첫 회원의 개인 목록(현재 합집합)이 가입 기본값으로 들어온다.
  await expect(
    secondPage.getByText("회원들이 등록한 기구를 모아", { exact: false }),
  ).toBeVisible();
  await expect(secondPage.getByRole("button", { name: "바벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(secondPage.getByRole("button", { name: "덤벨", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await secondPage.getByRole("button", { name: "덤벨", exact: true }).click();
  await secondPage.getByRole("button", { name: "다음" }).click();
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

  // 검색으로 고르면 같은 헬스장 한 행에 모인다(중복 등록으로 합집합이 갈라지지 않는다).
  const gymRows = await dbQuery<{ id: string }>(
    `select id from public.gyms where name=$1`,
    [gymName],
  );
  expect(gymRows).toHaveLength(1);

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
