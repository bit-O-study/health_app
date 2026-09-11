import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

/**
 * 회귀: 시범 영상 중엔 **세로(1080×1920) 영상**이 있다(랫풀다운 등).
 * 높이 제한이 없으면 폰에서 화면을 통째로 넘겨 "한눈에" 안 들어온다.
 * → 영상 높이는 화면의 절반 근처에서 멈춰야 한다.
 */
test("새 운동 가이드 6종이 모바일에서 재생되고 화면을 넘지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 390, height: 780 });
  await createOnboardedAccount(page);

  for (const id of ["bench-press", "lat-pulldown", "pull-up", "smith-squat", "dumbbell-shoulder-press", "leg-press"]) {
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

    await expect(video).toHaveAttribute("src", `/exercise-guides/ai-v2/${id}.mp4`);
    expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(24, 1);
    await video.evaluate(async (v: HTMLVideoElement) => { v.muted = true; await v.play(); });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    await video.evaluate((v: HTMLVideoElement) => { v.pause(); v.currentTime = 20; });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
    const box = (await video.boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(box.height).toBeGreaterThan(0);
    // 화면의 절반 남짓(46vh + 여유) 이하 — 예전엔 세로영상이 693px(=89vh) 였다.
    expect(box.height).toBeLessThanOrEqual(vh * 0.55);
    // 가로는 화면 안에 들어와야 한다(가로 스크롤 없음).
    expect(box.width).toBeLessThanOrEqual(390);
  }
});
