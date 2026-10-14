import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 기본 확인창(window.confirm) 대신 앱 확인창(2026-10-14).
// 안드로이드 앱(WebView)에서 기본 창은 주소가 박힌 어색한 창으로 뜨거나 막힐 수 있다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("그룹 삭제는 앱 확인창으로 묻고, 취소하면 그대로 · 확인하면 지워진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  const [{ id }] = await dbQuery<{ id: string }>(
    `insert into public.groups (name, owner_id) values ('E2E 확인창 그룹', ${uid}) returning id`,
    [email],
  );
  await dbQuery(`insert into public.group_members (group_id, user_id) values ($2, ${uid}) on conflict do nothing`, [email, id]);

  // 기본 창이 뜨면 테스트를 실패시킨다.
  let nativeDialog = false;
  page.on("dialog", async (d) => {
    nativeDialog = true;
    await d.dismiss();
  });

  await page.goto("/groups/manage", { waitUntil: "networkidle" });
  const del = page.getByRole("button", { name: "그룹 삭제" }).first();
  await expect(del).toBeVisible({ timeout: 15_000 });

  await del.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("되돌릴 수 없어요");
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
  expect((await dbQuery<{ n: number }>(`select count(*)::int n from public.groups where id=$1`, [id]))[0].n).toBe(1);

  await del.click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await expect
    .poll(async () => (await dbQuery<{ n: number }>(`select count(*)::int n from public.groups where id=$1`, [id]))[0].n, { timeout: 15_000 })
    .toBe(0);
  expect(nativeDialog).toBe(false);
});
