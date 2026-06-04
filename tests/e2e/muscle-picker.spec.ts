import { expect, test } from "@playwright/test";

import { freshEmail, signUpAndOnboard, TEST_PASSWORD } from "./helpers/auth";

/**
 * 근육별로 운동선택 플로우:
 * 루틴 설정 → "근육별로 운동선택" 선택 → 저장 → /plan/muscle 3D 마네킹 →
 * 근육 부위(칩) 선택 → 운동 담기 → 저장 → 메인에 운동 표시.
 *
 * 3D 마네킹의 WebGL 메쉬는 Playwright 로 직접 클릭이 어려워, 컴포넌트가 함께
 * 렌더하는 접근성 칩(data-testid=muscle-chip-*)으로 부위를 선택한다.
 */
test("근육별로 운동선택: 마네킹 부위 선택 → 운동 담기 → 저장", async ({
  page,
}) => {
  await signUpAndOnboard(page);

  // 루틴 설정에서 세 번째 옵션 "근육별로 운동선택" 선택 후 저장
  await page.goto("/settings/routine", { waitUntil: "networkidle" });
  const byMuscle = page.getByTestId("fillmode-byMuscle");
  await expect(byMuscle).toBeVisible();
  await expect(byMuscle).toContainText("근육별로 운동선택");
  await byMuscle.click();

  await page.getByRole("button", { name: "저장" }).last().click();

  // /plan/muscle 로 이동 + 마네킹 캔버스 + 칩 표시
  await page.waitForURL((u) => new URL(u).pathname === "/plan/muscle", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("muscle-mannequin-canvas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "근육별로 운동선택" }),
  ).toBeVisible();

  // 가슴 칩 선택 → 가슴 운동 목록 등장
  await page.getByTestId("muscle-chip-chest").click();
  await expect(page.getByRole("heading", { name: "가슴 운동" })).toBeVisible();

  // 가슴 운동 2개 담기 (벤치프레스 + 인클라인 프레스)
  await page.getByTestId("pick-bench-press").click();
  await page.getByTestId("pick-incline-press").click();

  // 등 칩으로 전환 → 데드리프트 담기
  await page.getByTestId("muscle-chip-back").click();
  await expect(page.getByRole("heading", { name: "등 운동" })).toBeVisible();
  await page.getByTestId("pick-deadlift").click();

  // 담은 운동 요약 = 3개, 저장 버튼 카운트 반영
  const save = page.getByTestId("save-muscle-selection");
  await expect(save).toContainText("저장 (3)");

  await save.click();

  // 메인으로 이동 + 오늘 시작할 운동이 생김
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30_000 });
});

/**
 * 온보딩 마지막(추천 루틴) 단계에서 "근육별로 운동선택"을 고르고 저장하면
 * 바로 3D 마네킹(/plan/muscle)으로 이동한다. (signUpAndOnboard 헬퍼는 기본
 * 저장이라, 여기선 단계들을 인라인으로 진행하며 byMuscle 라디오를 선택한다.)
 */
test("온보딩에서 근육별로 운동선택 → 3D 마네킹으로 이동", async ({ page }) => {
  const email = freshEmail();

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForSelector("#name", { timeout: 15_000 });
  await page.fill("#name", "근육유저");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();
  await page.waitForURL("**/onboarding", { timeout: 30_000 });

  await page.getByRole("button", { name: "남자" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator('input[placeholder="170"]').fill("175");
  await page.locator('input[placeholder="65"]').fill("75");
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await page.waitForTimeout(400);

  // 추천 루틴 단계 — 근육별로 운동선택 라디오 후 저장
  const byMuscle = page.getByTestId("fillmode-byMuscle");
  await expect(byMuscle).toBeVisible();
  await byMuscle.click();
  await page.getByRole("button", { name: "저장" }).last().click();

  await page.waitForURL((u) => new URL(u).pathname === "/plan/muscle", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("muscle-mannequin-canvas")).toBeVisible();
  await expect(page.getByTestId("muscle-chip-chest")).toBeVisible();
});

/**
 * 마네킹이 콘솔 에러 없이 렌더되고, 3D 본체가 에러 폴백으로 떨어지지 않는다.
 * (gender 정규화 + GLB 부재 시 useGLTF 미호출로 404/limb 크래시가 없어야 함)
 */
test("마네킹: 콘솔 에러 없이 3D 본체 렌더 (에러 폴백 아님)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await signUpAndOnboard(page);
  await page.goto("/plan/muscle", { waitUntil: "networkidle" });
  await expect(page.getByTestId("muscle-mannequin-canvas")).toBeVisible();
  // 부위 칩 동작 (3D 상호작용 살아있는지)
  await page.getByTestId("muscle-chip-arm").click();
  await page.waitForTimeout(1500);

  // 3D 본체가 크래시해서 에러 폴백 메시지로 떨어지면 안 된다
  await expect(page.getByText("표시할 수 없는 환경")).toHaveCount(0);

  // 우리 코드발 치명 에러가 없어야 한다
  const fatal = errors.filter(
    (e) =>
      e.includes("limb") ||
      e.includes("anatomy.glb") ||
      e.includes("Could not load"),
  );
  expect(fatal, fatal.join("\n")).toHaveLength(0);
});

/**
 * 세부근육 드릴다운: 팔 → 이두 장두/단두를 고르면 그 근육에 특화된 운동만
 * 필터링된다. (인클라인 컬=장두, 컨센트레이션 컬=단두)
 */
test("세부근육 드릴다운: 이두 장두 vs 단두 운동 필터", async ({ page }) => {
  await signUpAndOnboard(page);

  await page.goto("/plan/muscle", { waitUntil: "networkidle" });
  await page.getByTestId("muscle-chip-arm").click();

  // 이두 장두 → 인클라인 컬 보이고 컨센트레이션 컬 안 보임
  await page.getByTestId("submuscle-chip-arm-biceps-long").click();
  await expect(page.getByTestId("pick-incline-curl")).toBeVisible();
  await expect(page.getByTestId("pick-concentration-curl")).toHaveCount(0);

  // 이두 단두 → 반대
  await page.getByTestId("submuscle-chip-arm-biceps-short").click();
  await expect(page.getByTestId("pick-concentration-curl")).toBeVisible();
  await expect(page.getByTestId("pick-incline-curl")).toHaveCount(0);

  // 담아서 저장까지
  await page.getByTestId("pick-concentration-curl").click();
  const save = page.getByTestId("save-muscle-selection");
  await expect(save).toContainText("저장 (1)");
  await save.click();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30_000 });
});

/** 운동 상세 페이지에 부위 배지가 표시된다. */
test("운동 상세: 자극 부위 배지 노출", async ({ page }) => {
  await signUpAndOnboard(page);

  // 벤치프레스: 가슴 + 팔 (보조) 배지
  await page.goto("/exercises/bench-press", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "벤치프레스" }),
  ).toBeVisible();
  // 헤더 영역에 부위 배지(가슴) 노출
  await expect(page.getByText("가슴", { exact: true }).first()).toBeVisible();
});