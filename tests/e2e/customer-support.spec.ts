import {expect,test} from '@playwright/test';
import sharp from 'sharp';
import {createOnboardedAccount} from './helpers/auth';
import {dbQuery,hasDb} from './helpers/db';
test('고객센터 접수·회원 격리·콘솔 이전·관리자 답변·메모·해결 후 재문의',async({page,browser})=>{
 test.skip(!hasDb,'DB fixtures required');test.setTimeout(300000);
 await createOnboardedAccount(page);
 await page.goto('/settings');await page.getByRole('link',{name:'고객센터',exact:true}).click();
 await page.getByRole('link',{name:'버그·불편 신고 / 문의하기 →'}).click();
 await page.getByLabel('문의 종류').selectOption('bug');
 await page.getByLabel('제목',{exact:true}).fill('고객센터 검증: 운동 편집');
 await page.getByLabel('내용',{exact:true}).fill('운동 편집 저장 버튼을 눌렀는데 반응이 없어요.');
 await page.getByRole('button',{name:'문의 접수',exact:true}).click();
 await expect(page.getByRole('status').first()).toContainText('문의가 접수됐어요');
 const ticket=page.url().split('/support/')[1].split('?')[0];
 const otherContext=await browser.newContext();const adminContext=await browser.newContext();
 try{
  const other=await otherContext.newPage();await createOnboardedAccount(other);await other.goto(`/support/${ticket}`);await expect(other.getByText('운동 편집 저장 버튼을 눌렀는데 반응이 없어요.')).toHaveCount(0);
  const admin=await adminContext.newPage();const adminEmail=await createOnboardedAccount(admin);await dbQuery('insert into admins(email) values($1)',[adminEmail]);
  // 문의 관리는 통합 관리자 콘솔(heltch-admin /admin/health/support)로 이전 — 앱의 옛 관리 경로는 콘솔로 보낸다.
  for(const path of ['/admin/support',`/admin/support/${ticket}`]){const r=await admin.request.get(path,{maxRedirects:0});expect([307,308]).toContain(r.status());expect(r.headers().location).toBe(`https://heltch-admin.vercel.app/admin/health/support${path==='/admin/support'?'':`/${ticket}`}`);}
  // 콘솔에서 하는 관리자 답변·내부 메모·해결 처리를 같은 테이블에 기록해 회원 화면을 검증한다.
  const [adminUser]=await dbQuery<{id:string}>('select id from auth.users where lower(email)=lower($1)',[adminEmail]);
  await dbQuery('insert into support_internal_notes(ticket_id,author_id,request_id,body) values($1,$2,gen_random_uuid(),$3)',[ticket,adminUser.id,'관리자 내부 검토 기록']);
  await dbQuery('insert into support_messages(ticket_id,author_id,request_id,body,is_admin) values($1,$2,gen_random_uuid(),$3,true)',[ticket,adminUser.id,'오류를 확인했습니다. 수정 후 안내드릴게요.']);
  await dbQuery("update support_tickets set status='resolved',updated_at=now(),user_read_at=null where id=$1",[ticket]);
  await page.reload();await expect(page.getByLabel('문의 대화')).toContainText('오류를 확인했습니다.');await expect(page.getByText('관리자 내부 검토 기록')).toHaveCount(0);
  await page.getByLabel('추가 문의',{exact:true}).fill('다시 확인했지만 같은 오류가 있어요.');await page.getByRole('button',{name:'답변 보내기',exact:true}).click();await expect(page.getByLabel('문의 대화')).toContainText('다시 확인했지만');
  const [row]=await dbQuery<{status:string}>('select status from support_tickets where id=$1',[ticket]);expect(row.status).toBe('in_progress');
  await admin.goto('/admin/support/notifications');await expect(admin.getByRole('heading',{name:'내 카카오톡 연결'})).toBeVisible();await expect(admin.getByRole('link',{name:'문의 관리는 통합 관리자 콘솔에서 →'})).toHaveAttribute('href','https://heltch-admin.vercel.app/admin/health/support');
  const photo=await sharp({create:{width:80,height:80,channels:3,background:'#36a878'}}).png().toBuffer();
  await page.getByLabel('스크린샷 첨부',{exact:true}).setInputFiles({name:'support.png',mimeType:'image/png',buffer:photo});
  await page.getByRole('button',{name:'사진 첨부',exact:true}).click();
  await expect(page.getByRole('img',{name:'문의 첨부 사진',exact:true})).toBeVisible();
  await page.getByRole('img',{name:'문의 첨부 사진',exact:true}).scrollIntoViewIfNeeded();
  await expect.poll(()=>page.getByRole('img',{name:'문의 첨부 사진',exact:true}).evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  const [attachment]=await dbQuery<{id:string;bytes:number}>('select id,bytes from support_attachments where ticket_id=$1',[ticket]);expect(attachment.bytes).toBeLessThanOrEqual(512000);
  const attack=await other.request.delete('/api/support/attachments',{data:{id:attachment.id},headers:{Origin:new URL(page.url()).origin}});expect(attack.status()).toBe(403);
  await page.screenshot({path:'scripts/.verify-shots/support-member.png',fullPage:true});await admin.screenshot({path:'scripts/.verify-shots/support-settings.png',fullPage:true});
  await page.getByRole('button',{name:'사진 삭제',exact:true}).click();await expect(page.getByRole('img',{name:'문의 첨부 사진',exact:true})).toHaveCount(0);
 }finally{await otherContext.close();await adminContext.close();}
});
