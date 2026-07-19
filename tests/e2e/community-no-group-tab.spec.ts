import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// #11: 커뮤니티에서 '그룹' 게시판(탭)을 없앤다. 오운완/운동/내 글만. 그룹원 공개 글은
// 오운완·운동에 섞이고 그룹명 태그로 구분(그룹 태그 렌더는 아래에서 확인).

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("커뮤니티에 그룹 탭이 없다 — 오운완/운동/내 글만(#11)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/community", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await expect(page.getByRole("button", { name: "오운완", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "운동", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "내 글", exact: true })).toBeVisible();
  // '그룹' 탭은 없어야 한다.
  await expect(page.getByRole("button", { name: "그룹", exact: true })).toHaveCount(0);
});

test("그룹원 공개 글은 오운완에 그룹명 태그로 뜬다(#11)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 그룹 만들고 가입 + 그룹전용 오운완 글 하나 삽입.
  await dbQuery(
    `insert into public.groups (id, name, owner_id, invite_token)
     values (gen_random_uuid(), 'E2E런닝크루', ${uid}, substr(md5(random()::text),1,8))`,
    [email],
  );
  const gid = `(select id from public.groups where name='E2E런닝크루' and owner_id=${uid} limit 1)`;
  await dbQuery(
    `insert into public.group_members (group_id, user_id)
     values (${gid}, ${uid}) on conflict do nothing`,
    [email],
  );
  await dbQuery(
    `insert into public.community_posts
       (user_id, group_id, visibility, photo_url, caption)
     values (${uid}, ${gid}, 'group',
       'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Squats/0.jpg',
       '오늘 러닝 완료!')`,
    [email],
  );

  await page.goto("/community", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // 오운완 탭(기본)에 그룹명 태그가 보여야 한다.
  await expect(page.getByText("# E2E런닝크루").first()).toBeVisible({
    timeout: 8000,
  });
});
