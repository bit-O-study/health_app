import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { hasDb, dbQuery } from "./helpers/db";

test("관리자 이용권 승인·해지·재승인과 앱 접근 제어", async ({ page, browser }) => {
  test.skip(!hasDb, "needs DB fixtures");
  test.setTimeout(150_000);
  const trainerEmail = await createOnboardedAccount(page);
  const trainerName = `승인검증 ${trainerEmail}`;
  await page.goto("/admin/trainers");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/settings/trainer-pass");
  await page.getByLabel("트레이너 이름", { exact: true }).fill(trainerName.slice(0, 80));
  await page.getByLabel("알림 받을 휴대폰 번호", { exact: true }).fill("01012345678");
  await page.getByRole("button", { name: "등록 신청", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("신청했어요");
  const adminContext = await browser.newContext();
  try {
    const admin = await adminContext.newPage();
    const adminEmail = await createOnboardedAccount(admin);
    await dbQuery("insert into public.admins(email) values($1)", [adminEmail]);
    const [dates] = await dbQuery<{ today: string; until: string }>("select (now() at time zone 'Asia/Seoul')::date::text as today, ((now() at time zone 'Asia/Seoul')::date+30)::text as until");
    await admin.goto("/admin/trainers");
    const card = admin.locator("section").filter({ has: admin.getByRole("heading", { name: `${trainerName.slice(0, 80)} · 01012345678`, exact: true }) });
    await card.getByLabel("시작일", { exact: true }).fill(dates.today);
    await card.getByLabel("종료일", { exact: true }).fill(dates.until);
    await card.getByLabel("회원 수", { exact: true }).fill("20");
    await card.getByRole("button", { name: "기간 승인·변경", exact: true }).click();
    await expect(card.getByRole("status")).toHaveText("저장했어요.");
    const grid = page.getByRole("navigation", { name: "앱", exact: true });
    await page.goto("/home");
    await expect(grid.getByRole("link", { name: "헬스 트레이너", exact: true })).toBeVisible();
    await page.goto("/trainer");
    await expect(page.getByRole("heading", { name: "담당 회원 · 0명", exact: true })).toBeVisible();
    await card.getByRole("button", { name: "이용권 해지", exact: true }).click();
    await expect(card.getByText("해지됨", { exact: true })).toBeVisible();
    await page.goto("/home");
    await expect(grid.getByRole("link", { name: "헬스 트레이너", exact: true })).toHaveCount(0);
    await page.goto("/trainer");
    await expect(page).toHaveURL(/\/settings\/trainer-pass$/);
    await card.getByRole("button", { name: "기간 승인·변경", exact: true }).click();
    await expect(card.getByText("승인됨", { exact: true })).toBeVisible();
    await page.goto("/trainer");
    await expect(page.getByRole("heading", { name: "담당 회원 · 0명", exact: true })).toBeVisible();
    const [pass] = await dbQuery<{ status: string; seats: number }>("select status,seats from public.pt_passes where trainer_id=(select id from auth.users where email=$1)", [trainerEmail]);
    expect(pass).toEqual({ status: "active", seats: 20 });
  } finally {
    await adminContext.close();
  }
});