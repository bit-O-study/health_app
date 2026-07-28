import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 회귀: 신고 처리에서 "작성자 정지"를 눌러도 그 신고가 닫히면 안 된다.
 * (예전엔 정지 시 그 유저의 신고를 전부 resolved 로 만들어서 이어서 게시글/댓글
 *  삭제를 못 했다.) 정지 → 댓글 삭제까지 연달아 되는지 확인한다.
 */
test.describe.configure({ timeout: 180_000 });

test.skip(!hasDb, "needs .env.test.local DB creds");

test("정지해도 신고가 안 닫히고 댓글 삭제까지 가능", async ({ browser }) => {
  // ── 신고 대상 회원 + 글/댓글/신고 시드 ──
  const tctx = await browser.newContext();
  const tpage = await tctx.newPage();
  const targetEmail = await signUpAndOnboard(tpage);
  const [{ id: targetUserId }] = await dbQuery<{ id: string }>(
    `select id from auth.users where lower(email) = lower($1)`,
    [targetEmail],
  );

  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts(user_id, visibility, author_name, photo_url, caption)
     values($1, 'public', 'E2E대상', 'https://example.com/e2e.png', 'E2E 신고 대상 글')
     returning id`,
    [targetUserId],
  );
  const [{ id: commentId }] = await dbQuery<{ id: string }>(
    `insert into public.community_comments(post_id, user_id, author_name, body)
     values($1, $2, 'E2E대상', 'E2E 신고 대상 댓글')
     returning id`,
    [postId, targetUserId],
  );

  // ── 신고자(= 대상 본인 계정으로 넣어도 관리자 화면 검증엔 무관하지만, 실제와 같게
  //    별도 신고자 없이 DB 로 직접 신고 행을 넣는다) ──
  const reason = `E2E-신고사유-${Date.now()}`;
  await dbQuery(
    `insert into public.post_reports(target_kind, target_id, target_user_id,
       target_author, target_preview, reporter_id, reason)
     values('community_comment', $1, $2, 'E2E대상', 'E2E 신고 대상 댓글', $2, $3)`,
    [commentId, targetUserId, reason],
  );

  // ── 관리자 ──
  const actx = await browser.newContext({
    viewport: { width: 900, height: 920 },
  });
  const apage = await actx.newPage();
  const adminEmail = await signUpAndOnboard(apage);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [adminEmail.toLowerCase()],
  );

  // prompt(정지 일수) / confirm(삭제) 자동 응답.
  apage.on("dialog", (d) => d.accept(d.type() === "prompt" ? "7" : ""));

  await apage.goto("/admin/reports", { waitUntil: "networkidle" });
  const row = apage.locator("li", { hasText: reason });
  await expect(row).toBeVisible();

  // ① 작성자 정지 — 신고는 그대로 열려 있어야 한다.
  await row.getByRole("button", { name: "작성자 정지" }).click();
  await expect(row.getByText("정지 중", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  await expect(row.getByRole("button", { name: "처리완료" })).toBeVisible();
  const suspended = await dbQuery<{ suspended_until: string | null }>(
    `select suspended_until from public.profiles where user_id = $1`,
    [targetUserId],
  );
  expect(suspended[0]?.suspended_until).not.toBeNull();

  // ② 정지 뒤에도 댓글 삭제가 가능해야 한다(이게 막혀 있던 버그).
  const del = row.getByRole("button", { name: "댓글 삭제" });
  await expect(del).toBeEnabled();
  await del.click();
  await expect(row.getByText("댓글 삭제됨")).toBeVisible({ timeout: 15_000 });

  const left = await dbQuery<{ id: string }>(
    `select id from public.community_comments where id = $1`,
    [commentId],
  );
  expect(left).toHaveLength(0);

  // 글은 남아 있어야 한다(댓글 신고는 댓글만 지운다).
  const posts = await dbQuery<{ id: string }>(
    `select id from public.community_posts where id = $1`,
    [postId],
  );
  expect(posts).toHaveLength(1);

  // 정리 — 시드한 글 제거(신고 행은 cascade 아님이라 함께 삭제).
  await dbQuery(`delete from public.post_reports where target_id = $1`, [
    commentId,
  ]);
  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);

  await tctx.close();
  await actx.close();
});