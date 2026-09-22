import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 트레이너 **'오늘만' 처방** — 결정(2026-09-20): 처방 축은 영구 루틴 + 오늘만 둘 다.
 *
 * 🔴 이 스펙이 지키는 것은 **원칙 #2** 다: 오늘만 처방은 회원의 영구 루틴을 건드리지
 *    않는다. 화면이 맞아도 `routine_exercises` 가 한 줄이라도 바뀌면 내일부터 회원의
 *    루틴이 트레이너가 바꾼 대로 남는다 — 그래서 DB 를 직접 본다.
 *
 * 곁들여: 트레이너 화면 상단의 **'내 운동' 복귀 스위치**도 같은 흐름에서 확인한다
 * (계정 2개 가입이 비싸서 스펙을 쪼개면 그만큼 두 배다).
 */
test("오늘만 처방은 오늘 계획만 바꾸고 영구 루틴은 그대로다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(300_000);

  const name = `E2E 오늘처방 ${Date.now().toString(36)}`;

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
  const token = await dbQuery<{ invite_token: string }>(
    `select invite_token from public.groups where id=$1`,
    [groupId],
  ).then((r) => r[0].invite_token);

  // ── B: 회원 — 추천 운동까지 채워 **오늘 할 운동이 있는** 상태로 만든다.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);
  await seedRecommendedExercises(pageB);
  await pageB.goto(`/groups/join/${token}`);
  await pageB.getByRole("button", { name: "확인" }).click();
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

  // 처방 전 영구 루틴 지문(원칙 #2 비교용).
  const routineBefore = await dbQuery<{ fingerprint: string }>(
    `select coalesce(string_agg(t, '|' order by t), '') fingerprint from (
       select id::text || ':' || exercise_id || ':' || sets::text || ':' || reps::text t
         from public.routine_exercises where user_id=$1) s`,
    [memberId],
  ).then((r) => r[0].fingerprint);
  expect(routineBefore).not.toBe("");

  // ── 트레이너 화면: 복귀 스위치가 있다(홈 헤더와 같은 컴포넌트).
  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await expect(pageA.getByTestId("trainer-mode-switch")).toBeVisible({ timeout: 10000 });
  await pageA.getByTestId("trainer-mode-button").click();
  await expect(
    pageA.getByTestId("trainer-mode-option").filter({ hasText: name }),
  ).toHaveAttribute("data-active", "true");
  await pageA.keyboard.press("Escape");

  // ── 회원 관리 상세 → '오늘만' 처방
  await pageA.goto(`/groups/${groupId}/trainer/members/${memberId}`, {
    waitUntil: "networkidle",
  });
  const todaySection = pageA.getByRole("region", { name: "운동 처방 · 오늘만" });
  await expect(
    pageA.getByRole("heading", { name: "운동 처방 · 오늘만" }),
  ).toBeVisible({ timeout: 15000 });

  // 첫 줄의 세트 수만 바꾼다(운동 검색 없이도 처방은 성립한다).
  const card = todaySection.locator("article").first();
  await card.getByRole("button", { name: "운동 변경" }).click();
  await card.getByLabel("세트").fill("7");
  await card.getByRole("button", { name: "변경 내용 확인" }).click();
  // 🔴 확인 단계에 "영구 루틴은 바뀌지 않아요" 안내가 있어야 한다(오해 방지).
  await expect(card.getByText("영구 루틴은 바뀌지 않아요")).toBeVisible();
  await card.getByRole("button", { name: "처방 저장" }).click();
  await expect(card.getByRole("status")).toContainText("저장", { timeout: 20000 });

  // ── 1) 오늘 계획(daily_plan)에 7세트가 들어갔다.
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.daily_plan
              where user_id=$1 and for_date=(now() at time zone 'Asia/Seoul')::date and sets=7`,
            [memberId],
          )
        )[0].n,
      { timeout: 20000 },
    )
    .toBe("1");

  // ── 2) 🔴 영구 루틴은 한 줄도 안 바뀌었다(원칙 #2).
  const routineAfter = await dbQuery<{ fingerprint: string }>(
    `select coalesce(string_agg(t, '|' order by t), '') fingerprint from (
       select id::text || ':' || exercise_id || ':' || sets::text || ':' || reps::text t
         from public.routine_exercises where user_id=$1) s`,
    [memberId],
  ).then((r) => r[0].fingerprint);
  expect(routineAfter).toBe(routineBefore);

  // ── 3) 회원에게 '오늘 운동' 으로 읽히는 코멘트가 남는다(루틴 변경으로 오해하지 않게).
  const note = await dbQuery<{ body: string }>(
    `select body from public.trainer_comments
      where group_id=$1 and member_id=$2 order by created_at desc limit 1`,
    [groupId, memberId],
  ).then((r) => r[0]?.body ?? "");
  expect(note).toContain("오늘 운동");
  expect(note).not.toContain("영구 루틴");

  // ── 4) 회원의 오늘 화면에도 7세트로 보인다.
  await pageB.goto("/routine", { waitUntil: "networkidle" });
  await expect(pageB.getByText("7세트").first()).toBeVisible({ timeout: 20000 });

  await ctxA.close();
  await ctxB.close();
});
