import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 트레이너 모드 전환(홈 헤더) + 회원의 정보 제공 설정.
 *
 * 두 가지를 한 흐름에서 본다 — 계정 2개 가입이 비싸서(각 ~20초) 나누면 그만큼 두 배다.
 *  1. 홈 상단 헤더의 모드 전환은 **그룹장(트레이너)에게만** 보인다. 일반 회원에겐 없다.
 *  2. 회원이 설정에서 제공을 끄면 **트레이너 화면에서 실제로 가려진다.**
 *     (스위치가 화면만 바뀌고 서버가 그대로 내려보내면 그건 장식이다.)
 *  3. 회원이 트레이너를 제거하면 연결이 끊긴다.
 */
test("홈 헤더 트레이너 전환은 그룹장만 보이고, 회원의 제공 설정이 트레이너 화면에 적용된다", async ({
  browser,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(300_000);

  const name = `E2E 전환 ${Date.now().toString(36)}`;

  // ── A: 그룹장(트레이너)
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill(name);
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  const groupId = await dbQuery<{ id: string }>(
    `select id from public.groups where name=$1`,
    [name],
  ).then((r) => r[0].id);

  // 🔴 그룹장 홈에는 모드 전환이 있다.
  await pageA.goto("/home", { waitUntil: "networkidle" });
  await expect(pageA.getByTestId("trainer-mode-switch")).toBeVisible({ timeout: 10000 });
  await pageA.getByTestId("trainer-mode-button").click();
  // 체크는 '내 운동' 에 있다(지금 홈이므로).
  await expect(
    pageA.getByTestId("trainer-mode-option").filter({ hasText: "내 운동" }),
  ).toHaveAttribute("data-active", "true");

  // 전환 → 회원 관리 화면.
  await pageA
    .getByTestId("trainer-mode-option")
    .filter({ hasText: "회원 관리" })
    .click();
  await expect(pageA.getByRole("heading", { name: /회원 관리/ })).toBeVisible({
    timeout: 10000,
  });

  // ── B: 초대로 들어온 일반 회원
  const token = await dbQuery<{ invite_token: string }>(
    `select invite_token from public.groups where id=$1`,
    [groupId],
  ).then((r) => r[0].invite_token);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);
  await pageB.goto(`/groups/join/${token}`);
  await pageB.getByRole("button", { name: "확인" }).click();
  // 가입 완료는 DB 로 본다(초대 확인 화면이 이미 그룹 이름을 보여줘서 화면으론 못 믿는다).
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.group_members where group_id=$1`,
            [groupId],
          )
        )[0].n,
      { timeout: 20000 },
    )
    .toBe("2");

  const memberId = await dbQuery<{ user_id: string }>(
    `select user_id from public.group_members
      where group_id=$1 and user_id <> (select owner_id from public.groups where id=$1)`,
    [groupId],
  ).then((r) => r[0].user_id);

  // 🔴 일반 회원 홈에는 모드 전환이 **아예 없다**.
  await pageB.goto("/home", { waitUntil: "networkidle" });
  await expect(pageB.getByTestId("trainer-mode-switch")).toHaveCount(0);

  // ── 회원이 식단 제공을 끈다.
  await pageB.goto("/settings/trainers", { waitUntil: "networkidle" });
  await expect(pageB.getByTestId("trainer-connection")).toHaveCount(1, {
    timeout: 10000,
  });
  const dietToggle = pageB
    .getByTestId("trainer-connection")
    .getByTestId("share-toggle")
    .and(pageB.locator('[data-kind="diet"]'));
  await expect(dietToggle).toHaveAttribute("data-on", "true");
  await dietToggle.click();
  await expect(dietToggle).toHaveAttribute("data-on", "false");
  // 서버에 실제로 저장됐는가(화면만 바뀌면 소용없다).
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ v: string }>(
            `select share_diet::text v from public.member_share_prefs
              where group_id=$1 and user_id=$2`,
            [groupId, memberId],
          )
        )[0]?.v,
      { timeout: 15000 },
    )
    .toBe("false");

  // ── 트레이너 화면에서 가려진다.
  await pageA.goto(`/groups/${groupId}/member/${memberId}`, {
    waitUntil: "networkidle",
  });
  await expect(pageA.getByTestId("hidden-diet")).toBeVisible({ timeout: 10000 });
  await expect(pageA.getByText("오늘 기록한 식단이 없어요")).toHaveCount(0);

  // 회원 관리 목록에도 '비공개' 가 뜬다.
  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await expect(pageA.getByText("식단 비공개")).toBeVisible({ timeout: 10000 });

  // ── 회원이 트레이너를 제거한다.
  await pageB.goto("/settings/trainers", { waitUntil: "networkidle" });
  await pageB.getByTestId("remove-trainer").first().click();
  await pageB.getByRole("button", { name: "연결 끊기" }).click();
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.group_members where group_id=$1`,
            [groupId],
          )
        )[0].n,
      { timeout: 20000 },
    )
    .toBe("1");
  await expect(pageB.getByTestId("no-trainers")).toBeVisible({ timeout: 10000 });

  await ctxA.close();
  await ctxB.close();
});
