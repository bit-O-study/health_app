import { expect, test, type Browser } from "@playwright/test";

import { createOnboardedAccount, seedRecommendedExercises } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 4-1(2026-09-30) — 오늘 이 운동 해보기 · 알림 → 그 댓글 · 글쓰기 임시 저장 · 댓글 단 글.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function writer(browser: Browser, nickname: string) {
  const ctx = await browser.newContext();
  const email = await createOnboardedAccount(await ctx.newPage());
  await ctx.close();
  await dbQuery(`update public.profiles set nickname = $2 where user_id = ${uid}`, [email, nickname]);
  return email;
}

test("🔴 오늘 이 운동 해보기 — 고른 운동이 오늘만 담기고, 영구 루틴은 그대로(원칙 2)", async ({ browser, page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const author = await writer(browser, "E2E기록자");
  const caption = `E2E 따라하기 ${Date.now()}`;
  const snapshot = {
    date: "2026-09-30",
    durationSec: 3000,
    exercises: [
      { name: "케이블 킥백", sets: 3, exerciseId: "cable-kickback", equipment: "cable" },
      { name: "컨센트레이션 컬", sets: 3, exerciseId: "concentration-curl" },
      { name: "힙 어브덕션", sets: 3, exerciseId: "hip-abduction" },
      { name: "세상에 없는 운동", sets: 2 },
    ],
  };
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, workout_snapshot, caption)
     values (${uid}, 'public', 'E2E기록자', $2, $3) returning id`,
    [author, JSON.stringify(snapshot), caption],
  );

  const me = await createOnboardedAccount(page);
  await seedRecommendedExercises(page);
  const routineBefore = await dbQuery<{ h: string }>(
    `select md5(coalesce(string_agg(r::text, '|' order by r.id), '')) h from public.routine_exercises r where r.user_id = ${uid}`,
    [me],
  );
  const routineRowBefore = await dbQuery<{ h: string }>(`select md5(r::text) h from public.user_routines r where r.user_id = ${uid}`, [me]);

  await page.goto(`/community?q=${encodeURIComponent(caption)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "오늘 이 운동 해보기" }).click();
  const sheet = page.getByRole("dialog", { name: "오늘 운동에 담기" });
  const items = sheet.getByTestId("try-workout-items");
  await expect(items.getByRole("checkbox")).toHaveCount(4);
  await expect(items.getByRole("checkbox", { name: /세상에 없는 운동/ })).toBeDisabled();
  await expect(items.getByRole("checkbox", { name: /세상에 없는 운동/ })).toContainText("담을 수 없어요");
  const checked = await items.locator('[role="checkbox"][aria-checked="true"]').allTextContents();
  expect(checked.length).toBeGreaterThan(0);
  await sheet.getByRole("button", { name: /오늘만 담기$/ }).click();
  await expect(sheet.getByRole("status")).toHaveText(`오늘 운동에 ${checked.length}개 담았어요`, { timeout: 20_000 });

  // 오늘(daily_plan)에 들어갔고
  const today = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.daily_plan where user_id = ${uid} and for_date = (now() at time zone 'Asia/Seoul')::date`,
    [me],
  );
  const ids = today.map((r) => r.exercise_id);
  const wanted = snapshot.exercises.filter((e) => e.exerciseId && checked.some((t) => t.includes(e.name))).map((e) => e.exerciseId!);
  for (const id of wanted) expect(ids).toContain(id);
  // 🔴 영구 루틴은 그대로
  const routineAfter = await dbQuery<{ h: string }>(
    `select md5(coalesce(string_agg(r::text, '|' order by r.id), '')) h from public.routine_exercises r where r.user_id = ${uid}`,
    [me],
  );
  expect(routineAfter[0].h).toBe(routineBefore[0].h);
  const routineRowAfter = await dbQuery<{ h: string }>(`select md5(r::text) h from public.user_routines r where r.user_id = ${uid}`, [me]);
  expect(routineRowAfter[0].h).toBe(routineRowBefore[0].h);

  // 오늘 운동 화면에 보인다.
  await sheet.getByRole("link", { name: "오늘 운동 보러 가기" }).click();
  await expect(page).toHaveURL(/\/routine/);
  const firstName = snapshot.exercises.find((e) => e.exerciseId === wanted[0])!.name;
  await expect(page.getByText(firstName).first()).toBeVisible({ timeout: 15_000 });

  // 다시 열면 방금 담은 운동은 '이미 있어요'.
  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "오늘 이 운동 해보기" }).click();
  await expect(page.getByTestId("try-workout-items").getByRole("checkbox", { name: new RegExp(firstName) })).toContainText("이미 있어요");

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});

test("🔴 알림을 누르면 그 댓글로 — 오래된 댓글(50개 밖)도 찾아서 표시", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const me = await createOnboardedAccount(page);
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E', 'https://example.com/e2e.png', 'E2E 댓글 위치') returning id`,
    [me],
  );
  // 다른 사람이 60개 — 가장 오래된 게 '앵커-01'. (댓글마다 알림이 트리거로 생긴다.)
  await dbQuery(
    `with other as (select id from auth.users where lower(email) <> lower($1) order by created_at limit 1)
     insert into public.community_comments (post_id, user_id, author_name, body, created_at)
     select $2, (select id from other), '이웃', '앵커-' || lpad(g::text, 2, '0'), now() - make_interval(mins => 70 - g)
       from generate_series(1, 60) g`,
    [me, postId],
  );
  await page.goto("/community/notifications", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /앵커-01/ }).click();
  await expect(page).toHaveURL(new RegExp(`/community/${postId}#c-`));
  const target = page.locator('[data-highlight="true"]');
  await expect(target).toContainText("앵커-01", { timeout: 20_000 });
  await expect(target).toBeInViewport();

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});

