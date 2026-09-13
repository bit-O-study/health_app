import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 그룹: 생성 → 공유 링크로 다른 계정이 참여.
// 그룹탭은 관리자가 정한 전역 모드(gym=헬스장·랭킹 / proof=오늘 운동 인증)에 따라
// 화면이 통째로 다르다 — 현재 모드를 읽어 해당 모드의 시나리오만 돌린다.

/** 라이브 DB 의 현재 그룹탭 모드(앱과 같은 SECURITY DEFINER 함수로 읽는다). */
async function currentGroupMode(): Promise<"gym" | "proof"> {
  const r = await dbQuery<{ mode: string }>(`select public.group_mode() as mode`);
  return r[0]?.mode === "proof" ? "proof" : "gym";
}

/** 그룹 이름으로 초대 토큰 조회. */
async function inviteToken(groupName: string): Promise<string> {
  const g = await dbQuery<{ invite_token: string }>(
    `select invite_token from public.groups where name=$1`,
    [groupName],
  );
  expect(g.length).toBe(1);
  return g[0].invite_token;
}

test("그룹 생성 → 초대 링크 참여 → 랭킹에 멤버 표시", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.skip(
    (await currentGroupMode()) !== "gym",
    "그룹탭이 헬스장(gym) 모드일 때만 랭킹 화면이 뜬다",
  );

  // ── A: 그룹 생성
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill("E2E 헬스모임");
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  // 그룹 진입은 모드를 아는 정식 경로(/groups?g=<id>).
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  await expect(pageA.getByText("E2E 헬스모임")).toBeVisible({ timeout: 8000 });
  await expect(pageA.getByText("이번 주 운동 랭킹대전")).toBeVisible();
  await expect(pageA.getByText("나", { exact: true })).toBeVisible();
  // 회원가입 시 이름(검증유저)이 랭킹에 표시되고 '이름 없음'이 아니어야 한다
  await expect(pageA.getByText("검증유저").first()).toBeVisible();
  await expect(pageA.getByText("이름 없음")).toHaveCount(0);
  // 오늘 식단·운동 공유 줄
  await expect(pageA.getByText(/오늘 🍽/).first()).toBeVisible();

  const token = await inviteToken("E2E 헬스모임");

  // ── B: 링크로 참여
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);

  await pageB.goto(`/groups/join/${token}`);
  // 초대 확인 화면 — '확인'을 눌러 가입한다.
  await pageB.getByRole("button", { name: "확인" }).click();
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageB.getByText("E2E 헬스모임")).toBeVisible({ timeout: 8000 });

  // DB: 멤버 2명
  const m = await dbQuery<{ n: string }>(
    `select count(*)::text n
       from public.group_members gm
       join public.groups g on g.id = gm.group_id
      where g.name=$1`,
    ["E2E 헬스모임"],
  );
  expect(m[0].n).toBe("2");

  // 랭킹 목록(ol > li)에 두 명
  await expect(pageB.locator("ol > li")).toHaveCount(2);

  // 멤버 행을 눌러 상대방 오늘 운동·식단 상세로 진입(같은 그룹원 열람)
  await pageB.locator("ol > li a").first().click();
  await pageB.waitForURL(/\/groups\/[0-9a-f-]{8,}\/member\//, { timeout: 10000 });
  await expect(pageB.getByRole("heading", { name: "오늘 운동" })).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByRole("heading", { name: "오늘 식단" })).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

