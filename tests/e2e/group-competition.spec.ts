import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("group points: authorization, realtime overtake, weekly league, undo and mobile navigation", async ({ page, browser }) => {
  test.skip(!hasDb, "requires test DB credentials");
  test.setTimeout(180000);
  const other = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const pageB = await other.newPage();
  let realtimeRows = 0;
  const socketEvents: string[] = [];
  page.on("websocket", socket => socket.on("framereceived", ({ payload }) => {
    try {
      const message = JSON.parse(String(payload));
      const event = message.event ?? message[3] ?? "unknown";
      const body = message.payload ?? message[4];
      socketEvents.push(String(event) + ":" + String(body?.status ?? "") + (event === "system" ? ":" + String(body?.message ?? "").replace(/eyJ[\w.-]+/g, "[redacted]").slice(0, 200) : ""));
      if (message.event === "postgres_changes" || (Array.isArray(message) && message[3] === "postgres_changes")) realtimeRows++;
    } catch { /* Ignore non-JSON transport frames. */ }
  }));
  try {
    const emailA = await createOnboardedAccount(page), emailB = await createOnboardedAccount(pageB);
    const users = await dbQuery<{ id: string; email: string }>("select id,email from auth.users where email=any($1)", [[emailA, emailB]]);
    const a = users.find(u => u.email === emailA)!.id, b = users.find(u => u.email === emailB)!.id;
    await dbQuery("update profiles set nickname=case when user_id=$1 then '순위A' else '순위B' end where user_id=any($2)", [a, [a,b]]);
    const [g] = await dbQuery<{ id: string }>("insert into groups(name,owner_id) values('점수 검증 그룹',$1) returning id", [a]);
    await dbQuery("insert into group_members(group_id,user_id,role,display_name) values($1,$2,'owner','순위A')", [g.id,a]);
    await pageB.goto("/groups/ranking");
    expect((await pageB.request.get(`/api/groups/ranking?g=${g.id}`)).status()).toBe(403);
    await dbQuery("insert into group_members(group_id,user_id,role,display_name) values($1,$2,'member','순위B')", [g.id,b]);
    await dbQuery("insert into exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) values($1,(now() at time zone 'Asia/Seoul')::date,gen_random_uuid(),'squat',3,10)", [a]);
    // Prior weeks contribute 460 XP to B, but do not affect this week's ranking.
    await dbQuery("insert into exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) select $1,(now() at time zone 'Asia/Seoul')::date-14-i,gen_random_uuid(),'squat',20,100 from generate_series(0,1) i", [b]);
    await dbQuery("insert into conditioning_completions(user_id,for_date,kind,item_id,source_row_id,duration_min) values($1,(now() at time zone 'Asia/Seoul')::date-16,'warmup','walk',gen_random_uuid(),60)", [b]);
    // 160+160+140=460.
    await page.goto(`/groups/ranking?g=${g.id}`);
    await pageB.goto(`/groups/ranking?g=${g.id}`);
    await expect(page.getByTestId("ranking-connection")).toContainText("실시간 연결됨", { timeout: 20000 });
    await expect.poll(async () => (await dbQuery<{ n: number }>("select count(*)::int n from realtime.subscription where claims->>'sub'=$1 and entity='public.exercise_completions'::regclass", [a]))[0].n, { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.getByRole("list", { name: "그룹 운동 점수 순위" }).locator("li").first()).toContainText("순위A");
    await expect(pageB.getByLabel("내 운동 티어")).toContainText("루키");
    // Wait for initial subscription/fetch, then change committed data in the other account.
    await expect.poll(async () => (await (await page.request.get(`/api/groups/ranking?g=${g.id}`)).json()).members.length).toBe(2);
    await page.waitForTimeout(1500);
    const [done] = await dbQuery<{ id: string }>("insert into exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) values($1,(now() at time zone 'Asia/Seoul')::date,gen_random_uuid(),'squat',10,20) returning id", [b]);
    await expect(page.getByRole("status")).toContainText("순위B 님이 순위A 님을 추월", { timeout: 20000 });
    await expect(async () => expect(realtimeRows, socketEvents.join(",")).toBeGreaterThan(0)).toPass({ timeout: 15000 });
    await expect(pageB.getByRole("status")).toContainText("운동 점수 +100점", { timeout: 15000 });
    await expect(pageB.getByLabel("내 운동 티어")).toContainText("루키"); // XP gain alone no longer promotes a weekly league.
    await expect(pageB.getByLabel("내 운동 티어")).toContainText("560 XP");
    await expect(page.getByRole("list", { name: "그룹 운동 점수 순위" }).locator("li").first()).toContainText("순위B");
    await page.getByText("운동 점수 상세", { exact: true }).first().click();
    await expect(page.getByRole("list", { name: "그룹 운동 점수 순위" }).locator("li").first()).toContainText("40점");
    for (const width of [320,360,430]) {
      await page.setViewportSize({ width, height: 780 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: "test-results/group-competition-mobile.png", fullPage: true });
    await dbQuery("delete from exercise_completions where id=$1", [done.id]);
    await expect(pageB.getByLabel("내 운동 티어")).toContainText("460 XP", { timeout: 15000 });
    await expect(pageB.getByLabel("내 운동 티어")).toContainText("루키");
    await page.getByRole("link", { name: "그룹 알림 열기" }).click();
    await expect(page.getByRole("heading", { name: "그룹 알림", exact: true }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "그룹 순위", exact: true })).toBeVisible();
    // Self score feedback is visible in the exercise flow too.
    await pageB.goto("/routine");
    await expect(pageB.getByLabel("운동 점수").getByText(/오늘 0점/)).toBeVisible();
    await dbQuery("insert into exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) values($1,(now() at time zone 'Asia/Seoul')::date,gen_random_uuid(),'squat',10,20)", [b]);
    await expect(pageB.getByRole("status").filter({ hasText: "운동 점수 +100점" })).toBeVisible({ timeout: 15000 });
    // Repeated read must not award another 100 points.
    const self = await (await pageB.request.get("/api/groups/ranking")).json();
    expect(self.members[0].lifetime.total).toBe(560);
    await dbQuery("delete from group_members where group_id=$1 and user_id=$2", [g.id,b]);
    expect((await pageB.request.get(`/api/groups/ranking?g=${g.id}`)).status()).toBe(403);
  } finally { await other.close(); }
});