test("글쓰기 임시 저장 — 닫았다 열면 이어 쓰기, 새로 쓰기는 지운다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  await page.goto("/community/questions", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "질문하기" }).click();
  let dialog = page.getByRole("dialog", { name: "질문하기" });
  await dialog.getByLabel("질문 제목").fill("데드리프트 허리가 뻐근해요");
  await dialog.getByLabel("질문 내용").fill("60kg 3세트째부터요");
  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toHaveCount(0);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "질문하기" }).click();
  dialog = page.getByRole("dialog", { name: "질문하기" });
  await expect(dialog.getByTestId("compose-draft")).toContainText("데드리프트 허리가 뻐근해요");
  await dialog.getByRole("button", { name: "이어 쓰기" }).click();
  await expect(dialog.getByLabel("질문 제목")).toHaveValue("데드리프트 허리가 뻐근해요");
  await expect(dialog.getByLabel("질문 내용")).toHaveValue("60kg 3세트째부터요");
  await dialog.getByRole("button", { name: "닫기" }).click();

  await page.getByRole("button", { name: "질문하기" }).click();
  dialog = page.getByRole("dialog", { name: "질문하기" });
  await dialog.getByRole("button", { name: "새로 쓰기" }).click();
  await expect(dialog.getByTestId("compose-draft")).toHaveCount(0);
  await expect(dialog.getByLabel("질문 제목")).toHaveValue("");
  await dialog.getByRole("button", { name: "닫기" }).click();
  await page.getByRole("button", { name: "질문하기" }).click();
  await expect(page.getByRole("dialog", { name: "질문하기" }).getByTestId("compose-draft")).toHaveCount(0);
});

test("댓글 단 글 — 내가 댓글 단 남의 글이 내 글 › 댓글 단 글에 모인다", async ({ browser, page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const author = await writer(browser, "E2E글쓴이");
  const caption = `E2E 댓글 단 글 ${Date.now()}`;
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E글쓴이', 'https://example.com/e2e.png', $2) returning id`,
    [author, caption],
  );
  await createOnboardedAccount(page);
  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("댓글 달기…").fill("멋져요");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByText("멋져요")).toBeVisible({ timeout: 15_000 });

  await page.goto("/community/mine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "댓글 단 글" }).click();
  await expect(page).toHaveURL(/\/community\/mine\?view=commented/);
  await expect(page.getByRole("button", { name: "댓글 단 글" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("li").filter({ hasText: caption })).toBeVisible();

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});
