import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀: 저장된 모드가 있으면 '/'(모드 선택)는 '모드를 선택해주세요'를 보여주지 않고
// 바로 /routine 으로 간다. (과거: 모드선택 화면이 잠깐 떴다가 풀 리로드로 넘어가
// '제일 초기화면 갔다 들어오는' 느낌 → 모드선택 안 그림 + 소프트 내비로 수정.)

test("저장된 모드가 있으면 / 가 모드선택 깜빡임 없이 /routine 으로 간다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // 모드 저장(루틴).
  await page.evaluate(() =>
    window.localStorage.setItem("training.mode.v1", "routine"),
  );

  await page.goto("/", { waitUntil: "networkidle" });

  // 결국 /routine 으로 가고, 모드 선택 문구는 보이지 않아야 한다.
  await expect(page).toHaveURL(/\/routine(\?|$)/, { timeout: 8000 });
  await expect(page.getByText("모드를 선택해주세요")).toHaveCount(0);
});

// 쿠키(durable)가 있으면 서버에서 바로 리다이렉트 — 앱에서 localStorage 가 사라져도
// 모드 선택이 다시 뜨지 않게 한 핵심 수정.
test("모드 쿠키가 있으면 / 는 선택화면 없이 서버에서 /routine 으로", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await context.addCookies([
    { name: "training_mode", value: "routine", url: baseURL! },
  ]);

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/routine(\?|$)/, { timeout: 8000 });
  await expect(page.getByText("모드를 선택해주세요")).toHaveCount(0);
});

// 3단 폴백 마지막: 쿠키·localStorage 가 모두 없어도 계정(DB)에 모드가 있으면 선택화면 없이
// 바로 메인으로. (앱에서 클라 저장이 다 날아가도 계정 기준으로 복원.)
test("쿠키·localStorage 없어도 계정 DB 모드가 있으면 / 는 선택화면 없이 이동", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  await dbQuery(
    `update public.profiles set training_mode='powerlifting' where user_id=${uid}`,
    [email],
  );
  // 신규 가입이라 training_mode 쿠키·localStorage 는 없음(auth 쿠키는 유지). DB 만 있는 상태.
  await page.goto("/routine", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.removeItem("training.mode.v1"));

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/powerlifting(\?|$)/, { timeout: 8000 });
  await expect(page.getByText("모드를 선택해주세요")).toHaveCount(0);
});

// 설정 → 운동 모드 변경(?choose=1)은 쿠키가 있어도 선택 화면을 보여줘야 한다.
test("?choose=1 이면 쿠키가 있어도 모드 선택 화면을 보여준다", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await context.addCookies([
    { name: "training_mode", value: "routine", url: baseURL! },
  ]);

  await page.goto("/?choose=1", { waitUntil: "networkidle" });
  await expect(page.getByText("모드를 선택해주세요")).toBeVisible({
    timeout: 8000,
  });
});
