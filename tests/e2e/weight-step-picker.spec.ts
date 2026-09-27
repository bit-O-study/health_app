import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 종목별 증량 단위 — 헬스장마다 스택이 다르다.
 *
 * 기본값은 기구·종목 크기로 정하지만(펙덱 같은 작은 핀 스택은 2.5kg) 1kg 씩
 * 올라가는 기구가 있다. 무게를 실제로 조절하는 자리(운동모드)에서 바꿀 수 있어야 하고,
 * 바꾸면 ± 폭이 바로 그 단위로 움직여야 한다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동모드에서 증량 단위를 바꾸면 ± 폭과 프로필이 같이 바뀐다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  // 펙덱 = 작은 핀 스택 → 기본 증량 단위 2.5kg.
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 기본 단위 안내가 보인다.
  const entry = page.getByRole("button", { name: /증량 단위/ });
  await expect(entry).toBeVisible({ timeout: 15_000 });
  await expect(entry).toContainText("2.5kg");

  await entry.click();
  await page.getByRole("button", { name: "1kg", exact: true }).click();

  // 프로필에 저장된다.
  await expect
    .poll(
      async () => {
        const rows = await dbQuery<{ weight_steps: Record<string, number> }>(
          `select weight_steps from public.profiles where user_id=${uid}`,
          [email],
        );
        return rows[0]?.weight_steps?.["pec-deck"] ?? null;
      },
      { timeout: 20_000 },
    )
    .toBe(1);

  // 화면도 새 단위로 바뀐다(내 설정 표시).
  await expect(page.getByRole("button", { name: /증량 단위 1kg/ })).toBeVisible({
    timeout: 20_000,
  });

  // ± 폭이 실제로 1kg 이다 — 20 → 21.
  const plus = page.getByRole("button", { name: "무게 늘리기" });
  if (await plus.count()) {
    await plus.first().click();
    await expect(page.getByText(/(^|\s)21(\s|kg)/).first()).toBeVisible({
      timeout: 10_000,
    });
  }
});
