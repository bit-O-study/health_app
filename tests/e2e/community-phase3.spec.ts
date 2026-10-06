import { expect, test, type Browser } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 커뮤니티 3단계(2026-09-30) — 질문·답변 알림·저장·차단·운동 영상 공유 링크.
 * DB 규칙(숨김·차단 양방향·알림 트리거·좋아요 묶음)은 tests/be/community-phase3.test.ts 가 본다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function account(browser: Browser, nickname: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = await createOnboardedAccount(page);
  await dbQuery(`update public.profiles set nickname = $2 where user_id = ${uid}`, [email, nickname]);
  return { ctx, page, email };
}

test("🔴 질문을 올리고, 답변이 달리면 알림 → 눌러서 이동 → 해결됨 표시하면 '답변 기다리는' 에서 빠진다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const a = await account(browser, "E2E질문자");
  const b = await account(browser, "E2E답변자");
  const title = `E2E 질문 ${Date.now()}`;

  // A — 질문 탭에서 질문하기.
  await a.page.goto("/community/questions", { waitUntil: "networkidle" });
  await a.page.getByRole("button", { name: "질문하기" }).click();
  const dialog = a.page.getByRole("dialog", { name: "질문하기" });
  await dialog.getByLabel("질문 제목").fill(title);
  await dialog.getByLabel("질문 내용").fill("스쿼트 내려갈 때 무릎이 아파요");
  await dialog.getByRole("button", { name: "질문 올리기" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  const card = a.page.locator("li").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByTestId("question-status")).toHaveText("답변 기다리는 중");
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `select id from public.community_posts where title = $1 and post_type = 'question'`,
    [title],
  );
  // 질문은 피드(오운완)에는 안 섞인다.
  const feed = await dbQuery<{ id: string }>(`select 1 from public.community_posts where id = $1 and photo_url is null`, [postId]);
  expect(feed).toHaveLength(1);

  // B — 답변.
  await b.page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await b.page.getByPlaceholder("답변 달기…").fill("무게를 줄이고 발끝 방향을 맞춰 보세요");
  await b.page.getByRole("button", { name: "등록" }).click();
  await expect(b.page.getByText("발끝 방향을 맞춰 보세요")).toBeVisible({ timeout: 15_000 });

  // A — 종에 뱃지, 알림 목록에서 눌러 이동.
  await a.page.goto("/community", { waitUntil: "networkidle" });
  await expect(a.page.getByTestId("community-bell")).toHaveAccessibleName(/안 읽은 알림 1개/);
  await a.page.getByTestId("community-bell").click();
  const item = a.page.getByRole("link", { name: /E2E답변자님이 내 글에 댓글을 남겼어요/ });
  await expect(item).toBeVisible();
  await item.click();
  // 댓글 알림은 그 댓글 위치(#c-<id>)까지 간다(커뮤니티 4-1).
  await expect(a.page).toHaveURL(new RegExp(`/community/${postId}#c-[0-9a-f-]{36}$`));
  // 다시 오면 읽음 — 뱃지 없음.
  await a.page.goto("/community", { waitUntil: "networkidle" });
  await expect(a.page.getByTestId("community-bell")).toHaveAccessibleName("알림");

  // A — 해결됨 표시 → 답변 기다리는 질문에서 빠진다.
  await a.page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await a.page.getByRole("button", { name: "해결됨으로 표시" }).click();
  await expect(a.page.getByTestId("question-status")).toHaveText("해결됨");
  await a.page.goto("/community/questions?open=1", { waitUntil: "networkidle" });
  await expect(a.page.locator("li").filter({ hasText: title })).toHaveCount(0);

  await a.ctx.close();
  await b.ctx.close();
});

