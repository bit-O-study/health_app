import { test, expect } from '@playwright/test';
import { createOnboardedAccount } from './helpers/auth';
import { dbQuery, hasDb, openDbClient } from './helpers/db';
const uid = '(select id from auth.users where email=$1)';
async function seed(email: string, count: number) {
  await dbQuery(`insert into community_posts(user_id,visibility,photo_url,caption,created_at) select ${uid},'group','https://example.com/test.jpg','upgrade-' || n,now() - n * interval '1 minute' from generate_series(1,$2::int) n`, [email,count]);
}
test('내 글 검색은 오래된 글을 찾고 더 보기는 중복 없이 추가한다', async ({ page }) => {
  test.skip(!hasDb);
  const email = await createOnboardedAccount(page);
  await seed(email, 125);
  await page.goto('/community/mine');
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(20);
  await page.route('**/community/mine', async route => {
    if (route.request().method() === 'POST') { await route.abort(); return; }
    await route.continue();
  });
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '게시물을 불러오지 못했어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(20);
  await page.unroute('**/community/mine');
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(40);
  await page.getByRole('link', { name: '게시물 보기', exact: true }).nth(30).click();
  await page.getByRole('button', { name: '커뮤니티', exact: true }).click();
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(40);
  await page.getByRole('searchbox', { name: '게시물 검색' }).fill('upgrade-125');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(1);
  await expect(page.locator('li').filter({ has: page.getByRole('link', { name: '게시물 보기', exact: true }) })).toContainText('upgrade-125');
});
test('사진 없는 기록 공유는 원본을 보존하고 게시 시점 요약을 유지한다', async ({ page }) => {
  test.skip(!hasDb);
  const email = await createOnboardedAccount(page);
  await dbQuery(`insert into exercise_completions(user_id,for_date,exercise_row_id,status,exercise_id,sets) values(${uid},'2026-09-29',gen_random_uuid(),'done','bench-press',3)`,[email]);
  await dbQuery(`insert into workout_sessions(user_id,for_date,duration_sec) values(${uid},'2026-09-29',1800)`,[email]);
  await page.goto('/community');
  await page.getByRole('button', { name: '오운완 인증하기', exact: true }).click();
  await page.getByLabel('운동 기록 선택').selectOption('2026-09-29');
  await expect(page.getByTestId('workout-share-card')).toContainText('벤치프레스');
  await page.getByPlaceholder('오늘 운동 한마디 (선택)').fill('기록 공유 테스트');
  await page.route('**/community', async route => {
    if (route.request().method() === 'POST' && route.request().postData()?.includes('workoutDate')) {
      await route.fetch();
      const retry = await route.fetch();
      await route.fulfill({ response: retry });
    } else await route.continue();
  });
  await page.getByRole('button', { name: '인증 올리기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '오운완 인증' })).toHaveCount(0);
  const rows = await dbQuery<{id:string; photo_url:string|null; workout_snapshot:{exercises:{name:string;sets:number}[]}}>(`select id,photo_url,workout_snapshot from community_posts where user_id=${uid} and caption='기록 공유 테스트'`, [email]);
  expect(rows).toHaveLength(1);
  expect(rows[0].photo_url).toBeNull();
  expect(rows[0].workout_snapshot.exercises[0]).toEqual({name:'벤치프레스',sets:3});
  const original = await dbQuery<{sets:number}>(`select sets from exercise_completions where user_id=${uid}`, [email]);
  expect(original[0].sets).toBe(3);
  await dbQuery(`update exercise_completions set sets=5 where user_id=${uid}`,[email]);
  await page.goto('/community/' + rows[0].id);
  await expect(page.getByTestId('workout-share-card')).toContainText('3세트');
  await expect(page.getByTestId('workout-share-card')).toContainText('30분');
  await expect(page.getByRole('img', { name: '오운완 인증' })).toHaveCount(0);
  await expect(page.locator('.app-splash')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/community-workout-share.png', fullPage: true });
  for (const width of [320,390,430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByTestId('workout-share-card')).toBeVisible();
  }
});
test('피드 RPC는 본인 필터와 그룹 공개 범위를 서버에서 강제한다', async ({ page }) => {
  test.skip(!hasDb);
  const email = await createOnboardedAccount(page);
  await seed(email,1);
  const own = await dbQuery<{id:string}>(`select id from auth.users where email=$1`,[email]);
  const db = await openDbClient();
  try {
    await db.query('begin');
    await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[own[0].id]);
    const mine = await db.query("select * from community_feed_page('mine','upgrade-1')");
    expect(mine.rows).toHaveLength(1);
    await db.query("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true)");
    const hidden = await db.query("select * from community_feed_page('workout','upgrade-1')");
    expect(hidden.rows).toHaveLength(0);
  } finally { await db.query('rollback'); await db.end(); }
});

test('이번 주 인기는 최근 120개 밖의 글도 좋아요로 정렬한다', async ({ page }) => {
  test.skip(!hasDb);
  const email = await createOnboardedAccount(page);
  await seed(email,130);
  await dbQuery(`insert into community_likes(user_id,post_id) select ${uid},id from community_posts where user_id=${uid} and caption='upgrade-130'`,[email]);
  await page.goto('/community?view=popular&q=upgrade-');
  await expect(page.getByRole('link', { name: '게시물 보기', exact: true })).toHaveCount(20);
  await expect(page.locator('li').filter({ has: page.getByRole('link', { name: '게시물 보기', exact: true }) }).first()).toContainText('upgrade-130');
});
