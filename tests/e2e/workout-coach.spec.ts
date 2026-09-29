import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 운동모드 한 줄 코치(2026-09-29) — 영상·사진 동작에 맞춘 한 줄 자막, 휴식 카드의 다음·조심.
 *
 * ⚠ Playwright 의 Chromium 은 H.264(mp4)를 재생하지 못해 영상 재생 시각이 흐르지 않는다.
 *   영상 구간 계산은 단위테스트(motion-caption.test)가 지키고, 여기서는 영상 자막이 '동작 맞춤'
 *   으로 붙는지와, 사진 교차 재생에 맞춰 칸이 바뀌는지를 본다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedDay(email: string, rows: string) {
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
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values ${rows}`,
    [email],
  );
}

test("🔴 사진 운동: 시작/끝 자세 표시와 자막이 사진에 맞춰 바뀌고, 휴식 카드에 다음 세트·조심", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 펙덱 — 실사 사진 두 장(Butterfly), 영상 없음.
  await seedDay(email, `(${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20)`);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  // 새 계정 = 처음 하는 운동 → 첫 세트 전 준비 카드가 먼저, 그동안 한 줄 자막은 숨는다(2단계).
  const intro = page.getByTestId("intro-card");
  await expect(intro).toBeVisible({ timeout: 15_000 });
  await expect(intro).toContainText("처음 해 보는 운동이에요");
  expect(await intro.locator("li").count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("motion-caption")).toHaveCount(0);
  await intro.getByRole("button", { name: "준비됐어요" }).click();
  await expect(intro).toHaveCount(0);

  const caption = page.getByTestId("motion-caption");
  await expect(caption).toBeVisible({ timeout: 15_000 });
  await expect(caption).toHaveAttribute("data-synced", "1");
  await expect(page.getByTestId("pose-label-start")).toBeAttached();
  await expect(page.getByTestId("pose-label-end")).toBeAttached();
  // 사진이 바뀌면 칸도 바뀐다(준비 → 동작/돌아오기).
  await expect(caption).toHaveAttribute("data-slot", "0");
  await expect(caption).not.toHaveAttribute("data-slot", "0", { timeout: 4000 });
  await expect(caption).toContainText(/동작|돌아오기/);

  // 세트 완료 → 휴식 카드: 고정 문구 대신 다음 세트와 조심 한 줄.
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(page.getByTestId("rest-next")).toContainText("세트 2/3 · 12회 · 20kg");
  await expect(page.getByTestId("rest-caution")).toContainText("조심 ·");
  await expect(page.getByText("충분히 쉬고 다음 세트로")).toHaveCount(0);
});

test("AI 영상 운동: 자막이 영상 동작 맞춤으로 붙는다 · 다음 운동 미리보기", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 바벨 백스쿼트(ai-v3 영상, 2세트) → 펙덱.
  await seedDay(
    email,
    `(${uid}, 0, 'chest', 0, 'barbell-back-squat', 'barbell', 2, 5, 60),
     (${uid}, 0, 'chest', 1, 'pec-deck', 'machine', 3, 12, 20)`,
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  await page.getByTestId("intro-card").getByRole("button", { name: "준비됐어요" }).click();
  const video = page.locator("video").first();
  await expect(video).toHaveAttribute("src", /\/exercise-guides\/ai-v3\/barbell-back-squat(-dark)?\.mp4/, { timeout: 15_000 });
  const caption = page.getByTestId("motion-caption");
  await expect(caption).toHaveAttribute("data-synced", "1");
  await expect(caption).toContainText("준비");
  // 틀 문장 조사가 다듬어져 있다.
  await expect(caption).not.toContainText("을(를)");

  // 1세트 → 휴식(다음 세트) → 마지막 세트 → 다음 운동으로 넘어가며 휴식 카드가 다음 운동을 알려 준다.
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByTestId("rest-next")).toContainText("세트 2/2 · 5회 · 60kg");
  await page.getByRole("button", { name: "휴식 끝내기" }).click();
  await page.getByRole("button", { name: "마지막 세트 완료" }).click();
  await expect(page.getByTestId("rest-next")).toContainText("다음 운동 · 펙덱", { timeout: 10_000 });
});

test("🔴 준비 카드는 처음 하는 운동에만 — 해 본 운동은 없고, 넘긴 운동은 다시 안 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seedDay(
    email,
    `(${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20),
     (${uid}, 0, 'chest', 1, 'barbell-back-squat', 'barbell', 3, 5, 60)`,
  );
  // 펙덱은 어제 해 봤다.
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${today} - 1, gen_random_uuid(), 'done', 'pec-deck', 'machine', 'chest', 3, 12, 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  // 펙덱(해 봄) — 준비 카드 없이 바로 한 줄 자막.
  await expect(page.getByRole("heading", { name: "펙덱 플라이" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("motion-caption")).toBeVisible();
  await expect(page.getByTestId("intro-card")).toHaveCount(0);

  // 스쿼트(처음) — 준비 카드.
  await page.getByRole("button", { name: "다음 운동" }).click();
  const intro = page.getByTestId("intro-card");
  await expect(intro).toBeVisible();
  await intro.getByRole("button", { name: "준비됐어요" }).click();
  await expect(intro).toHaveCount(0);

  // 운동모드를 닫았다가 다시 열어도, 넘긴 운동의 카드는 다시 안 뜬다(기기 기억).
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /운동 시작|다시 운동하기|이어서/ }).first().click();
  // 운동모드는 보던 운동을 기억한다 — 스쿼트가 아니면 그리로 옮긴다.
  const squat = page.getByRole("heading", { name: "바벨 백 스쿼트", exact: true });
  await page.waitForTimeout(800);
  if (!(await squat.isVisible())) await page.getByRole("button", { name: "다음 운동" }).click();
  await expect(squat).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("motion-caption")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("intro-card")).toHaveCount(0);
});

test("🔴 음성 코치(기본 꺼짐): 켜면 세트 요령, 휴식 10초 전 다음 세트 · 등 운동 뒷모습 · 자막 안 가림", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  // 음성은 실제로 틀 수 없으니 읽으려던 문장을 기록한다.
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    const fake = {
      speak: (u: { text: string }) => spoken.push(u.text),
      cancel: () => {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      constructor(t: string) {
        this.text = t;
      }
    };
  });
  const spoken = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.slice());

  const email = await createOnboardedAccount(page);
  await seedDay(
    email,
    `(${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20),
     (${uid}, 0, 'chest', 1, 'barbell-row', 'barbell', 3, 10, 40)`,
  );
  // 둘 다 해 본 운동(준비 카드 없이).
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${today} - 1, gen_random_uuid(), 'done', 'pec-deck', 'machine', 'chest', 3, 12, 20),
            (${uid}, ${today} - 1, gen_random_uuid(), 'done', 'barbell-row', 'barbell', 'chest', 3, 10, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await expect(page.getByRole("heading", { name: "펙덱 플라이" })).toBeVisible({ timeout: 15_000 });

  // 자극 부위 그림이 한 줄 자막을 가리지 않는다(그림은 미디어 안, 자막은 그 아래).
  const inset = page.getByRole("button", { name: "자극 부위 크게 보기" });
  const caption = page.getByTestId("motion-caption");
  const ib = (await inset.boundingBox())!;
  const cb = (await caption.boundingBox())!;
  expect(ib.y + ib.height).toBeLessThanOrEqual(cb.y + 1);

  // 기본 꺼짐 — 아무 말도 안 한다.
  const toggle = page.getByTestId("voice-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(500);
  expect(await spoken()).toEqual([]);

  // 켜면 지금 세트 요령.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await spoken()).join("|")).toContain("1세트.");

  // 휴식 30초 → 10초 남았을 때 다음 세트.
  await page.getByRole("button", { name: "0:30" }).click();
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect
    .poll(async () => (await spoken()).join("|"), { timeout: 30_000, intervals: [1000] })
    .toContain("2세트째, 12회, 20킬로. 10초 남았어요.");

  // 등 운동(바벨 로우)은 자극 부위를 뒷모습으로.
  await page.getByRole("button", { name: "휴식 끝내기" }).click();
  await page.getByRole("button", { name: "다음 운동" }).click();
  await expect(page.getByRole("heading", { name: "로우", exact: true, level: 2 })).toBeVisible();
  await expect(inset).toHaveAttribute("data-view", "posterior");

  // 켠 설정은 기억된다.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /운동 시작|다시 운동하기|이어서/ }).first().click();
  await expect(page.getByTestId("voice-toggle")).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
});
