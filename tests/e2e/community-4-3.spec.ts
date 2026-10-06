import { expect, test, type Browser } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 4-3(2026-09-30) — 금칙어(막고 안내) · 영상·루틴 저장 · 댓글 공감.
 * DB 규칙(직접 쓰기 차단·앱과 같은 판정)은 tests/be/community-4-3.test.ts.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function writer(browser: Browser, nickname: string) {
  const ctx = await browser.newContext();
  const email = await createOnboardedAccount(await ctx.newPage());
  await ctx.close();
  await dbQuery(`update public.profiles set nickname = $2 where user_id = ${uid}`, [email, nickname]);
  return email;
}

test("🔴 금칙어 — 댓글·글쓰기 모두 올리기 전에 막고 이유를 알려 준다(저장 안 됨)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const me = await createOnboardedAccount(page);
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption) values (${uid}, 'public', 'E2E', 'https://example.com/e2e.png', 'E2E 금칙어') returning id`,
    [me],
  );
  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("댓글 달기…").fill("시 발 이게 되네");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByTestId("community-notice")).toContainText("욕설이나 비하 표현은 올릴 수 없어요");
  await expect(page.getByPlaceholder("댓글 달기…")).toHaveValue("시 발 이게 되네"); // 쓴 글은 그대로 남아 고칠 수 있다
  expect((await dbQuery(`select 1 from public.community_comments where post_id = $1`, [postId])).length).toBe(0);

  await page.goto("/community/questions", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "질문하기" }).click();
  const dialog = page.getByRole("dialog", { name: "질문하기" });
  await dialog.getByLabel("질문 제목").fill("같이 운동해요 오픈채팅 들어오세요");
  await dialog.getByRole("button", { name: "질문 올리기" }).click();
  await expect(dialog).toContainText("연락처나 채팅방 링크는 올릴 수 없어요");
  expect((await dbQuery(`select 1 from public.community_posts where title like '같이 운동해요%'`)).length).toBe(0);

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});

test("🔴 운동 영상·루틴 저장 → 내 글 › 저장한 글(글·영상 / 루틴)", async ({ browser, page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const author = await writer(browser, "E2E저장대상");
  const stamp = Date.now();
  const [{ id: reelId }] = await dbQuery<{ id: string }>(
    `insert into public.teaching_posts (user_id, visibility, author_name, exercise_tag, video_url, caption) values (${uid}, 'public', 'E2E저장대상', '스쿼트', 'https://example.com/e2e.mp4', $2) returning id`,
    [author, `E2E 저장 영상 ${stamp}`],
  );
  const routineTitle = `E2E 저장 루틴 ${stamp}`;
  await dbQuery(
    `insert into public.routine_shares (user_id, author_name, title, focus_blocks, exercises) values (${uid}, 'E2E저장대상', $2, '["back"]', $3)`,
    [author, routineTitle, JSON.stringify([{ exercise_id: "lat-pulldown", equipment: "cable", sets: 3, reps: 10, weight_kg: null, position: 0, focus: "back" }])],
  );

  await createOnboardedAccount(page);
  // 영상 저장.
  await page.goto(`/community/reel/${reelId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByTestId("community-notice")).toContainText("저장했어요", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "저장" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/community/saved", { waitUntil: "networkidle" });
  await expect(page.getByTestId("saved-kinds").getByRole("button", { name: "글·영상" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("li").filter({ hasText: `E2E 저장 영상 ${stamp}` })).toBeVisible();

  // 루틴 저장.
  await page.goto("/community/routines", { waitUntil: "networkidle" });
  await page.getByText(routineTitle).click();
  // (카드 이름에도 '저장'이 들어 있어 정확히 일치로 고른다.)
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "저장", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await dbQuery(`select 1 from public.routine_share_saves s join public.routine_shares r on r.id = s.share_id where r.title = $1`, [routineTitle])).length, {
      timeout: 15_000,
    })
    .toBe(1);
  await page.goto("/community/saved?kind=routine", { waitUntil: "networkidle" });
  await expect(page.getByTestId("saved-kinds").getByRole("button", { name: "루틴" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(routineTitle)).toBeVisible();

  await dbQuery(`delete from public.teaching_posts where id = $1`, [reelId]);
  await dbQuery(`delete from public.routine_shares where title = $1`, [routineTitle]);
});

test("댓글 공감 — 질문에서는 공감 많은 답변이 위로, 새로고침해도 유지", async ({ browser, page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const author = await writer(browser, "E2E답변러");
  const me = await createOnboardedAccount(page);
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, post_type, title, visibility, author_name) values (${uid}, 'question', 'E2E 공감 순서', 'public', 'E2E') returning id`,
    [me],
  );
  // 오래된 답 '첫째 답', 최신 답 '둘째 답' — 공감 없으면 최신 먼저.
  await dbQuery(
    `insert into public.community_comments (post_id, user_id, author_name, body, created_at) values
       ($2, ${uid}, 'E2E답변러', '첫째 답', now() - interval '10 minutes'),
       ($2, ${uid}, 'E2E답변러', '둘째 답', now() - interval '5 minutes')`,
    [author, postId],
  );
  await page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  const rows = page.locator('[id^="c-"]');
  await expect(rows.first()).toContainText("둘째 답");
  const first = rows.filter({ hasText: "첫째 답" });
  await first.getByRole("button", { name: "공감" }).click();
  await expect(first.getByRole("button", { name: "공감" })).toHaveAttribute("aria-pressed", "true");
  await expect(rows.first()).toContainText("첫째 답");
  await expect
    .poll(async () => (await dbQuery(`select 1 from public.comment_likes l join public.community_comments c on c.id = l.comment_id where c.post_id = $1`, [postId])).length, {
      timeout: 15_000,
    })
    .toBe(1);
  await page.reload({ waitUntil: "networkidle" });
  await expect(rows.first()).toContainText("첫째 답");
  await expect(rows.first().getByRole("button", { name: "공감" })).toHaveText("1");

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
});
