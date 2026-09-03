import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 내 데이터 내보내기 (로드맵 5.1).
 *
 * 단위 테스트가 "한 줄을 어떻게 만드는가" 를 본다면, 여기서는 **실제로 받아지는가**
 * 를 본다 — 로그인 상태로 요청해야 내려오고, 내려온 파일에 내 기록만 들어 있고,
 * 한글이 깨지지 않는지.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedCompletion(email: string) {
  // 60×10 + 50×10 + 40×12 = 1,580kg. 균일 세트로 세면 1,800kg 이 된다.
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus,
        sets, reps, weight_kg, set_details)
     values (${uid}, ${today}, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower',
             3, 10, 60,
             '[{"weightKg":60,"reps":10},{"weightKg":50,"reps":10},{"weightKg":40,"reps":12}]'::jsonb)`,
    [email],
  );
}

async function seedFood(email: string, name: string) {
  await dbQuery(
    `insert into public.food_logs
       (user_id, for_date, meal, position, name, kcal, protein_g, carbs_g, fat_g, amount)
     values (${uid}, ${today}, 'breakfast', 0, $2, 420, 35, 50, 8, '1인분')`,
    [email, name],
  );
}

test("로그인 없이는 내보내기를 못 받는다", async ({ request }) => {
  const res = await request.get("/api/export/workouts");
  expect(res.status()).toBe(401);
  // 로그인 페이지 HTML 을 주면 그게 .csv 로 저장된다 — 파일이 아니라 상태코드로 답해야 한다.
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(res.headers()["content-disposition"]).toBeUndefined();
});

test("모르는 종류는 404", async ({ request }) => {
  expect((await request.get("/api/export/passwords")).status()).toBe(404);
});

test("운동 기록 CSV — 첨부파일·BOM·세트별 볼륨", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email);

  const res = await page.request.get("/api/export/workouts");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");

  // 첨부파일로 내려와야 브라우저가 저장한다. 한글 이름은 filename* 로.
  const disposition = res.headers()["content-disposition"];
  expect(disposition).toContain("attachment;");
  expect(disposition).toContain('filename="helssu-workouts-');
  expect(decodeURIComponent(disposition.split("filename*=UTF-8''")[1])).toContain(
    "헬쑤-운동기록-",
  );
  // 내 기록이 담긴 파일 — 캐시에 남기면 안 된다.
  expect(res.headers()["cache-control"]).toContain("no-store");

  const bytes = await res.body();
  // BOM 이 없으면 엑셀이 CP949 로 읽어 머리글부터 전부 깨진다.
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

  const csv = new TextDecoder("utf-8").decode(bytes);
  expect(csv.split("\r\n")[0]).toBe(
    "날짜,운동,부위,기구,상태,세트,횟수,무게(kg),세트별 기록,볼륨(kg)",
  );
  expect(csv).toContain("스쿼트");
  expect(csv).toContain("60×10 / 50×10 / 40×12");
  // 세트별 기록을 안 읽으면 1800 이 찍힌다 — 화면(성장 그래프)과 같은 1,580 이어야 한다.
  expect(csv).toContain(",1580\r\n");
  expect(csv).not.toContain(",1800\r\n");
});

test("식단 CSV — 쉼표가 든 음식 이름이 한 칸으로 유지된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedFood(email, "닭가슴살, 현미밥");

  const csv = await (await page.request.get("/api/export/diet")).text();
  expect(csv).toContain('"닭가슴살, 현미밥"');
  const dataLine = csv
    .split("\r\n")
    .find((l) => l.includes("닭가슴살"))!;
  // 헤더와 같은 칸 수여야 한다(따옴표 밖의 쉼표만 셈).
  const outsideQuotes = dataLine.split('"');
  expect(outsideQuotes).toHaveLength(3);
  expect(dataLine).toContain("아침");
});

test("전체 백업 JSON — 내 기록은 담기고 기기 토큰은 빠진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email);
  await seedFood(email, "고구마");

  const res = await page.request.get("/api/export/backup");
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(res.headers()["content-disposition"]).toContain(
    'filename="helssu-backup-',
  );

  // 스트리밍으로 만든 JSON 이라 문법이 깨지기 쉽다 — 파싱되는지부터 본다.
  const raw = await res.text();
  const backup = JSON.parse(raw);
  expect(backup.meta.format).toBe("helssu-backup");
  expect(backup.meta.account.email).toBe(email);

  expect(backup.data.exercise_completions).toHaveLength(1);
  expect(backup.data.exercise_completions[0].exercise_id).toBe("squat");
  expect(backup.data.food_logs[0].name).toBe("고구마");
  // 기록이 없는 구획도 키는 있어야 한다 — 없으면 "빠진 건지 비어 있는 건지" 알 수 없다.
  expect(backup.data.daily_steps).toEqual([]);

  // 열쇠에 해당하는 것은 어떤 경우에도 파일에 없다.
  for (const table of ["fcm_tokens", "push_subscriptions", "password_otps"]) {
    expect(Object.keys(backup.data)).not.toContain(table);
  }
  // 이름은 `meta.excluded`("무엇을 왜 뺐는지")에만 나온다 — 값이 담기면 안 된다.
  expect(backup.meta.excluded.map((e: { table: string }) => e.table)).toContain(
    "password_otps",
  );
  expect(raw.split('"data":')[1]).not.toContain("password_otps");
});

test("남의 기록은 내 파일에 들어오지 않는다", async ({ page, browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const mine = await signUpAndOnboard(page);
  await seedFood(mine, "내가 먹은 것");

  // 다른 사람 계정으로 같은 날 다른 음식을 기록해 둔다.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const theirs = await signUpAndOnboard(otherPage);
  await seedFood(theirs, "남이 먹은 것");

  const theirCsv = await (await otherPage.request.get("/api/export/diet")).text();
  expect(theirCsv).toContain("남이 먹은 것");
  expect(theirCsv).not.toContain("내가 먹은 것");
  await other.close();

  const myCsv = await (await page.request.get("/api/export/diet")).text();
  expect(myCsv).toContain("내가 먹은 것");
  expect(myCsv).not.toContain("남이 먹은 것");
});

test("설정 → 내 데이터 내보내기 화면에서 네 가지를 받을 수 있다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /내 데이터 내보내기/ }).click();
  await page.waitForURL("**/settings/export");

  for (const kind of ["workouts", "body", "diet", "backup"]) {
    await expect(page.getByTestId(`export-${kind}`)).toBeVisible();
  }
  // 무엇을 빼는지 화면에 적혀 있어야 한다 — 관측이 아니라 약속이다.
  await expect(page.getByText(/일부러 빼는 것/)).toBeVisible();
  await expect(page.getByText(/앱 푸시 토큰/)).toBeVisible();

  // 계정 삭제 안내에서도 먼저 받아 가라고 알린다.
  await page.goto("/account-deletion", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("link", { name: "내 데이터 내보내기" }),
  ).toBeVisible();
});