// 회귀: 인증 모드인데 카카오톡 초대 링크로 들어와 가입하면 `/groups/[id]`(헬스장 전용
// 화면)로 떨어져 '캐릭터 키우기'(공유펫 헬스장)가 떴다. 초대로 들어와도 인증 피드여야 한다.
test("인증 모드: 초대 링크로 가입해도 캐릭터 키우기(헬스장)가 안 뜬다", async ({
  browser,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.skip(
    (await currentGroupMode()) !== "proof",
    "그룹탭이 인증(proof) 모드일 때만 검증",
  );

  // ── A: 그룹 생성
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);

  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill("E2E 인증모임");
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageA.getByText("탭하여 오늘 인증")).toBeVisible({ timeout: 8000 });

  const token = await inviteToken("E2E 인증모임");

  // ── B: 카카오톡에 뿌려지는 그 링크로 들어와 가입
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);

  await pageB.goto(`/groups/join/${token}`);
  await pageB.getByRole("button", { name: "확인" }).click();
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  // 인증 피드가 떠야 하고, 헬스장(랭킹·공유펫) 요소는 하나도 없어야 한다.
  await expect(pageB.getByText("탭하여 오늘 인증")).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByText("이번 주 운동 랭킹대전")).toHaveCount(0);

  // 옛 딥링크(/groups/[id])로 직접 들어가도 헬스장이 열리면 안 된다.
  const groupId = new URL(pageB.url()).searchParams.get("g")!;
  await pageB.goto(`/groups/${groupId}`);
  await pageB.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });
  await expect(pageB.getByText("이번 주 운동 랭킹대전")).toHaveCount(0);

  await ctxA.close();
  await ctxB.close();
});
/**
 * 트레이너 대시보드 — 그룹장(=트레이너)이 담당 회원의 이번 주 상태를 한 화면에서 본다.
 *
 * 🔴 이 화면은 **남의 몸 데이터**(체중 추이·식단 기록·운동 이력)를 보여 준다.
 * 그룹장이 아닌 사람에게 열리면 안 되는데, 잘못 열려도 **화면은 똑같이 잘 동작한다** —
 * 그래서 "그룹장은 보이고 멤버는 안 보인다"를 여기서 직접 확인한다.
 */
