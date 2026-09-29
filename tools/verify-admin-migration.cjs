/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS 검증 스크립트(.cjs)라 require 가 맞다. */
const fs = require('node:fs');
const { parseEnv } = require('node:util');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { chromium, expect } = require('@playwright/test');

async function main() {
  const env = { ...parseEnv(fs.readFileSync('.env','utf8')), ...parseEnv(fs.readFileSync('.env.local','utf8')) };
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
  const email = `admin-migration-${randomUUID()}@example.com`, password = `Verify!${randomUUID()}`;
  const base = process.env.ADMIN_TEST_URL || 'http://127.0.0.1:3120';
  let user, browser;
  const checks = [];
  try {
    const result = await db.auth.admin.createUser({email,password,email_confirm:true});
    if(result.error) throw result.error; user = result.data.user;
    const admin = await db.from('admins').insert({email}); if(admin.error) throw admin.error;
    const pass = await db.from('pt_passes').insert({trainer_id:user.id,name:'이관 검증 트레이너',phone:'01012345678',status:'requested'}); if(pass.error) throw pass.error;
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:393,height:852}});
    page.setDefaultTimeout(20000);
    const runtimeErrors=[];page.on('pageerror',e=>runtimeErrors.push(e.message));
    await page.goto(base+'/admin/health/trainers');
    await expect(page).toHaveURL(/\/login/); checks.push('anonymous gate');
    await page.getByLabel('이메일',{exact:true}).fill(email);await page.getByLabel('비밀번호',{exact:true}).fill(password);
    await page.getByRole('button',{name:'로그인',exact:true}).click();await page.waitForURL(/\/admin/);
    for(const [route,title] of [['billing','팀 요금제'],['trainers','트레이너 이용권'],['events','실사용 오류'],['crons','크론 실행'],['test','테스트'],['settings','관리자 설정'],['support','고객센터'],['support/notifications','고객센터 알림']]) {
      await page.goto(base+'/admin/health/'+route);
      await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
      checks.push('mobile '+route);
    }
    await page.getByRole('checkbox',{name:'카카오 문의 알림 받기'}).uncheck();
    await page.getByRole('button',{name:'설정 저장',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('처리했어요');
    const connection=await db.from('support_kakao_connections').select('enabled').eq('user_id',user.id).single();
    expect(connection.data.enabled).toBe(false); checks.push('operator-only notification settings');
    await page.goto(base+'/admin/health/settings');await expect(page.getByText('입금 계좌 안내',{exact:true})).toBeVisible();await expect(page.getByText('펫(늑대 키우기 — 관리자 공개 후 이용)',{exact:true})).toBeVisible();checks.push('deposit and pet settings');
    await page.goto(base+'/admin/health/trainers');
    const card=page.locator('section').filter({has:page.getByRole('heading',{name:'이관 검증 트레이너 · 01012345678',exact:true})});
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
    await card.getByLabel('시작일',{exact:true}).fill(today);await card.getByLabel('종료일',{exact:true}).fill('2099-12-31');await card.getByLabel('회원 수',{exact:true}).fill('3');
    await card.getByRole('button',{name:'기간 승인·변경',exact:true}).click();await expect(card.getByRole('button',{name:'이용권 해지',exact:true})).toBeVisible();
    let saved=await db.from('pt_passes').select('status,seats').eq('trainer_id',user.id).single();expect(saved.data).toMatchObject({status:'active',seats:3});
    await card.getByRole('button',{name:'이용권 해지',exact:true}).click();await expect(card.getByText('해지됨',{exact:true})).toBeVisible();checks.push('trainer approve and cancel');
    // Revocation must protect a previously authenticated console session too.
    const revoked=await db.from('admins').delete().eq('email',email);if(revoked.error)throw revoked.error;
    await page.goto(base+'/admin/health/trainers');await expect(page).toHaveURL(/\/login/);checks.push('revoked admin denied');
    expect(runtimeErrors).toEqual([]);
    console.log(JSON.stringify({ok:true,checks}));
  } finally {
    if(browser)await browser.close();
    if(user){const a=await db.from('admins').delete().eq('email',email);const u=await db.auth.admin.deleteUser(user.id);if(a.error||u.error)throw new Error('Test account cleanup failed');console.log('Temporary admin and trainer fixtures removed');}
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
