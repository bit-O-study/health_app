import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("오늘 워밍업만 추가·삭제하며 루틴을 보존하고 스쿼트 버튼이 모바일 안에 남는다", async ({ page }) => {
  test.skip(!hasDb, "Live test DB unavailable");
  test.setTimeout(180_000);
  const email = await createOnboardedAccount(page);
  const uid = "(select id from auth.users where lower(email)=lower($1))";
  await dbQuery(`update public.user_routines set splits=0,variant_id='custom',custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,start_date=(now() at time zone 'Asia/Seoul')::date,day_index_migrated=true,rest_date=null,override_date=null,override_block=null where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`insert into public.routine_exercises(user_id,day_index,focus,position,exercise_id,equipment,sets,reps,weight_kg) values (${uid},0,'lower',0,'squat','barbell',3,10,20),(${uid},0,'lower',1,'goblet-squat','dumbbell',3,10,12)`, [email]);
  const original = await dbQuery(`select * from public.routine_exercises where user_id=${uid} order by position`, [email]);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/routine');
  await page.getByRole('link', { name: '워밍업 추가하기', exact: true }).click();
  await expect(page).toHaveURL(/\/plan\/today\?section=warmup/);
  await expect(page.getByRole('heading', { name: '오늘 워밍업 추가하기' })).toBeVisible();
  await expect(page.locator('fieldset')).toHaveCount(1);
  const editor = page.locator('fieldset');
  await editor.getByRole('button', { name: '추가', exact: true }).click();
  await editor.getByRole('button', { name: '추가', exact: true }).click();
  const remove = editor.getByRole('button', { name: '삭제', exact: true }).last();
  const box = await remove.boundingBox();
  const row = await remove.locator('..').boundingBox();
  expect(row!.x + row!.width - box!.x - box!.width).toBeLessThan(14);
  expect(box!.y - row!.y).toBeLessThan(14);
  await remove.click();
  await expect(editor.getByRole('button', { name: '삭제', exact: true })).toHaveCount(1);
  await editor.getByRole('button', { name: '저장', exact: true }).click();
  await expect(editor.getByText('저장됨', { exact: true })).toBeVisible();
  expect(await dbQuery(`select * from public.routine_conditioning where user_id=${uid}`, [email])).toHaveLength(0);
  expect(await dbQuery(`select * from public.routine_exercises where user_id=${uid} order by position`, [email])).toEqual(original);
  expect(await dbQuery(`select * from public.daily_conditioning where user_id=${uid} and kind='warmup'`, [email])).toHaveLength(1);
  await page.reload();
  await expect(page.locator('fieldset').getByRole('button', { name: '삭제', exact: true })).toHaveCount(1);
  await page.locator('fieldset').getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('저장됨', { exact: true })).toBeVisible();
  await page.goto('/routine');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  for (const name of ['스쿼트', '고블릿 스쿼트']) {
    const title = page.getByTestId('guided-scroll').getByRole('heading', {name, exact:true});
    await expect(title).toBeVisible();
    for(const width of [320,360,390,430]) {
      await page.setViewportSize({width,height:780});
      expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
      const camera = page.getByTestId('rep-camera-open');
      await expect(camera).toBeVisible();
      const r=await camera.boundingBox();
      expect(r!.x).toBeGreaterThanOrEqual(0);
      expect(r!.x+r!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({path:`test-results/workout-mobile/live-${name}.png`});
    if(name==='스쿼트') await page.getByRole('button',{name:'다음 운동',exact:true}).click();
  }
});
