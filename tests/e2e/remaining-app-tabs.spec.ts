import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { hasDb, dbQuery } from "./helpers/db";
const uid = `(select id from auth.users where email=$1)`;

test("식단 즐겨찾기 저장·담기 및 앱별 메뉴와 그룹 로고", async ({ page }, info) => {
  test.skip(!hasDb,"DB required"); test.setTimeout(240_000);
  const email=await createOnboardedAccount(page);
  await dbQuery(`insert into food_logs(user_id,for_date,meal,position,name,kcal,protein_g,carbs_g,fat_g,amount) values (${uid},(now() at time zone 'Asia/Seoul')::date,'breakfast',0,'검증 식사',450,30,50,15,'1인분')`,[email]);
  await page.goto("/diet/history",{waitUntil:"networkidle"});
  const nav=page.getByRole("navigation",{name:"주요 메뉴"});
  await expect(nav.getByRole("link")).toHaveText(["오늘 식단","기록·영양","홈","즐겨찾기","음식 검색"]);
  await expect(page.getByText("450 kcal",{exact:true}).first()).toBeVisible();
  await nav.getByRole("link",{name:"즐겨찾기",exact:true}).click();
  await page.getByRole("button",{name:"검증 식사 즐겨찾기 추가",exact:true}).click();
  await expect(page.getByRole("button",{name:"검증 식사 담기",exact:true})).toBeVisible();
  await page.reload({waitUntil:"networkidle"});
  await expect(page.getByRole("button",{name:"검증 식사 담기",exact:true})).toBeVisible();
  await page.getByLabel("담을 끼니",{exact:true}).selectOption("lunch");
  await page.getByRole("button",{name:"검증 식사 담기",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("오늘 점심");
  await nav.getByRole("link",{name:"기록·영양",exact:true}).click();
  await expect(page.getByText("900 kcal",{exact:true}).first()).toBeVisible();
  await expect(nav.getByRole("link",{name:"기록·영양",exact:true})).toHaveAttribute("aria-current","page");
  await page.screenshot({path:info.outputPath("diet-nutrition.png"),fullPage:true});
  await page.goto("/community/mine",{waitUntil:"networkidle"});
  await expect(nav.getByRole("link")).toHaveText(["피드","운동 영상","홈","루틴 공유","내 글"]);
  for(const label of ["운동 영상","루틴 공유","내 글"]) { await nav.getByRole("link",{name:label,exact:true}).click(); await expect(nav.getByRole("link",{name:label,exact:true})).toHaveAttribute("aria-current","page"); }
  await page.goto("/groups/find",{waitUntil:"networkidle"});
  await expect(nav.getByRole("link")).toHaveText(["내 그룹","그룹 찾기","홈","그룹 알림","내 활동"]);
  await expect(page.getByRole("link",{name:"헬쑤 홈",exact:true})).toBeVisible();
  for(const label of ["그룹 알림","내 활동"]) { await nav.getByRole("link",{name:label,exact:true}).click(); await expect(nav.getByRole("link",{name:label,exact:true})).toHaveAttribute("aria-current","page"); await expect(page.getByText("표시할 그룹 글이 없어요.")).toBeVisible(); }
  const [group]=await dbQuery<{id:string}>(`insert into groups(owner_id,name) values (${uid},'로고 검증 그룹') returning id`,[email]);
  await dbQuery(`insert into group_members(group_id,user_id,role,display_name) values ($2,${uid},'owner','검증 회원') on conflict(group_id,user_id) do nothing`,[email,group.id]);
  await page.goto(`/groups?g=${group.id}`,{waitUntil:"networkidle"});
  await expect(page.getByRole("link",{name:"헬쑤 홈",exact:true})).toBeVisible();
  await page.goto("/groups/notifications",{waitUntil:"networkidle"});
  await expect(page.getByText(/로고 검증 그룹에 참여했어요/)).toBeVisible();
});

test("트레이너 전용 메뉴·처방 동의·본인 알림만 표시·이용권 차단", async ({page,browser},info)=>{
  test.skip(!hasDb,"DB required"); test.setTimeout(180_000);
  const email=await createOnboardedAccount(page);
  await page.goto("/trainer/notifications"); await expect(page).toHaveURL(/settings\/trainer-pass/);
  const context=await browser.newContext();
  try {
    const other=await context.newPage(); const otherEmail=await createOnboardedAccount(other);
    await dbQuery(`insert into pt_passes(trainer_id,name,phone,status,starts_on,ends_on) select id,'메뉴 검증','01012345678','active',current_date-1,current_date+30 from auth.users where email in ($1,$2)`,[email,otherEmail]);
    await dbQuery(`insert into pt_links(trainer_id,member_id,member_name) values (${uid},(select id from auth.users where email=$2),'공유 제한 회원')`,[email,otherEmail]);
    await dbQuery(`insert into pt_notifications(created_by,trainer_id,kind,channel,phone,payload) values ((select id from auth.users where email=$2),${uid},'disconnect','ATA','01012345678','{"member":"내 해제 알림"}'), (${uid},(select id from auth.users where email=$2),'disconnect','ATA','01012345678','{"member":"다른 트레이너 비밀"}')`,[email,otherEmail]);
    await page.goto("/trainer/members",{waitUntil:"networkidle"}); const nav=page.getByRole("navigation",{name:"주요 메뉴"});
    await expect(nav.getByRole("link")).toHaveText(["대시보드","회원 관리","홈","운동 처방","관리 알림"]);
    await expect(page.getByText("공유 제한 회원",{exact:true})).toBeVisible();
    await nav.getByRole("link",{name:"운동 처방",exact:true}).click();
    await expect(page.getByText("회원의 처방 허용을 기다리고 있어요.")).toBeVisible();
    await expect(page.getByRole("link",{name:"처방 작성·수정 →"})).toHaveCount(0);
    await nav.getByRole("link",{name:"관리 알림",exact:true}).click();
    await expect(page.getByText(/회원 연결 해제 · 내 해제 알림/)).toBeVisible();
    await expect(page.getByText(/다른 트레이너 비밀/)).toHaveCount(0);
    await expect(page.getByText("알림톡 · 발송 대기",{exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath("trainer-notifications.png"),fullPage:true});
    await dbQuery(`update pt_passes set status='canceled' where trainer_id=${uid}`,[email]);
    for(const route of ["members","prescriptions","notifications"]) { await page.goto(`/trainer/${route}`); await expect(page).toHaveURL(/settings\/trainer-pass/); }
  } finally { await context.close(); }
});
