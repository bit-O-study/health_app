import { expect, test, type Browser } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 4-2(2026-09-30) — 답글 · 답변 채택 · 질문 운동 태그 · 작성자 프로필 시트.
 * DB 규칙은 tests/be/community-4-2.test.ts(라이브 DB, 롤백).
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function account(browser: Browser, nickname: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = await createOnboardedAccount(page);
  await dbQuery(`update public.profiles set nickname = $2 where user_id = ${uid}`, [email, nickname]);
  return { ctx, page, email };
}

test("🔴 답변 → 질문자가 답글·채택 → 자동 해결됨, 답변자는 답글·채택 알림을 받고 눌러서 내 답변으로", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const asker = await account(browser, "E2E질문자");
  const answerer = await account(browser, "E2E답변자");
  const title = `E2E 채택 ${Date.now()}`;
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, post_type, title, visibility, author_name) values (${uid}, 'question', $2, 'public', 'E2E질문자') returning id`,
    [asker.email, title],
  );

  // 답변자 — 답변.
  await answerer.page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await answerer.page.getByPlaceholder("답변 달기…").fill("견갑을 모으고 내리세요");
  await answerer.page.getByRole("button", { name: "등록" }).click();
  await expect(answerer.page.getByText("견갑을 모으고 내리세요")).toBeVisible({ timeout: 15_000 });

  // 질문자 — 답글.
  const p = asker.page;
  await p.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  const answer = p.locator('[id^="c-"]').filter({ hasText: "견갑을 모으고 내리세요" });
  await answer.getByRole("button", { name: "답글" }).click();
  await expect(p.getByTestId("reply-to")).toContainText("@E2E답변자에게 답글");
  await p.getByPlaceholder("@E2E답변자에게 답글…").fill("해보니 훨씬 편해요");
  await p.getByRole("button", { name: "등록" }).click();
  await expect(p.locator('[data-reply="true"]').filter({ hasText: "해보니 훨씬 편해요" })).toBeVisible({ timeout: 15_000 });
  await expect(p.getByTestId("reply-to")).toHaveCount(0);

  // 질문자 — 채택 → 해결됨 + 위에 고정.
  await answer.getByRole("button", { name: "채택", exact: true }).click();
  await expect(p.getByTestId("question-status")).toHaveText("해결됨", { timeout: 15_000 });
  await expect(p.getByTestId("accepted-answer")).toContainText("견갑을 모으고 내리세요");
  await expect(answer).toContainText("채택됨");
  // 다시 들어와도 유지.
  await p.reload({ waitUntil: "networkidle" });
  await expect(p.getByTestId("accepted-answer")).toContainText("견갑을 모으고 내리세요");

  // 답변자 — 알림 두 개(답글·채택), 채택 알림을 누르면 내 답변으로.
  const a = answerer.page;
  await a.goto("/community/notifications", { waitUntil: "networkidle" });
  await expect(a.getByRole("link", { name: /E2E질문자님이 내 댓글에 답글을 남겼어요/ })).toBeVisible();
  await a.getByRole("link", { name: /E2E질문자님이 내 답변을 채택했어요/ }).click();
  await expect(a).toHaveURL(new RegExp(`/community/${postId}#c-`));
  await expect(a.locator('[data-highlight="true"]')).toContainText("견갑을 모으고 내리세요", { timeout: 15_000 });

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
  await asker.ctx.close();
  await answerer.ctx.close();
});

test("질문 운동 태그 — 쓸 때 태그를 달면 카드에 보이고 태그로 찾아진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  const tag = `E2E태그${Date.now() % 100000}`;
  await page.goto("/community/questions", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "질문하기" }).click();
  const dialog = page.getByRole("dialog", { name: "질문하기" });
  await dialog.getByLabel("질문 제목").fill("태그 달린 질문");
  await dialog.getByLabel("운동 태그").fill(`#${tag}`);
  await dialog.getByRole("button", { name: "질문 올리기" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  const saved = await dbQuery<{ exercise_tag: string }>(`select exercise_tag from public.community_posts where exercise_tag = $1`, [tag]);
  expect(saved).toHaveLength(1); // '#' 은 떼고 저장

  await page.goto(`/community/questions?q=${encodeURIComponent(tag)}`, { waitUntil: "networkidle" });
  await expect(page.locator("li").filter({ hasText: "태그 달린 질문" })).toContainText(`#${tag}`);
  await dbQuery(`delete from public.community_posts where exercise_tag = $1`, [tag]);
});

test("🔴 이름을 누르면 프로필 시트 — 내가 볼 수 있는 글만, 시트에서 차단하면 목록에서 사라진다", async ({ browser, page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const author = await account(browser, "E2E프로필");
  await author.ctx.close();
  const caption = `E2E 프로필 공개 ${Date.now()}`;
  // 공개 글 1 + 그 사람만 있는 그룹 전용 글 1(나는 그 그룹이 아니다 → 안 보여야 한다).
  const [{ id: groupId }] = await dbQuery<{ id: string }>(
    `insert into public.groups (name, owner_id) values ('E2E 프로필 그룹', ${uid}) returning id`,
    [author.email],
  );
  await dbQuery(`insert into public.group_members (group_id, user_id) values ($2, ${uid}) on conflict do nothing`, [author.email, groupId]);
  await dbQuery(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption) values (${uid}, 'public', 'E2E프로필', 'https://example.com/pub.png', $2)`,
    [author.email, caption],
  );
  await dbQuery(
    `insert into public.community_posts (user_id, visibility, group_id, author_name, photo_url, caption) values (${uid}, 'group', $2, 'E2E프로필', 'https://example.com/grp.png', 'E2E 그룹 전용')`,
    [author.email, groupId],
  );

  await createOnboardedAccount(page);
  await page.goto(`/community?q=${encodeURIComponent(caption)}`, { waitUntil: "networkidle" });
  const card = page.locator("li").filter({ hasText: caption });
  await card.getByRole("button", { name: "E2E프로필 프로필 보기" }).click();
  const sheet = page.getByRole("dialog", { name: "E2E프로필 프로필" });
  await expect(sheet.getByTestId("author-stats")).toContainText("이번 달 글 1개");
  await expect(sheet.getByTestId("author-posts").locator("li")).toHaveCount(1);
  // 카드를 누른 것으로 치지 않는다(상세로 안 감).
  await expect(page).toHaveURL(/\/community\?q=/);

  await sheet.getByRole("button", { name: "차단하기" }).click();
  await sheet.getByRole("button", { name: "차단", exact: true }).click();
  await expect(sheet).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("li").filter({ hasText: caption })).toHaveCount(0, { timeout: 15_000 });

  await dbQuery(`delete from public.community_posts where user_id = ${uid}`, [author.email]);
  await dbQuery(`delete from public.groups where id = $1`, [groupId]);
});
