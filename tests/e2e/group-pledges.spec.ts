import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("그룹 전체 다짐 생성·전체 멤버 판정·상단 실패 명단·모바일 화면", async ({ page, browser }) => {
  test.skip(!hasDb, "needs DB credentials");
  const memberContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", viewport: { width: 320, height: 850 } });
  try {
    const memberPage = await memberContext.newPage();
    const memberEmail = await createOnboardedAccount(memberPage);
    const ownerEmail = await createOnboardedAccount(page);
    const users = await dbQuery<{ id: string; email: string }>("select id,email from auth.users where email=any($1)", [[ownerEmail, memberEmail]]);
    const owner = users.find((u) => u.email === ownerEmail)!.id;
    const member = users.find((u) => u.email === memberEmail)!.id;
    const [group] = await dbQuery<{ id: string }>("insert into public.groups(name,owner_id) values('전체 다짐 테스트',$1) returning id", [owner]);
    await dbQuery("insert into public.group_members(group_id,user_id,role,display_name) values($1,$2,'owner','성공멤버'),($1,$3,'member','실패멤버')", [group.id, owner, member]);
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto("/commitments/groups", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "그룹 전체 다짐 만들기" }).click();
    const form = page.getByTestId("group-pledge-form");
    await form.getByLabel("다짐 이름").fill("함께 주 1일 운동");
    await form.getByRole("combobox", { name: "기간", exact: true }).selectOption("7");
    await form.getByRole("combobox", { name: "주 운동 일수", exact: true }).selectOption("1");
    await form.getByRole("button", { name: "전체 다짐 저장" }).click();
    const card = page.getByTestId("group-wide-pledge");
    await expect(card).toContainText("함께 주 1일 운동");
    await expect(card).toContainText("참여 2명");
    await expect(card.getByText("진행 중", { exact: true })).toHaveCount(2);
    await expect(page.getByTestId("group-failure-list")).toContainText("실패 명단 · 0명");
    // Move only the run-owned fixture into a closed block. The failing member has never opened pledges.
    await dbQuery("update public.group_pledges set start_date=(now() at time zone 'Asia/Seoul')::date-7 where group_id=$1", [group.id]);
    await dbQuery("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,created_at) values($1,(now() at time zone 'Asia/Seoul')::date-2,gen_random_uuid(),'squat',now()-interval '2 days')", [owner]);
    await page.reload({ waitUntil: "networkidle" });
    const failures = page.getByTestId("group-failure-list");
    await expect(failures).toContainText("실패 명단 · 1명");
    await expect(failures).toContainText("실패멤버");
    await expect(failures).not.toContainText("성공멤버");
    await expect(card.getByTestId("pledge-failed-members")).toContainText("실패멤버 (1주차)");
    await expect(card.getByText("다짐 성공", { exact: true })).toBeVisible();
    expect((await failures.boundingBox())!.y).toBeLessThan((await card.boundingBox())!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/group-pledges-mobile.png", fullPage: true });
    await memberPage.goto("/commitments/groups", { waitUntil: "networkidle" });
    await expect(memberPage.getByRole("button", { name: "그룹 전체 다짐 만들기" })).toHaveCount(0);
    await expect(memberPage.getByTestId("group-wide-pledge")).toContainText("실패멤버 (1주차)");
    // New members don't silently join an already-created pledge; leaving hides results and access.
    await dbQuery("delete from public.group_members where group_id=$1 and user_id=$2", [group.id, member]);
    await memberPage.reload({ waitUntil: "networkidle" });
    await expect(memberPage.getByTestId("group-wide-pledge")).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("group-failure-list")).toContainText("실패 명단 · 0명");
  } finally { await memberContext.close(); }
});
