import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// #13/#15: 체형 추이그래프를 지표별(몸무게·근육량 등)로 분리해 보여준다.
// #14: 체형 기록은 (인라인 폼이 아니라) 버튼을 눌러 기록한다.
// 날짜 표시: 그래프·기록 목록 모두 '언제 잰 값인지'가 보여야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

/** 서울 기준 오늘 날짜 조각(화면 라벨과 맞춰 비교하려고). */
function seoulToday() {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = ymd.split("-");
  return { short: `${Number(m)}/${Number(d)}`, full: `${y}. ${Number(m)}. ${Number(d)}.` };
}

test("체형정보: 지표별 추이그래프 + 기록은 버튼(#13/14/15)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 체형 기록 2건(몸무게·근육량 변화) — 추이가 그려지게.
  await dbQuery(
    `insert into public.weight_logs
       (user_id, weight_kg, height_cm, body_fat_pct, muscle_mass_kg, created_at)
     values
       (${uid}, 72, 175, 22, 30, now() - interval '7 days'),
       (${uid}, 70, 175, 20, 32, now())`,
    [email],
  );

  await page.goto("/settings/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // #13/#15: 지표별 개별 차트 — 몸무게·근육량 추이가 각각 있어야 한다.
  await expect(page.getByRole("img", { name: "몸무게 추이" })).toBeVisible();
  await expect(page.getByRole("img", { name: "근육량 추이" })).toBeVisible();

  // 날짜: 그래프에 최근 측정일이, 기록 목록에 날짜(연도까지)가 보여야 한다.
  const { short, full } = seoulToday();
  await expect(page.getByText(`${short} 측정`).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "측정 기록" })).toBeVisible();
  await expect(page.getByText(full).first()).toBeVisible();

  // #14: '체형 기록' 은 버튼 — 누르면 입력 모달이 열린다(모달의 '닫기' 버튼으로 확인).
  const recordBtn = page.getByRole("button", { name: "체형 기록" });
  await expect(recordBtn).toBeVisible();
  await recordBtn.click();
  await expect(
    page.getByRole("button", { name: "닫기" }),
  ).toBeVisible({ timeout: 8000 });

  // 캘린더 '현재 체중' 카드도 언제 잰 값인지 같이 보여준다.
  await page.goto("/calendar", { waitUntil: "networkidle" });
  const weightCard = page
    .locator("div")
    .filter({ hasText: /^현재 체중/ })
    .first();
  await expect(weightCard).toContainText(`${short} 측정`);
});
