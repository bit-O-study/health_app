import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 다짐 설문(2026-09-25 설계) — 다섯 문항에 답하면 프로필에서 숫자를 계산해 다짐을 만든다.
 *
 * 예전 설문은 "유산소 몇 분·단백질 몇 g" 처럼 사용자가 모르는 숫자를 물었고, 목표는
 * 온보딩에서 이미 받은 값을 또 물었다. 그래서 이 스펙이 지키는 것은 둘이다.
 *  1) 답한 대로 다짐이 **DB 에 저장된다**(주 N일·알림 시각·미션까지)
 *  2) 앱이 판정 못 하는 항목은 **수동 미션**으로 들어간다
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("설문 다섯 문항 → 계산된 미션으로 다짐이 만들어진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);

  await page.goto("/commitments", { waitUntil: "networkidle" });
  const survey = page.getByTestId("commitment-survey");
  await expect(survey).toBeVisible({ timeout: 15_000 });

  // Q1 기간
  await survey.getByRole("button", { name: /^4주/ }).click();
  // Q2 무너지는 것 — 자동 판정 하나(야식) + 판정 불가 하나(물)
  await survey.getByRole("button", { name: /야식/ }).click();
  await survey.getByRole("button", { name: /물 안 마심/ }).click();
  await survey.getByRole("button", { name: /다음 · 2개 선택함/ }).click();
  // Q3 시간
  await survey.getByRole("button", { name: /^30분/ }).click();
  // Q4 알림
  await survey.getByRole("button", { name: /^저녁/ }).click();
  // Q5 주 며칠
  await survey.getByRole("button", { name: /^주 \d일/ }).first().click();

  // 결과 — 계산된 숫자와 '왜 그 숫자인지'가 같이 보인다.
  await expect(survey.getByText("이렇게 만들까요?")).toBeVisible();
  await expect(survey.getByText("물 2L 마시기")).toBeVisible();
  await expect(survey.getByText(/앱이 판정할 수 없어요/)).toBeVisible();
  await expect(survey.getByText("수동", { exact: true })).toBeVisible();

  await survey.getByTestId("survey-submit").click();

  // 🔴 화면이 아니라 DB 로 확인한다 — 저장이 빠지면 설문은 아무것도 한 게 없다.
  // ⚠ 한 번만 읽으면 안 된다. 버튼이 '만드는 중…' 인 동안 읽어 빈손으로 실패한다.
  type Saved = {
    weekly_target: number;
    remind_at: string | null;
    mode: string;
    missions: { type: string; label?: string; why?: string; id?: string }[];
  };
  const read = () =>
    dbQuery<Saved>(
      `select weekly_target, remind_at::text, mode, missions
         from public.commitments where user_id=${uid} and mode='survey'
        order by created_at desc limit 1`,
      [email],
    );
  await expect.poll(async () => (await read()).length, { timeout: 20_000 }).toBe(1);
  const saved = (await read())[0];
  expect(saved.weekly_target).toBeGreaterThanOrEqual(1);
  expect(saved.remind_at).toContain("20:00");

  // 미션은 3개를 넘지 않고, 수동 미션은 문구와 id 를 갖는다.
  expect(saved.missions.length).toBeGreaterThan(0);
  expect(saved.missions.length).toBeLessThanOrEqual(3);
  const manual = saved.missions.find((m) => m.type === "manual_check");
  expect(manual?.label).toBe("물 2L 마시기");
  expect(manual?.id).toBeTruthy();
  // 모든 미션에 '왜 이 숫자인지' 가 붙는다 — 화면마다 다른 설명을 하지 않기 위해서.
  expect(saved.missions.every((m) => (m.why ?? "").length > 0)).toBe(true);
});

test("설문을 건너뛰어도 목표에 맞는 미션 하나는 들어간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);

  await page.goto("/commitments", { waitUntil: "networkidle" });
  const survey = page.getByTestId("commitment-survey");
  await expect(survey).toBeVisible({ timeout: 15_000 });

  await survey.getByRole("button", { name: /^2주/ }).click();
  await survey.getByRole("button", { name: "특별히 없어요" }).click();
  await survey.getByRole("button", { name: /^15분/ }).click();
  await survey.getByRole("button", { name: "알림 안 받을래요" }).click();
  await survey.getByRole("button", { name: /^주 \d일/ }).first().click();
  await survey.getByTestId("survey-submit").click();

  const read = () =>
    dbQuery<{ missions: unknown[]; remind_at: string | null }>(
      `select missions, remind_at::text from public.commitments
        where user_id=${uid} and mode='survey' order by created_at desc limit 1`,
      [email],
    );
  await expect.poll(async () => (await read()).length, { timeout: 20_000 }).toBe(1);
  const rows = await read();
  expect(rows[0].missions.length).toBeGreaterThan(0);
  // '알림 안 받을래요' 를 고르면 알림 시각이 비어 있어야 한다.
  expect(rows[0].remind_at).toBeNull();
});
