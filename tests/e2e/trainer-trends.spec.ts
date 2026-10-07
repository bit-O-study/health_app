import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 트레이너 대시보드 · 회원 주별/월별 변화(2026-10-07).
 * 이번 주 vs 지난주 같은 요일까지, 줄어든 회원은 맨 위 + 칩, 공유 안 한 칸은 '비공개'.
 * 이용권·연결은 DB 로 만든다(초대·동의 흐름은 independent-trainer.spec).
 */
test("대시보드에 회원별 지난주 대비 변화, 월별 전환, 회원 상세에 지난 기간 대비", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(200_000);

  const ctxT = await browser.newContext();
  const pageT = await ctxT.newPage();
  const trainerEmail = await signUpAndOnboard(pageT);
  await dbQuery(
    `insert into public.pt_passes(trainer_id,name,phone,status,starts_on,ends_on)
     select id,'변화 트레이너','01012345678','active',(now() at time zone 'Asia/Seoul')::date-1,'infinity'::date from auth.users where email=$1`,
    [trainerEmail],
  );
  const ctxM = await browser.newContext();
  const pageM = await ctxM.newPage();
  const memberEmail = await signUpAndOnboard(pageM);
  // 운동·체중 공유, 식단 비공개.
  const linkId = await dbQuery<{ id: string }>(
    `insert into public.pt_links(trainer_id,member_id,member_name,share_workout,share_body)
     select t.id,m.id,'변화 회원',true,true from auth.users t, auth.users m where t.email=$1 and m.email=$2 returning id`,
    [trainerEmail, memberEmail],
  ).then((r) => r[0].id);
  // 지난주 같은 요일(7일 전)에 5세트 — 이번 주는 아직 없음 → 줄어든 회원.
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, sets, reps, focus)
     select id, (now() at time zone 'Asia/Seoul')::date - 7, gen_random_uuid(), 'done', 'squat', 'barbell', 5, 10, 'lower' from auth.users where email=$1`,
    [memberEmail],
  );

  await pageT.goto("/trainer", { waitUntil: "networkidle" });
  const trends = pageT.getByTestId("trainer-trends");
  await expect(trends).toHaveAttribute("data-period", "week");
  await expect(pageT.getByTestId("dropped-count")).toHaveText("줄어든 회원 1명");
  const card = pageT.getByTestId("member-trend").first();
  await expect(card).toHaveAttribute("data-dropped", "1");
  await expect(card).toContainText("변화 회원");
  await expect(card).toContainText("▼ 5"); // 세트
  await expect(card.getByText("비공개", { exact: true })).toHaveCount(1); // 식단

  await pageT.getByRole("tab", { name: "월별" }).click();
  await expect(trends).toHaveAttribute("data-period", "month");

  // 회원 상세 통계 — 지난주 대비.
  await pageT.goto(`/trainer/members/${linkId}?view=stats`, { waitUntil: "networkidle" });
  await expect(pageT.getByTestId("stat-delta").first()).toContainText("지난주 대비");

  await ctxT.close();
  await ctxM.close();
});
