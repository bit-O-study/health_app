import { expect, test } from "@playwright/test";
import { prepareSetsEditWorkout } from "./helpers/workout-fixture";
import { dbQuery, hasDb } from "./helpers/db";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: 완료·휴식 취소 안내는 스와이프 중에만 노출된다`, async ({ page, baseURL }) => {
    test.skip(!hasDb, "DB fixtures required");
    const email = await prepareSetsEditWorkout(page.context(), baseURL!);
    const uid = `(select id from auth.users where email=$1)`;
    await dbQuery(`insert into public.exercise_completions
      (user_id,for_date,exercise_row_id,status,focus,exercise_id,equipment,sets,reps,weight_kg)
      select user_id,(now() at time zone 'Asia/Seoul')::date,id,'done',focus,exercise_id,equipment,sets,reps,weight_kg
      from public.routine_exercises where user_id=${uid}`, [email]);
    await dbQuery(`insert into public.routine_conditioning (user_id,focus,kind,position,item_id,duration_min)
      values (${uid},'lower','warmup',0,'running',5)`, [email]);
    await dbQuery(`insert into public.conditioning_completions (user_id,for_date,kind,item_id,source_row_id,status)
      select user_id,(now() at time zone 'Asia/Seoul')::date,kind,item_id,id,'skipped'
      from public.routine_conditioning where user_id=${uid}`, [email]);
    await page.goto("/routine", { waitUntil: "networkidle" });
    await page.evaluate(value => document.documentElement.classList.toggle("dark", value === "dark"), theme);

    for (const [kind, direction] of [["main", 1], ["warmup", -1]] as const) {
      const row = page.getByTestId(`today-${kind}-list`).locator("li").first();
      await row.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await row.locator(":scope > div.relative").hover();
      const box = (await row.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const panels = row.locator(":scope > div.absolute");
      const foreground = row.locator(":scope > div.relative");
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(100); // Let the pressed state render before moving.
      // A stationary press must not expose hidden completion/cancel actions.
      await expect(panels).toHaveCount(0);
      await page.mouse.move(x + direction * 30, y, { steps: 3 });
      await expect(panels).toHaveCount(2);
      // Keep the row background opaque even while its contents are muted.
      await expect(foreground).toHaveCSS("opacity", "1");
      await expect(panels.getByText("취소", { exact: true })).toBeVisible();
      await page.mouse.move(x + direction * 110, y, { steps: 5 });
      await page.mouse.up();
      await expect(panels).toHaveCount(0);
      await expect(foreground).toHaveCSS("opacity", "1");
    }
    await expect.poll(async () => {
      const rows = await dbQuery<{ n: string }>(`select
        ((select count(*) from public.exercise_completions where user_id=${uid}) +
         (select count(*) from public.conditioning_completions where user_id=${uid}))::text n`, [email]);
      return rows[0].n;
    }).toBe("0");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("today-main-list").locator("li > div.absolute")).toHaveCount(0);
    await expect(page.getByTestId("today-warmup-list").locator("li > div.absolute")).toHaveCount(0);
  });
}
