import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// AI 식단 사진 담기:
//  1) 인식된 음식은 "한 번만" 등록된다(중복 담기 회귀 방지).
//  2) 분석에 쓴 사진이 그 끼니의 게시물 사진(meal_photos)으로도 함께 등록된다.
//
// AI 스캔은 결정적이어야 하므로 MEAL_SCAN_STUB=1 로 dev 서버를 띄운 경우에만 돈다:
//   MEAL_SCAN_STUB=1 pnpm dev        (다른 터미널)
//   MEAL_SCAN_STUB=1 pnpm test:e2e
const STUB_ON = process.env.MEAL_SCAN_STUB === "1";
const STUB_FOOD = "스캔테스트밥"; // meal-scan-actions 의 테스트 시드와 일치 (meal: lunch)

// 1x1 JPEG — resizeImageForAI 가 디코드만 하면 되고, 업로드 원본으로도 쓰인다.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD/2Q==",
  "base64",
);

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("AI 식단 사진: 음식은 1번만 담기고, 분석 사진이 끼니 사진으로 등록된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.skip(!STUB_ON, "needs MEAL_SCAN_STUB=1 dev server (deterministic scan)");

  const email = await signUpAndOnboard(page);

  // 이 테스트 계정을 디버그 계정으로 등록해 AI 사진 탭이 보이게 한다(끝나면 원복).
  await dbQuery(
    `insert into public.app_settings(key, value)
       values ('debug.accounts', jsonb_build_array($1::text))
     on conflict (key) do update
       set value = coalesce(public.app_settings.value, '[]'::jsonb) || jsonb_build_array($1::text)`,
    [email],
  );

  try {
    await page.getByRole("link", { name: "식단" }).click();
    await page.waitForURL("**/diet", { timeout: 10_000 });
    await page.waitForTimeout(500);

    // 점심(스텁의 meal) 추가 → AI 사진 탭
    await page.getByRole("button", { name: "추가" }).nth(1).click();
    await page.getByRole("button", { name: /AI 사진/ }).click();

    await page
      .locator('input[type="file"][accept="image/*"]')
      .last()
      .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

    await page
      .getByRole("button", { name: new RegExp(STUB_FOOD) })
      .waitFor({ timeout: 30_000 });

    await page.getByRole("button", { name: "선택한 음식 담기" }).click();

    // 담기 직후 2초 동안 화면에 STUB_FOOD 는 늘 1개 이하(일시적 중복도 불가).
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(150);
      expect(await page.getByText(STUB_FOOD).count()).toBeLessThanOrEqual(1);
    }
    await page.waitForTimeout(1500);

    // DB: 음식은 정확히 1행
    const foods = await dbQuery<{ n: string }>(
      `select name as n from public.food_logs where user_id=${uid} and name=$2`,
      [email, STUB_FOOD],
    );
    expect(foods.length).toBe(1);

    // DB: 분석 사진이 점심 게시물 사진으로 등록됨(업로드는 백그라운드라 잠깐 대기)
    let photos: unknown[] = [];
    for (let i = 0; i < 10 && photos.length === 0; i++) {
      photos = await dbQuery(
        `select 1 from public.meal_photos where user_id=${uid} and meal='lunch'`,
        [email],
      );
      if (photos.length === 0) await page.waitForTimeout(500);
    }
    expect(photos.length).toBeGreaterThanOrEqual(1);
  } finally {
    await dbQuery(
      `update public.app_settings
         set value = coalesce(
           (select jsonb_agg(e) from jsonb_array_elements_text(value) e where e <> $1),
           '[]'::jsonb)
       where key='debug.accounts'`,
      [email],
    );
  }
});
