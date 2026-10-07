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
 * 2026-10-07: 옛 그룹장-트레이너 화면(/groups/[id]/trainer)이 닫혀(독립 트레이너 전환 202609220002)
 * 독립 트레이너 앱(/trainer/members/[연결 id])으로 옮겼다. 이용권·연결은 화면 흐름이 아니라 DB 로 만든다
 * (초대·동의 흐름은 independent-trainer.spec 이 본다).
 */
test("오늘만 처방은 오늘 계획만 바꾸고 영구 루틴은 그대로다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(300_000);

  // ── 트레이너: 이용권 활성.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const trainerEmail = await signUpAndOnboard(pageA);
  await dbQuery(
    `insert into public.pt_passes(trainer_id,name,phone,status,starts_on,ends_on)
     select id,'오늘처방 트레이너','01012345678','active',(now() at time zone 'Asia/Seoul')::date-1,'infinity'::date
       from auth.users where email=$1`,
    [trainerEmail],
  );

  // ── 회원: 추천 운동까지 채워 **오늘 할 운동이 있는** 상태 + 처방 허용 연결.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const memberEmail = await signUpAndOnboard(pageB);
  await seedRecommendedExercises(pageB);
  const { linkId, memberId } = await dbQuery<{ id: string; member_id: string }>(
    `insert into public.pt_links(trainer_id,member_id,member_name,share_workout,allow_prescription)
     select t.id,m.id,'오늘처방 회원',true,true from auth.users t, auth.users m
      where t.email=$1 and m.email=$2
     returning id, member_id`,
    [trainerEmail, memberEmail],
  ).then((r) => ({ linkId: r[0].id, memberId: r[0].member_id }));

  // 처방 전 영구 루틴 지문(원칙 #2 비교용).
  const fingerprint = () =>
    dbQuery<{ fingerprint: string }>(
      `select coalesce(string_agg(t, '|' order by t), '') fingerprint from (
         select id::text || ':' || exercise_id || ':' || sets::text || ':' || reps::text t
           from public.routine_exercises where user_id=$1) s`,
      [memberId],
    ).then((r) => r[0].fingerprint);
  const routineBefore = await fingerprint();
  expect(routineBefore).not.toBe("");

  // ── 회원 관리 상세 → '오늘만' 처방
  await pageA.goto(`/trainer/members/${linkId}?view=prescription&scope=today`, { waitUntil: "networkidle" });
  const todaySection = pageA.getByRole("region", { name: "운동 처방 · 오늘만" });
  await expect(todaySection).toBeVisible({ timeout: 15000 });

  // 첫 줄의 세트 수만 바꾼다(운동 검색 없이도 처방은 성립한다).
  const card = todaySection.locator("article").first();
  await card.getByRole("button", { name: "운동 변경" }).click();
  await card.getByLabel("세트").fill("7");
  await card.getByRole("button", { name: "변경 내용 확인" }).click();
  // 🔴 확인 단계에 "영구 루틴은 바뀌지 않아요" 안내가 있어야 한다(오해 방지).
  await expect(card.getByText(/영구 루틴은 바뀌지 않아요/)).toBeVisible();
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
  expect(await fingerprint()).toBe(routineBefore);

  // ── 3) 회원의 오늘 화면에 "오늘만 변경됨" 이 보인다(세트 수 글자는 운동 탭 간결화로 카드에 없다).
  await pageB.goto("/routine", { waitUntil: "networkidle" });
  await expect(pageB.getByRole("heading", { name: /오늘 할 운동.*오늘만 변경됨/ })).toBeVisible({ timeout: 20000 });

  await ctxA.close();
  await ctxB.close();
});
