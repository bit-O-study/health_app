import {expect,test} from '@playwright/test';
import sharp from 'sharp';
import {createOnboardedAccount} from './helpers/auth';
import {dbQuery,hasDb} from './helpers/db';
test('고객센터 접수·회원 격리·관리자 답변·메모·해결 후 재문의',async({page,browser})=>{
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
  await admin.goto('/admin/support');await admin.getByLabel('문의 검색').fill('고객센터 검증: 운동 편집');await admin.getByRole('button',{name:'검색',exact:true}).click();await admin.locator(`a[href="/admin/support/${ticket}"]`).click();
  await admin.getByLabel('답변 작성',{exact:true}).fill('관리자 내부 검토 기록');await admin.getByLabel('관리자 전용 메모 (회원에게 보이지 않음)').check();await admin.getByRole('button',{name:'내부 메모 저장'}).click();await expect(admin.getByLabel('내부 메모')).toContainText('관리자 내부 검토 기록');
  await admin.getByLabel('관리자 전용 메모 (회원에게 보이지 않음)').uncheck();await admin.getByLabel('답변 작성',{exact:true}).fill('오류를 확인했습니다. 수정 후 안내드릴게요.');await admin.getByRole('button',{name:'답변 보내기',exact:true}).click();await expect(admin.getByLabel('문의 대화')).toContainText('오류를 확인했습니다.');
  await admin.locator('select[name=status]').selectOption('resolved');await admin.getByRole('button',{name:'처리 정보 저장'}).click();await expect(admin.getByRole('status').first()).toContainText('변경했어요');
  await page.reload();await expect(page.getByLabel('문의 대화')).toContainText('오류를 확인했습니다.');await expect(page.getByText('관리자 내부 검토 기록')).toHaveCount(0);
  await page.getByLabel('추가 문의',{exact:true}).fill('다시 확인했지만 같은 오류가 있어요.');await page.getByRole('button',{name:'답변 보내기',exact:true}).click();await expect(page.getByLabel('문의 대화')).toContainText('다시 확인했지만');
  const [row]=await dbQuery<{status:string}>('select status from support_tickets where id=$1',[ticket]);expect(row.status).toBe('in_progress');
  await admin.goto('/admin/support/notifications');await expect(admin.getByRole('heading',{name:'내 카카오톡 연결'})).toBeVisible();
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
