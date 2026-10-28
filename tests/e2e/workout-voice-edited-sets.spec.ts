import { expect, test } from "@playwright/test";
import { createTestAccount } from "./helpers/account-fixture";
import { hasDb } from "./helpers/db";

test("늘린 세트 수로 마지막 안내를 판정하고 다음 운동은 첫 세트부터 읽는다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "Live test DB unavailable");
  test.setTimeout(180_000);
  const { supabase, user_id } = await createTestAccount(page.context(), baseURL!, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const routine = await supabase.from("user_routines").insert({ user_id, splits: 0, variant_id: "custom", custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]], start_date: today, day_index_migrated: true });
  if (routine.error) throw routine.error;
  const rows = await supabase.from("routine_exercises").insert([
    { user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat", equipment: "barbell", sets: 3, reps: 10, weight_kg: 20 },
    { user_id, day_index: 0, focus: "lower", position: 1, exercise_id: "goblet-squat", equipment: "dumbbell", sets: 3, reps: 10, weight_kg: 12 },
  ]);
  if (rows.error) throw rows.error;
  const warmup = await supabase.from("routine_conditioning").insert({ user_id, focus: "lower", kind: "warmup", position: 0, item_id: "running", duration_min: 5 });
  if (warmup.error) throw warmup.error;
  await page.addInitScript(() => {
    localStorage.setItem("jimkkun.workout.voice", "on");
    localStorage.setItem("jimkkun:intro-seen", JSON.stringify(["squat", "goblet-squat"]));
    const spoken: string[] = [];
    Object.defineProperty(window, "__workoutSpoken", { value: spoken });
    Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, getVoices: () => [], speak: (utterance: SpeechSynthesisUtterance) => spoken.push(utterance.text) } });
  });
  await page.goto("/routine");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  const video = page.locator("video").first();
  await expect(video).toHaveAttribute("src", /running-dark\.mp4/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  expect(await video.evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1);
  await expect(video).toHaveCSS("object-fit", "contain");
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 780 });
    const box = (await video.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.height).toBeLessThanOrEqual(780 * .46);
  }
  await page.screenshot({ path: "test-results/running-workout-review.png" });
  await page.getByRole("button", { name: "넘기기", exact: true }).click();
  await page.getByRole("button", { name: "총 세트 늘리기", exact: true }).click();
  await page.getByRole("button", { name: "총 세트 늘리기", exact: true }).click();
  await expect(page.getByTestId("current-set")).toHaveText("세트 1/5");
  const spoken = () => page.evaluate(() => (window as unknown as { __workoutSpoken: string[] }).__workoutSpoken);
  for (let set = 1; set <= 4; set++) {
    await page.getByRole("button", { name: "세트 완료", exact: true }).click();
    await page.getByRole("button", { name: "휴식 끝내기", exact: true }).click();
    await expect(page.getByTestId("current-set")).toHaveText(`세트 ${set + 1}/5`);
    await expect.poll(async () => (await spoken()).at(-1)).toContain(`${set + 1}세트`);
    if (set < 4) expect((await spoken()).at(-1)).not.toContain("마지막");
  }
  expect((await spoken()).at(-1)).toContain("마지막 5세트");
  await page.getByRole("button", { name: "마지막 세트 완료", exact: true }).click();
  await page.getByRole("button", { name: "휴식 끝내기", exact: true }).click();
  await expect(page.getByTestId("current-set")).toHaveText("세트 1/3");
  await expect.poll(async () => (await spoken()).at(-1)).toContain("1세트");
  expect((await spoken()).at(-1)).not.toContain("마지막");
});