test("🔴 저장하면 내 글 › 저장한 글에 모이고, 차단하면 서로 안 보이며 차단 풀기로 되돌린다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const writer = await account(browser, "E2E차단대상");
  await writer.ctx.close();
  const me = await account(browser, "E2E저장자");
  const caption = `E2E 저장 차단 ${Date.now()}`;
  const [{ id: postId }] = await dbQuery<{ id: string }>(
    `insert into public.community_posts (user_id, visibility, author_name, photo_url, caption)
     values (${uid}, 'public', 'E2E차단대상', 'https://example.com/e2e.png', $2) returning id`,
    [writer.email, caption],
  );

  // 저장 — 피드 카드의 책갈피.
  await me.page.goto(`/community?q=${encodeURIComponent(caption)}`, { waitUntil: "networkidle" });
  const card = me.page.locator("li").filter({ hasText: caption });
  await card.getByRole("button", { name: "저장" }).click();
  await expect(card.getByRole("button", { name: "저장" })).toHaveAttribute("aria-pressed", "true");
  // 버튼은 누르는 즉시 바뀐다 — 서버 저장이 끝났다는 안내를 기다린 뒤 이동한다.
  await expect(me.page.getByTestId("community-notice")).toContainText("저장했어요", { timeout: 15_000 });
  await me.page.goto("/community/saved", { waitUntil: "networkidle" });
  await expect(me.page.locator("li").filter({ hasText: caption })).toBeVisible();

  // 차단 — 상세 ⋮ › 신고 › 이 사람 차단하기.
  await me.page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await me.page.getByRole("button", { name: "더보기" }).click();
  await me.page.getByRole("button", { name: "신고" }).first().click();
  await me.page.getByRole("button", { name: "이 사람 차단하기" }).click();
  await me.page.getByRole("button", { name: "차단", exact: true }).click();
  await expect(me.page.getByRole("status")).toContainText("차단했어요", { timeout: 15_000 });
  // 🔴 안내를 보여 준 뒤 목록으로 돌아간다(그 자리에서 '찾을 수 없음' 화면이 되지 않게).
  await expect(me.page).toHaveURL(/\/community$/, { timeout: 15_000 });

  // 피드·저장한 글·직접 링크 모두에서 사라진다.
  await me.page.goto(`/community?q=${encodeURIComponent(caption)}`, { waitUntil: "networkidle" });
  await expect(me.page.locator("li").filter({ hasText: caption })).toHaveCount(0);
  await me.page.goto("/community/saved", { waitUntil: "networkidle" });
  await expect(me.page.locator("li").filter({ hasText: caption })).toHaveCount(0);
  // (loading.tsx 가 먼저 흘러가 상태 코드는 200 — 화면으로 확인한다.)
  await me.page.goto(`/community/${postId}`, { waitUntil: "networkidle" });
  await expect(me.page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();

  // 차단 풀기 → 다시 보인다.
  await me.page.goto("/community/blocked", { waitUntil: "networkidle" });
  const row = me.page.getByTestId("blocked-users").locator("li").filter({ hasText: "E2E차단대상" });
  await row.getByRole("button", { name: "차단 풀기" }).click();
  await expect(row).toHaveCount(0);
  await me.page.goto(`/community?q=${encodeURIComponent(caption)}`, { waitUntil: "networkidle" });
  await expect(me.page.locator("li").filter({ hasText: caption })).toBeVisible();

  await dbQuery(`delete from public.community_posts where id = $1`, [postId]);
  await me.ctx.close();
});

test("운동 영상 한 편 공유 링크 — 영상 화면에서 '공유'를 누르면 /community/reel/<id> 링크가 복사되고, 그 링크로 영상이 열린다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const me = await account(browser, "E2E영상");
  await me.ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  // 브라우저 공유 창은 테스트에서 못 누른다 — 복사 경로로 보낸다.
  await me.page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
  });
  const [{ id }] = await dbQuery<{ id: string }>(
    `insert into public.teaching_posts (user_id, visibility, author_name, exercise_tag, video_url, caption)
     values (${uid}, 'public', 'E2E영상', '스쿼트', 'https://example.com/e2e.mp4', 'E2E 공유 영상') returning id`,
    [me.email],
  );

  await me.page.goto(`/community/reel/${id}`, { waitUntil: "networkidle" });
  await expect(me.page.getByText("E2E 공유 영상")).toBeVisible();
  await me.page.getByRole("button", { name: "공유" }).click();
  await expect(me.page.getByTestId("community-notice")).toContainText("링크를 복사했어요");
  const copied = await me.page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(new RegExp(`/community/reel/${id}$`));

  // 없는 영상은 404.
  await me.page.goto(`/community/reel/00000000-0000-4000-8000-000000000000`, { waitUntil: "networkidle" });
  await expect(me.page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();

  await dbQuery(`delete from public.teaching_posts where id = $1`, [id]);
  await me.ctx.close();
});
