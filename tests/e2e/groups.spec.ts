import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 그룹: 생성 → 공유 링크로 다른 계정이 참여.
// 그룹탭은 관리자가 정한 전역 모드(gym=헬스장·랭킹 / proof=오늘 운동 인증)에 따라
// 화면이 통째로 다르다 — 현재 모드를 읽어 해당 모드의 시나리오만 돌린다.

/** 라이브 DB 의 현재 그룹탭 모드(앱과 같은 SECURITY DEFINER 함수로 읽는다). */
async function currentGroupMode(): Promise<"gym" | "proof"> {
  const r = await dbQuery<{ mode: string }>(`select public.group_mode() as mode`);
  return r[0]?.mode === "proof" ? "proof" : "gym";
}

/** 그룹 이름으로 초대 토큰 조회. */
async function inviteToken(groupName: string): Promise<string> {
  const g = await dbQuery<{ invite_token: string }>(
    `select invite_token from public.groups where name=$1`,
    [groupName],
  );
  expect(g.length).toBe(1);
  return g[0].invite_token;
}

test("그룹 생성 → 초대 링크 참여 → 랭킹에 멤버 표시", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.skip(
    (await currentGroupMode()) !== "gym",
    "그룹탭이 헬스장(gym) 모드일 때만 랭킹 화면이 뜬다",
  );

  // ── A: 그룹 생성
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill("E2E 헬스모임");
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  // 그룹 진입은 모드를 아는 정식 경로(/groups?g=<id>).
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  await expect(pageA.getByText("E2E 헬스모임")).toBeVisible({ timeout: 8000 });
  await expect(pageA.getByText("이번 주 운동 랭킹대전")).toBeVisible();
  await expect(pageA.getByText("나", { exact: true })).toBeVisible();
  // 회원가입 시 이름(검증유저)이 랭킹에 표시되고 '이름 없음'이 아니어야 한다
  await expect(pageA.getByText("검증유저").first()).toBeVisible();
  await expect(pageA.getByText("이름 없음")).toHaveCount(0);
  // 오늘 식단·운동 공유 줄
  await expect(pageA.getByText(/오늘 🍽/).first()).toBeVisible();

  const token = await inviteToken("E2E 헬스모임");

  // ── B: 링크로 참여
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);

  await pageB.goto(`/groups/join/${token}`);
  // 초대 확인 화면 — '확인'을 눌러 가입한다.
  await pageB.getByRole("button", { name: "확인" }).click();
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
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

  // 멤버 행을 눌러 상대방 오늘 운동·식단 상세로 진입(같은 그룹원 열람)
  await pageB.locator("ol > li a").first().click();
  await pageB.waitForURL(/\/groups\/[0-9a-f-]{8,}\/member\//, { timeout: 10000 });
  await expect(pageB.getByRole("heading", { name: "오늘 운동" })).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByRole("heading", { name: "오늘 식단" })).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

// 회귀: 인증 모드인데 카카오톡 초대 링크로 들어와 가입하면 `/groups/[id]`(헬스장 전용
// 화면)로 떨어져 '캐릭터 키우기'(공유펫 헬스장)가 떴다. 초대로 들어와도 인증 피드여야 한다.
test("인증 모드: 초대 링크로 가입해도 캐릭터 키우기(헬스장)가 안 뜬다", async ({
  browser,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.skip(
    (await currentGroupMode()) !== "proof",
    "그룹탭이 인증(proof) 모드일 때만 검증",
  );

  // ── A: 그룹 생성
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill("E2E 인증모임");
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageA.getByText("탭하여 오늘 인증")).toBeVisible({ timeout: 8000 });

  const token = await inviteToken("E2E 인증모임");

  // ── B: 카카오톡에 뿌려지는 그 링크로 들어와 가입
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);

  await pageB.goto(`/groups/join/${token}`);
  await pageB.getByRole("button", { name: "확인" }).click();
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  // 인증 피드가 떠야 하고, 헬스장(랭킹·공유펫) 요소는 하나도 없어야 한다.
  await expect(pageB.getByText("탭하여 오늘 인증")).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByText("이번 주 운동 랭킹대전")).toHaveCount(0);

  // 옛 딥링크(/groups/[id])로 직접 들어가도 헬스장이 열리면 안 된다.
  const groupId = new URL(pageB.url()).searchParams.get("g")!;
  await pageB.goto(`/groups/${groupId}`);
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageB.getByText("이번 주 운동 랭킹대전")).toHaveCount(0);

  await ctxA.close();
  await ctxB.close();
});