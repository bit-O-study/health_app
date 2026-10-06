import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 가슴이 주로 쓰는 운동 — 부위 매핑 파일 두 곳(기본·확장 세트)에서 'id: "chest"' 줄을 읽는다.
 * E2E 는 src 를 import 하지 않는다(별칭 경로). 손으로 적으면 확장 세트(1,200여 개)를 빠뜨린다.
 */
const CHEST_IDS = ["src/features/routine/exercise-body-parts.ts", "src/features/routine/exercise-catalog-extra-maps.ts"].flatMap((p) =>
  [...readFileSync(path.join(process.cwd(), p), "utf8").matchAll(/^\s*"?([\w-]+)"?:\s*"chest",\s*$/gm)].map((m) => m[1]),
);

const uid = `(select id from auth.users where lower(email)=lower($1))`;

/**
 * 규칙 추천에서 아픈 부위 빼기(2026-10-01) — 설정 › 아픈 부위에 '가슴'이면
 * 루틴 '추천으로 등록'이 가슴 운동을 하나도 담지 않는다. 다른 부위는 그대로 채운다.
 */
test("아픈 부위(가슴)면 추천으로 등록해도 가슴 운동은 빠진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  expect(CHEST_IDS.length).toBeGreaterThan(20);
  await silenceDevOverlay(page);
  const email = await createOnboardedAccount(page);
  const registerAll = async () => {
    await page.goto("/plan", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "추천으로 등록", exact: true }).click();
    await page.getByRole("button", { name: "교체하기", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/routine", { timeout: 60_000 });
  };

  // 대조: 아픈 곳이 없으면 같은 버튼이 가슴 운동을 담는다(이 계정 루틴에 가슴 칸이 있다는 확인).
  await registerAll();
  const control = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  expect(control.filter((r) => CHEST_IDS.includes(r.exercise_id)).length).toBeGreaterThan(0);

  await dbQuery(`update public.profiles set pain_areas = array['chest'] where user_id=${uid}`, [email]);
  await registerAll();

  const rows = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.filter((r) => CHEST_IDS.includes(r.exercise_id))).toEqual([]);
});
