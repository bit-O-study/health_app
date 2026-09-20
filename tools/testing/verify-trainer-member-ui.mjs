// Browser component checks with stubbed server actions; no live Supabase required.
import assert from "node:assert/strict";
import { build } from "../../.verify-shots/trainer-validation/node_modules/esbuild/lib/main.js";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";



const dir = resolve(".verify-shots/trainer-ui");
await mkdir(dir, { recursive: true });
const outfile = resolve(dir, "component.js");
await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
    import { MemberPrescription } from './src/features/groups/components/member-prescription';
    window.__calls = []; window.__fail = false; window.__refreshes = 0;
    createRoot(document.getElementById('root')).render(<MemberPrescription groupId="group" memberId="member" memberName="테스트 회원"
      exercises={[{id:'row', day_index:0, focus:'lower', exercise_id:'squat', equipment:'barbell', sets:3, reps:10, weight_kg:20,
        updated_at:'2026-09-20T00:00:00Z', set_details:[{weightKg:20,reps:10}], name:'스쿼트', equipments:['barbell','bodyweight'], dayLabel:'1일차'}]} />);`,
    loader: "tsx", resolveDir: process.cwd() },
  bundle: true, outfile, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "server-stubs", setup(b) {
    b.onResolve({ filter: /^(next\/navigation|\.\.\/prescription-actions)$/ }, args => ({ path: args.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, args => ({ contents: args.path === "next/navigation"
      ? `export function useRouter() { return { refresh() { window.__refreshes++; } }; }`
      : `export async function searchPrescriptionExercises() { return [{id:'bench-press',name:'벤치프레스',equipments:['barbell','smith']}]; }
         export async function prescribeMemberExercise(...args) { window.__calls.push(args); return window.__fail ? {ok:false,error:'권한이 없거나 회원의 운동이 변경됐어요.'} : {ok:true}; }` }));
  } }],
});
const browser = await chromium.launch();
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  page.setDefaultTimeout(15000); const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.setContent('<html lang="ko"><meta charset="utf-8"><body><div id="root"></div></body></html>');
  await page.addScriptTag({ path: outfile });
  await page.getByRole("button", { name: "운동 변경", exact: true }).click();
  assert.equal(await page.getByText("저장하면 기존 세트별 설정은", { exact: false }).count(), 1); checks++;
  await page.getByLabel("세트", { exact: true }).fill("4");
  await page.getByRole("button", { name: "변경 내용 확인" }).click();
  assert.equal(await page.evaluate(() => window.__calls.length), 0); checks++;
  assert.match(await page.locator("article").innerText(), /테스트 회원 님의 1일차에서 스쿼트 · 4세트/); checks++;
  await page.getByRole("button", { name: "처방 저장", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "처방을 저장했어요" }).waitFor();
  assert.equal(await page.evaluate(() => window.__calls[0][4].sets), 4); checks++;
  await page.getByRole("button", { name: "운동 변경", exact: true }).click();
  await page.getByLabel("변경할 운동 검색").fill("벤치");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.getByRole("button", { name: "벤치프레스", exact: true }).click();
  assert.equal(await page.getByLabel("중량(kg)").inputValue(), ""); checks++;
  assert.equal(await page.getByLabel("기구", { exact: true }).locator("option").count(), 2); checks++;
  await page.getByRole("button", { name: "운동 삭제", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  assert.equal(await page.evaluate(() => window.__calls.length), 1); checks++;
  await page.evaluate(() => { window.__fail = true; });
  await page.getByRole("button", { name: "운동 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 확정", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "권한이 없거나" }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "스쿼트", exact: true }).count(), 1); checks++;
  assert.equal(await page.evaluate(() => window.__refreshes), 1); checks++;
  await page.evaluate(() => { window.__fail = false; });
  await page.getByRole("button", { name: "운동 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 확정", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "삭제했어요" }).waitFor();
  assert.equal(await page.evaluate(() => window.__calls.at(-1)[4]), null); checks++;
  assert.deepEqual(errors, []); checks++;
  console.log(`${checks} mobile Chromium component checks passed (stubbed server actions)`);
} finally { await browser.close(); }
