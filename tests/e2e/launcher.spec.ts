import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers/auth";

test("런처 앱 이동·공통 메뉴·운동 기능 진입", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/home");
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(page.getByRole("region", { name: "운동 잔디" })).toBeVisible();
  for (const [name, path] of [["운동","/routine"],["식단","/diet"],["캘린더","/calendar"],["그룹","/groups"],["커뮤니티","/community"]]) {
    await page.getByRole("navigation", { name: "앱", exact: true }).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === path);
    await expect(nav.getByRole("link", { name: "홈", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "홈", exact: true })).toHaveAttribute("href", "/home");
    await nav.getByRole("link", {name:"홈",exact:true}).click();
    await expect(page.getByRole("navigation",{name:"앱",exact:true})).toBeVisible();
  }
  await page.getByRole("navigation",{name:"앱",exact:true}).getByRole("link",{name:"운동",exact:true}).click();
  await page.goto("/routine/records");
  await expect(page.getByRole("link",{name:"성장 그래프 →",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"운동 점수 · 근육 밸런스 →",exact:true})).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByRole("navigation",{name:"루틴 도구"}).getByRole("link",{name:"근육별 운동 선택",exact:true})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"루틴 도구"}).getByRole("link",{name:"오늘만 운동 변경",exact:true})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"루틴 도구"}).getByRole("link",{name:"루틴 설정 · 프리셋",exact:true})).toBeVisible();
  await page.goto("/exercises");
  await expect(page.getByRole("heading",{name:"운동 종목",exact:true})).toBeVisible();
});

test("식단·주간·커뮤니티 기능 진입", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/diet?view=search");
  await page.getByRole("button",{name:"아침 음식 찾기",exact:true}).click();
  await expect(page.getByText("아침 추가",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"닫기",exact:true}).click();
  await expect(page).toHaveURL(/\/diet\?view=search$/);
  await expect(page.getByText("아침 추가", { exact: true })).toHaveCount(0);
  await page.goto("/diet?view=photos");
  await expect(page.getByRole("region",{name:"사진기록"})).toBeVisible();
  await page.goto("/calendar?view=week&d=2027-01-01");
  await expect(page.getByRole("heading",{name:"2026-12-28 ~ 2027-01-03",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"다음 주",exact:true}).click();
  await expect(page.getByRole("heading",{name:"2027-01-04 ~ 2027-01-10",exact:true})).toBeVisible();
  await page.goto("/community?view=popular");
  await expect(page.getByText("현재 공개 범위에서 볼 수 있는 최근 게시물을 좋아요 많은 순으로 보여드려요.")).toBeVisible();
  await page.goto("/community?view=mine");
  await expect(page).toHaveURL(/view=mine/);
});
