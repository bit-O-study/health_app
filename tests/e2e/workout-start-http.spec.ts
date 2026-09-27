import { expect, test } from "@playwright/test";
import { prepareSetsEditWorkout } from "./helpers/workout-fixture";
import { hasDb } from "./helpers/db";

test("HTTP에서도 UUID API 없이 운동을 시작하고 복원한다", async ({page,baseURL}) => {
  test.skip(!hasDb,"DB fixtures required");
  await prepareSetsEditWorkout(page.context(),baseURL!);
  await page.addInitScript(() => Object.defineProperty(window.crypto,"randomUUID",{value:undefined,configurable:true}));
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/routine",{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"운동 시작",exact:true}).click();
  await expect(page.getByText("세트 1/4",{exact:true})).toBeVisible();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem("heltch.workout.timer")!).sessionId);
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await page.reload({waitUntil:"networkidle"});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("heltch.workout.timer")!).sessionId)).toBe(id);
  expect(errors).toEqual([]);
});
