import motionGuideIds from "../../public/exercise-guides/ai-v3/manifest.json";
import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

/**
 * 회귀: 시범 영상 중엔 **세로(1080×1920) 영상**이 있다(랫풀다운 등).
 * 높이 제한이 없으면 폰에서 화면을 통째로 넘겨 "한눈에" 안 들어온다.
 * → 영상 높이는 화면의 절반 근처에서 멈춰야 한다.
 */
const guideIds = [...new Set(["bench-press", "lat-pulldown", "pull-up", "smith-squat", "dumbbell-shoulder-press", "dumbbell-lateral-raise", "leg-press", ...motionGuideIds])];
for (let offset = 0; offset < guideIds.length; offset += 12) {
  const batchIds = guideIds.slice(offset, offset + 12);
  test(`운동 가이드 모바일 재생 ${offset + 1}–${offset + batchIds.length}`, async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 390, height: 780 });
  await createOnboardedAccount(page);

  for (const id of batchIds) {
    await page.goto(`/exercises/${id}`, { waitUntil: "networkidle" });
    const video = page.locator("video").first();
    await expect(video).toBeVisible({ timeout: 15_000 });

    // 메타데이터(원본 해상도)까지 로드된 뒤 실제 렌더 높이를 잰다.
    await page
      .waitForFunction(
        () => {
          const v = document.querySelector("video");
          return !!v && v.readyState >= HTMLMediaElement.HAVE_METADATA && v.videoHeight > 0;
        },
        { timeout: 20_000 },
      );

    const mediaState = await video.evaluate((v: HTMLVideoElement) => ({
      error: v.error?.code ?? null,
      readyState: v.readyState,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
    }));
    expect(mediaState).toMatchObject({
      error: null,
      videoWidth: expect.any(Number),
      videoHeight: expect.any(Number),
    });
    expect(mediaState.videoWidth).toBeGreaterThan(0);
    expect(mediaState.videoHeight).toBeGreaterThan(0);
    expect(mediaState.readyState).toBeGreaterThanOrEqual(1);

    const isMotion = motionGuideIds.includes(id);
    await expect(video).toHaveAttribute("src", `/exercise-guides/${isMotion ? "ai-v3" : "ai-v2"}/${id}.mp4`);
    expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(isMotion ? 8 : 9, 1);
    await video.evaluate(async (v: HTMLVideoElement) => { v.muted = true; await v.play(); });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    await video.evaluate((v: HTMLVideoElement) => { v.pause(); v.currentTime = 7.5; });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => ({
      ready: v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
      error: v.error?.message ?? null,
    }))).toEqual({ ready: true, error: null });
    const box = (await video.boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(box.height).toBeGreaterThan(0);
    // 화면의 절반 남짓(46vh + 여유) 이하 — 예전엔 세로영상이 693px(=89vh) 였다.
    expect(box.height).toBeLessThanOrEqual(vh * 0.55);
    // 가로는 화면 안에 들어와야 한다(가로 스크롤 없음).
    expect(box.width).toBeLessThanOrEqual(390);
  }

  if (offset !== 0) return;

  // An equipment change must update both the explanation and demonstration.
  await page.goto("/exercises/bench-press?eq=barbell", { waitUntil: "networkidle" });
  await expect(page.locator("video").first()).toHaveAttribute("src", "/exercise-guides/ai-v2/bench-press.mp4");
  await page.getByRole("link", { name: "덤벨", exact: true }).click();
  await expect(page).toHaveURL(/eq=dumbbell/);
  await expect(page.locator('video[src="/exercise-guides/ai-v2/bench-press.mp4"]')).toHaveCount(0);
  await expect(page.getByText("덤벨을 가슴 옆에서 시작, 손목을 곧게 유지", { exact: true })).toBeVisible();
  await expect(page.locator('img[src*="/Dumbbell_Bench_Press_with_Neutral_Grip/"]').first()).toBeVisible();
  await page.getByRole("link", { name: "머신", exact: true }).click();
  await expect(page).toHaveURL(/eq=machine/);
  await expect(page.locator('video[src="/exercise-guides/ai-v2/bench-press.mp4"]')).toHaveCount(0);
  await expect(page.getByText("손잡이가 가슴 중앙 높이에 오도록 시트 조절", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "바벨", exact: true }).click();
  await expect(page.locator("video").first()).toHaveAttribute("src", "/exercise-guides/ai-v2/bench-press.mp4");
});
}
