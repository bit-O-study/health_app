import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 2단계(2026-09-30) — 앱 안 삭제 확인 · 댓글 페이지 · 브라우저 알림창 없음.
 * DB 쪽(검색·도배 막기)은 tests/be/community-phase2.test.ts 가 본다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("🔴 댓글은 최신 50개부터, '이전 댓글 더 보기'로 나머지 — 개수는 전체", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E', 'https://example.com/e2e.png', 'E2E 댓글 페이지') returning id`,
    [email],
  );
  // 55개 — 가장 오래된 게 '댓글-01'.
  await dbQuery(
    `insert into public.community_comments (post_id, user_id, author_name, body, created_at)
     select $2, ${uid}, 'E2E', '댓글-' || lpad(g::text, 2, '0'), now() - make_interval(mins => 60 - g)
       from generate_series(1, 55) g`,
    [email, postId],
  );

  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await expect(page.getByText("댓글-55")).toBeVisible();
  await expect(page.getByText("댓글-05", { exact: true })).toHaveCount(0);
  await expect(page.getByText("55", { exact: true })).toBeVisible(); // 댓글 수는 전체
  await page.getByTestId("load-older-comments").click();
  await expect(page.getByText("댓글-01", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("load-older-comments")).toHaveCount(0);

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});

test("🔴 글 삭제는 앱 안 확인창으로 — 취소하면 그대로, 삭제하면 목록으로(브라우저 confirm 없음)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E', 'https://example.com/e2e.png', 'E2E 삭제 확인') returning id`,
    [email],
  );
  let sawDialog = false;
  page.on("dialog", (d) => {
    sawDialog = true;
    void d.dismiss();
  });

  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "삭제" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("이 게시물을 삭제할까요?");
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
  expect((await dbQuery(`select 1 from public.community_posts where id = $1`, [postId])).length).toBe(1);

  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await expect(page).toHaveURL(/\/community\/?(\?.*)?$/, { timeout: 15_000 });
  expect((await dbQuery(`select 1 from public.community_posts where id = $1`, [postId])).length).toBe(0);
  expect(sawDialog).toBe(false);
});
