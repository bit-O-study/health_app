import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { openApp } from "./helpers/launcher";
import { dbQuery, hasDb } from "./helpers/db";

// 식단 기능: 하단 탭 → /diet, 끼니별(아침/점심/저녁/간식) 음식 추가/수정/삭제, 칼로리 합계.
// 삭제·수정은 인라인이 아니라 '게시물 상세'에 들어가 '…' 메뉴로 한다(밀리그램 스타일).

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("런처에서 식단 앱으로 들어가 음식 추가→칼로리 반영→게시물 상세에서 삭제", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 런처(홈)에서 '식단' 앱으로 들어간다 — 하단바는 이제 앱마다 다르다(2026-09-20).
  await openApp(page, "식단");
  await page.waitForURL("**/diet", { timeout: 10000 });
  await page.waitForTimeout(500);

  // 점심(두 번째 끼니) 추가 → 검색 → 항목 선택 → 양(100g) 담기
  await page.getByRole("button", { name: "추가" }).nth(1).click();
  await page.getByLabel("음식 검색").fill("닭가슴살");
  await page.getByRole("button").filter({ hasText: "닭가슴살" }).first().click();
  await page.getByRole("button", { name: "담기" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "닫기" }).click();
  await page.waitForTimeout(800);

  // 화면에 닭가슴살 + 점심 소계(110 kcal) 표시
  await expect(page.getByText("닭가슴살").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("110 kcal")).toBeVisible();

  // DB 에 저장됐는지 — 화면이 먼저 바뀌고 DB 가 조금 늦게 따라오므로 될 때까지 다시 읽는다.
  const readFoodLogs = () =>
    dbQuery<{ name: string; meal: string; kcal: string }>(
      `select name, meal, kcal::text from public.food_logs where user_id=${uid}`,
      [email],
    );
  await expect.poll(async () => (await readFoodLogs()).length, { timeout: 15_000 }).toBe(1);
  const rows = await readFoodLogs();
  expect(rows.length).toBe(1);
  expect(rows[0].name).toBe("닭가슴살");
  expect(rows[0].meal).toBe("lunch");

  // 게시물(점심) 카드 탭 → 상세 → '더보기(…)' → '삭제' → 확인
  await page.getByRole("button", { name: "점심 게시물 열기" }).click();
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 확인" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("닭가슴살")).toHaveCount(0);
  const after = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.food_logs where user_id=${uid}`,
    [email],
  );
  expect(after[0].n).toBe("0");
});

test("게시물 상세에서 음식 수정(칼로리 변경)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await openApp(page, "식단");
  await page.waitForURL("**/diet", { timeout: 10000 });
  await page.waitForTimeout(500);

  // 아침(첫 끼니)에 직접 입력으로 한 건 추가
  await page.getByRole("button", { name: "추가" }).first().click();
  await page
    .getByLabel("아침 추가")
    .getByRole("button", { name: "직접 입력" })
    .click();
  await page.getByPlaceholder("예: 직접 만든 도시락").fill("오트밀");
  await page.getByPlaceholder("0").fill("300");
  await page.getByRole("button", { name: "추가하기" }).click();
  // 인서트가 끝나(낙관적 tempId→실제 id 확정) 저장된 뒤에 수정한다.
  // (실사용도 담기→상세→수정까지 수 초 걸려 항상 저장 완료 상태다. 여기서 바로
  //  수정하면 아직 tempId 라 서버 업데이트가 0행이 되는 테스트 전용 레이스가 난다.)
  await expect
    .poll(
      async () =>
        (
          await dbQuery(
            `select 1 from public.food_logs where user_id=${uid} and name='오트밀'`,
            [email],
          )
        ).length,
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  // 게시물 상세 → 더보기 → 수정 → 음식 탭 → 칼로리 450 으로 저장
  await page.getByRole("button", { name: "아침 게시물 열기" }).click();
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByRole("button", { name: "오트밀 수정" }).click();
  const kcal = page.getByLabel("칼로리(kcal)");
  await kcal.fill("450");
  await page.getByRole("button", { name: "저장" }).click();

  // 고정 대기(1초)로는 모자랄 때가 있다 — 바뀔 때까지 다시 읽는다.
  const readEdited = () =>
    dbQuery<{ name: string; kcal: string }>(
      `select name, kcal::text from public.food_logs where user_id=${uid}`,
      [email],
    );
  await expect
    .poll(async () => Number((await readEdited())[0]?.kcal), { timeout: 15_000 })
    .toBe(450);
  const rows = await readEdited();
  expect(rows.length).toBe(1);
  expect(rows[0].name).toBe("오트밀");
});

test("직접 입력으로 음식 종류(category) 지정해 추가", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await openApp(page, "식단");
  await page.waitForURL("**/diet", { timeout: 10000 });
  await page.waitForTimeout(500);

  // 아침(첫 끼니) 추가 → '직접 입력' 탭
  await page.getByRole("button", { name: "추가" }).first().click();
  await page
    .getByLabel("아침 추가")
    .getByRole("button", { name: "직접 입력" })
    .click();

  await page.getByPlaceholder("예: 직접 만든 도시락").fill("엄마표 도시락");
  await page.getByRole("combobox").selectOption({ label: "고기·계란" });
  await page.getByPlaceholder("0").fill("550");
  await page.getByRole("button", { name: "추가하기" }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText("엄마표 도시락").first()).toBeVisible({ timeout: 8000 });

  const rows = await dbQuery<{ name: string; category: string; meal: string }>(
    `select name, category, meal from public.food_logs where user_id=${uid}`,
    [email],
  );
  expect(rows.length).toBe(1);
  expect(rows[0].name).toBe("엄마표 도시락");
  expect(rows[0].category).toBe("고기·계란");
  expect(rows[0].meal).toBe("breakfast");
});

test("🔴 담자마자 바로 수정해도 저장된다 — 임시 id 로 새는 구멍", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  await expect(page.getByTestId("quick-add")).toBeVisible({ timeout: 8000 });

  await page.getByRole("button", { name: "추가" }).first().click();
  await page
    .getByLabel("아침 추가")
    .getByRole("button", { name: "직접 입력" })
    .click();
  await page.getByPlaceholder("예: 직접 만든 도시락").fill("급한오트밀");
  await page.getByPlaceholder("0").fill("300");
  await page.getByRole("button", { name: "추가하기" }).click();

  // 🔴 여기서 **기다리지 않는다.** 예전엔 인서트 응답이 오기 전에 수정하면
  //    화면은 저장한 것처럼 보이는데 서버는 0행만 바뀌고 값이 그대로였다.
  await page.getByRole("button", { name: "아침 게시물 열기" }).click();
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByRole("button", { name: "급한오트밀 수정" }).click();
  await page.getByLabel("칼로리(kcal)").fill("450");
  await page.getByRole("button", { name: "저장" }).click();

  await expect
    .poll(
      async () =>
        Number(
          (
            await dbQuery<{ kcal: string }>(
              `select kcal::text from public.food_logs
                where user_id=${uid} and name='급한오트밀'`,
              [email],
            )
          )[0]?.kcal,
        ),
      { timeout: 20_000 },
    )
    .toBe(450);
});