test("그룹장은 회원 관리 화면을 보고, 일반 멤버는 못 본다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  // 계정 2개 가입(각 ~20초) + 루틴 시드 + 배정 + 코멘트까지 한 흐름이라 기본 2분으로는
  // 모자란다. 나눠 쓰면 가입을 또 해야 해서 오히려 더 오래 걸린다.
  test.setTimeout(300_000);

  const name = `E2E 트레이너 ${Date.now().toString(36)}`;

  // ── A: 그룹장(트레이너)
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA);
  // ⚠ 시드는 **가입 직후**에 한다. `seedRecommendedExercises` 는 "가장 최근 가입 계정"을
  //   기준으로 루틴 일차를 맞추기 때문에, B 가 가입한 뒤에 부르면 엉뚱한 계정을 본다.
  await seedRecommendedExercises(pageA);
  await pageA.goto("/groups", { waitUntil: "networkidle" });
  await pageA.getByLabel("그룹 이름").fill(name);
  await pageA.getByRole("button", { name: "그룹 만들기" }).click();
  await pageA.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  const groupId = await dbQuery<{ id: string }>(
    `select id from public.groups where name=$1`,
    [name],
  ).then((r) => r[0].id);

  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await expect(pageA.getByRole("heading", { name: /회원 관리/ })).toBeVisible({
    timeout: 8000,
  });
  // '담당 회원' 은 요약 칸 라벨과 빈 안내 문구 양쪽에 나온다 → 요약 칸만 정확히 집는다.
  await expect(pageA.getByText("담당 회원", { exact: true })).toBeVisible();
  // 트레이너 자신은 담당 회원이 아니다 — 아직 아무도 없다.
  await expect(pageA.getByText("아직 담당 회원이 없어요")).toBeVisible();

  // ── B: 초대로 들어온 일반 멤버
  const token = await inviteToken(name);
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB);
  await pageB.goto(`/groups/join/${token}`);
  // 초대 확인 화면 — '확인'을 눌러 가입한다(위 시나리오와 같은 흐름).
  await pageB.getByRole("button", { name: "확인" }).click();
  // 🔴 화면으로 기다리면 안 된다. **초대 확인 화면 자체가 그룹 이름을 보여 주기 때문에**
  //    `getByText(name)` 은 가입이 끝나기 전에 이미 통과한다 — 그러면 뒤따르는
  //    "회원이 1명 보인다" 가 아직 없는 회원을 찾다가 실패한다(실제로 그렇게 깨졌다).
  //    가입 여부는 DB 로 본다.
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.group_members where group_id=$1`,
            [groupId],
          )
        )[0].n,
      { timeout: 20000 },
    )
    .toBe("2");

  // 🔴 멤버에게는 화면이 안 열린다.
  await pageB.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await expect(pageB.getByText("그룹장만 볼 수 있어요")).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByTestId("trainer-members")).toHaveCount(0);

  // ── 트레이너 화면에 그 회원이 나타난다(운동 기록이 없으니 챙길 대상으로).
  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await expect(pageA.getByTestId("trainer-member")).toHaveCount(1);
  await expect(pageA.getByText("아직 운동 기록이 없어요")).toBeVisible();

  // ── 루틴 배정: 트레이너의 한 일차를 회원의 한 일차로(운동은 위에서 시드했다).
  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await pageA.getByTestId("assign-link").first().click();
  // ⚠ 클라이언트 내비게이션이라 `waitForURL`(기본 load 대기)은 안 끝난다 — 화면으로 본다.
  await expect(pageA.getByRole("heading", { name: /루틴 배정/ })).toBeVisible({
    timeout: 10000,
  });

  // 🔴 되돌리기 어려운 작업이라 한 번에 안 끝난다 — 무엇이 바뀌는지 보고 확인한다.
  await expect(pageA.getByText(/운동은 지워지고/)).toBeVisible();
  await pageA.getByTestId("assign-start").click();
  await pageA.getByTestId("assign-confirm").click();
  await expect(pageA.getByTestId("assign-message")).toContainText("배정했어요", {
    timeout: 15000,
  });

  // 회원 루틴에 실제로 들어갔고, **트레이너 무게는 안 따라간다**.
  const assigned = await dbQuery<{ n: string; w: string | null }>(
    `select count(*)::text n, max(weight_kg)::text w
       from public.routine_exercises re
       join public.group_members gm on gm.user_id = re.user_id
      where gm.group_id = $1 and gm.role = 'member'`,
    [groupId],
  );
  expect(Number(assigned[0].n)).toBeGreaterThan(0);
  expect(assigned[0].w).toBeNull();

  // ── 코멘트: 트레이너가 남기면 **회원 화면**에 뜬다.
  //    🔴 회원이 볼 자리가 없으면 코멘트는 없는 기능이다 — 그래서 회원 쪽까지 본다.
  await pageA.goto(`/groups/${groupId}/trainer`, { waitUntil: "networkidle" });
  await pageA.getByTestId("comment-link").first().click();
  await expect(pageA.getByRole("heading", { name: /코멘트/ })).toBeVisible({
    timeout: 10000,
  });
  const note = "스쿼트 무릎이 안으로 모여요";
  await pageA.getByLabel("코멘트").fill(note);
  await pageA.getByTestId("comment-submit").click();
  await expect(pageA.getByTestId("comment-list")).toContainText(note, { timeout: 15000 });

  // 회원의 오늘의 운동 화면에 보인다.
  await pageB.goto("/routine", { waitUntil: "networkidle" });
  await expect(pageB.getByTestId("my-trainer-comments")).toContainText(note, {
    timeout: 15000,
  });

  // 🔴 트레이너 화면(회원 관리)은 회원에게 안 열린다 — 위에서 이미 확인했다.
  //    여기서는 **코멘트가 남의 눈에 안 띄는지**를 본다: 트레이너 자신의 오늘의 운동
  //    화면에는 자기가 쓴 코멘트가 안 뜬다(받은 게 아니라 쓴 것이다).
  await pageA.goto("/routine", { waitUntil: "networkidle" });
  await expect(pageA.getByTestId("my-trainer-comments")).toHaveCount(0);

  await ctxA.close();
  await ctxB.close();
});

/**
 * 팀 요금제(B2B) — 그룹장이 신청하고 상태를 본다.
 *
 * 🔴 **결제창이 없는 흐름**이라 "눌렀는데 아무 일도 안 일어난다"로 보이기 쉽다.
 * 신청이 실제로 접수되고 그 상태가 화면에 남는지를 여기서 지킨다.
 * (승인은 관리자만 — 그 경계는 라이브 DB 테스트가 지킨다.)
 */
test("그룹장이 팀 요금제를 신청하면 상태가 남는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);

  const name = `E2E 요금제 ${Date.now().toString(36)}`;
  await signUpAndOnboard(page);
  await page.goto("/groups", { waitUntil: "networkidle" });
  await page.getByLabel("그룹 이름").fill(name);
  await page.getByRole("button", { name: "그룹 만들기" }).click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });

  const groupId = await dbQuery<{ id: string }>(
    `select id from public.groups where name=$1`,
    [name],
  ).then((r) => r[0].id);

  await page.goto(`/groups/${groupId}/trainer/billing`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "팀 요금제" })).toBeVisible({
    timeout: 10000,
  });

  // 헬스장 요금제로 신청 + 세금계산서 정보.
  await page.getByTestId("plan-gym").click();
  await page.getByLabel("상호").fill("E2E 피트니스");
  await page.getByLabel("사업자등록번호").fill("1234567890");
  await page.getByTestId("team-request").click();
  await expect(page.getByTestId("team-message")).toContainText("접수", { timeout: 15000 });

  // 상태가 화면에 남고, DB 에는 requested 로만 들어간다(스스로 active 가 되면 안 된다).
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("team-status")).toHaveAttribute("data-status", "requested");
  const row = await dbQuery<{ status: string; plan: string; biz_name: string }>(
    `select status, plan, biz_name from public.team_subscriptions where group_id=$1`,
    [groupId],
  );
  expect(row[0].status).toBe("requested");
  expect(row[0].plan).toBe("gym");
  expect(row[0].biz_name).toBe("E2E 피트니스");

  // 🔴 입금 계좌는 **관리자 설정에 채워졌을 때만** 뜬다. 반쯤 채운 안내는 없는 것보다
  //    나쁘다(입금하다 만다). 설정을 잠깐 넣었다가 원래대로 돌린다.
  const before = await dbQuery<{ value: unknown }>(
    `select value from public.app_settings where key='billing.deposit'`,
  );
  await dbQuery(
    `insert into public.app_settings (key, value) values ('billing.deposit', $1::jsonb)
       on conflict (key) do update set value = excluded.value`,
    [JSON.stringify({ bank: "E2E은행", account: "000-11-222333", holder: "검증", note: "" })],
  );
  try {
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("deposit-info")).toContainText("E2E은행", {
      timeout: 15000,
    });
    // 예금주가 비면 안 뜬다(셋 다 있어야 한다).
    await dbQuery(
      `update public.app_settings set value = $1::jsonb where key='billing.deposit'`,
      [JSON.stringify({ bank: "E2E은행", account: "000-11-222333", holder: "", note: "" })],
    );
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("deposit-info")).toHaveCount(0);
  } finally {
    if (before.length > 0) {
      await dbQuery(
        `update public.app_settings set value = $1::jsonb where key='billing.deposit'`,
        [JSON.stringify(before[0].value)],
      );
    } else {
      await dbQuery(`delete from public.app_settings where key='billing.deposit'`);
    }
  }

  // 신청 취소 → 행이 사라진다.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("team-cancel").click();
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.team_subscriptions where group_id=$1`,
            [groupId],
          )
        )[0].n,
      { timeout: 15000 },
    )
    .toBe("0");
});
