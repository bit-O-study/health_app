import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 관리자 콘솔의 "크론 실행" 탭 — 크론이 돌긴 도는지, 몇 명에게 갔는지, 왜 죽었는지.
// (workout-inactivity 가 vercel.json 등록 누락으로 한 번도 안 돌았는데 아무 신호가
//  없었던 게 이 화면을 만든 이유 — 실행 기록이 없으면 그 사실이 보여야 한다.)

async function signUpAsAdmin(page: Parameters<typeof signUpAndOnboard>[0]) {
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [email.toLowerCase()],
  );
  return email;
}

test("실행 기록이 없으면 '실행 기록 없음' 으로 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAsAdmin(page);

  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "크론 실행" }).click();
  await expect(page).toHaveURL(/\/admin\/crons$/);
  await expect(page.getByRole("heading", { name: "크론 실행" })).toBeVisible();

  // 등록된 크론 3개가 모두 카드로 있어야 한다(안 돈 크론이 목록에서 빠지면 안 된다).
  await expect(page.getByRole("heading", { name: /하루 리마인더/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /주간 그룹 MVP/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /운동 무활동 감지/ }),
  ).toBeVisible();
});

test("실행 기록이 있으면 상태·소요·발송 수와 실패 사유가 보인다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAsAdmin(page);

  const marker = `e2e-cron-${Date.now()}`;
  await dbQuery(
    `insert into public.cron_runs
       (name, started_at, finished_at, duration_ms, status, scanned, targeted, sent, deduped, failed, reason)
     values
       ('daily-reminders', now(), now(), 2500, 'ok', 10, 4, 4, 1, 0, null),
       ('weekly-group-mvp', now(), now(), 1200, 'error', 0, 0, 0, 0, 0, $1)`,
    [marker],
  );

  try {
    await page.goto("/admin/crons", { waitUntil: "networkidle" });

    // 최근 실행 표에 방금 넣은 두 행이 뜬다.
    await expect(page.getByText("daily-reminders").first()).toBeVisible();
    await expect(page.getByText("2.5초").first()).toBeVisible();
    // 실패 사유는 요약 카드와 표 양쪽에서 확인 가능해야 한다.
    await expect(page.getByText(marker).first()).toBeVisible();
    await expect(page.getByText("실패").first()).toBeVisible();
  } finally {
    await dbQuery(`delete from public.cron_runs where reason = $1`, [marker]);
    await dbQuery(
      `delete from public.cron_runs where name = 'daily-reminders' and duration_ms = 2500`,
    );
  }
});

test("관리자가 아니면 크론 화면에 못 들어간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page); // admins 에 넣지 않는다

  // 미들웨어가 일반 사용자를 메인으로 돌려보낸다(관리자 경로 차단).
  const res = await page.request.get("/admin/crons", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/");

  await page.goto("/admin/crons", { waitUntil: "networkidle" });
  await expect(page).not.toHaveURL(/\/admin\/crons$/);
  await expect(page.getByRole("heading", { name: "크론 실행" })).toHaveCount(0);
});
