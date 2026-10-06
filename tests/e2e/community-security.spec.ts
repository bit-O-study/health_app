import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 보안 1단계(2026-09-30) — 신고 대상은 서버가 원본에서 찾는다.
 * DB 직접 쓰기 공격은 tests/be/community-security.test.ts(라이브 DB, 롤백)가 본다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("🔴 신고하면 대상 사용자·작성자·미리보기가 원본 글에서 채워진다", async ({ page, browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  // 글쓴이(A) — 다른 브라우저 컨텍스트에서 가입.
  const ctxA = await browser.newContext();
  const emailA = await createOnboardedAccount(await ctxA.newPage());
  await ctxA.close();
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E작성자', 'https://example.com/e2e.png', 'E2E 신고 보안 확인 글') returning id`,
    [emailA],
  );

  // 신고자(B).
  const emailB = await createOnboardedAccount(page);
  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  // 상세 화면의 신고는 오른쪽 위 ‘⋮’(더보기) 안에 있다.
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "신고" }).first().click();
  await page.getByRole("button", { name: "스팸/광고" }).click();
  await expect(page.getByText("신고가 접수되었어요")).toBeVisible({ timeout: 15_000 });

  const rows = await dbQuery<{ target_user_id: string; target_author: string; target_preview: string; mine: boolean; is_a: boolean }>(
    `select r.target_user_id::text, r.target_author, r.target_preview,
            r.reporter_id = (select id from auth.users where lower(email)=lower($2)) as mine,
            r.target_user_id = ${uid} as is_a
       from public.post_reports r where r.target_id = $3`,
    [emailA, emailB, postId],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].is_a).toBe(true);
  expect(rows[0].mine).toBe(true);
  expect(rows[0].target_author).toBe("E2E작성자");
  expect(rows[0].target_preview).toBe("E2E 신고 보안 확인 글");

  // 같은 글을 또 신고하면 DB 가 막고, 신고는 여전히 1건.
  await page.reload({ waitUntil: "networkidle" });
  // 상세 화면의 신고는 오른쪽 위 ‘⋮’(더보기) 안에 있다.
  await page.getByRole("button", { name: "더보기" }).click();
  await page.getByRole("button", { name: "신고" }).first().click();
  // 오류는 브라우저 알림창이 아니라 신고 시트 안에 뜬다(커뮤니티 2단계).
  let sawDialog = false;
  page.on("dialog", (d) => {
    sawDialog = true;
    void d.dismiss();
  });
  await page.getByRole("button", { name: "스팸/광고" }).click();
  await expect(page.getByTestId("report-error")).toContainText("이미 신고한 게시물이에요", { timeout: 15_000 });
  expect(sawDialog).toBe(false);
  const again = await dbQuery<{ n: number }>(`select count(*)::int n from public.post_reports where target_id = $1`, [postId]);
  expect(again[0].n).toBe(1);

  await dbQuery(`delete from public.post_reports where target_id = $1`, [postId]);
});
