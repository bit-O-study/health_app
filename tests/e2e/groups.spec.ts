import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 그룹: 생성 → 공유 링크로 다른 계정이 참여 → 그룹별 운동 랭킹대전에 두 명 표시.

test("그룹 생성 → 초대 링크 참여 → 랭킹에 멤버 표시", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  // ── A: 그룹 생성
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill("E2E 헬스모임");
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  await pageA.waitForURL(/\/groups\/[0-9a-f-]{8,}/, { timeout: 10000 });

  await expect(pageA.getByText("E2E 헬스모임")).toBeVisible({ timeout: 8000 });
  await expect(pageA.getByText("이번 주 운동 랭킹대전")).toBeVisible();
  await expect(pageA.getByText("나", { exact: true })).toBeVisible();

  // 초대 토큰 확보
  const g = await dbQuery<{ invite_token: string }>(
    `select invite_token from public.groups where name=$1`,
    ["E2E 헬스모임"],
  );
  expect(g.length).toBe(1);
  const token = g[0].invite_token;

  // ── B: 링크로 참여
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);

  await pageB.goto(`/groups/join/${token}`);
  await pageB.waitForURL(/\/groups\/[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageB.getByText("E2E 헬스모임")).toBeVisible({ timeout: 8000 });

  // DB: 멤버 2명
  const m = await dbQuery<{ n: string }>(
    `select count(*)::text n
       from public.group_members gm
       join public.groups g on g.id = gm.group_id
      where g.name=$1`,
    ["E2E 헬스모임"],
  );
  expect(m[0].n).toBe("2");

  // 랭킹 목록(ol > li)에 두 명
  await expect(pageB.locator("ol > li")).toHaveCount(2);

  await ctxA.close();
  await ctxB.close();
});
