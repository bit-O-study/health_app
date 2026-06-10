import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 같은 날에 가슴 상부 + 가슴 하부(같은 tone=chest)를 넣으면, 오늘 운동을 chest 로
// 두 번 불러와 행이 복제되고 React key 중복 에러가 났다. tones 중복 제거로 막는다.

test("같은 날 가슴 상부+하부는 메인에서 운동/키가 복제되지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const keyErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /same key|two children/i.test(msg.text())) {
      keyErrors.push(msg.text());
    }
  });

  const email = await signUpAndOnboard(page);
  const week = [
    ["pull", "chest-upper", "chest-lower"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ];
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(week)],
  );
  await seedRecommendedExercises(page);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // React "two children with the same key" 콘솔 에러가 없어야 한다.
  expect(keyErrors, keyErrors.join("\n")).toEqual([]);

  // DB: 가슴 운동이 chest focus 로 한 세트만(중복 등록 아님) — 행 id 중복 없음 가정,
  //     화면 본운동 리스트도 이름 중복이 없어야 한다.
  const mainUl = page.locator("ul.space-y-2").nth(1);
  const names = (await mainUl.locator("li h3").allInnerTexts()).map((s) =>
    s.split("\n")[0].trim(),
  );
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names).size).toBe(names.length); // 중복 이름 없음
});
