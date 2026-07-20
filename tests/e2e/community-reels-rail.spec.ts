import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const uid = `(select id from auth.users where lower(email)=lower($1))`;

// 운동게시판(릴스) 우측 액션 레일은 아래에서 위로 쌓여 맨 아래 항목(삭제)이
// 하단 탭바에 가장 가깝다. 실기기에서 삭제 버튼이 탭바에 가린다는 제보로
// safe-area 만큼 여유를 준 뒤, 최소한 데스크톱에서 겹치지 않음을 지키는 가드.
test("운동게시판 삭제 버튼이 하단 탭바에 가리지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `insert into public.teaching_posts (user_id, visibility, author_name, exercise_tag, video_url, caption)
     values (${uid}, 'public', '나', '벤치프레스', 'https://example.com/v.mp4', '내 글')`,
    [email],
  );

  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "운동" }).click();
  await page.waitForTimeout(1200);

  const m = await page.evaluate(() => {
    const d = document.querySelector('[aria-label="삭제"]')!.getBoundingClientRect();
    const n = document.querySelector("nav")!.getBoundingClientRect();
    return { deleteBottom: d.bottom, navTop: n.top, clearance: n.top - d.bottom };
  });
  console.log("=== " + JSON.stringify(m) + " ===");
  expect(m.clearance).toBeGreaterThan(0);
});
