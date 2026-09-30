#!/usr/bin/env node
/**
 * AI 동작 영상(ai-v3)의 **타임라인 사양** 추출 — 운동모드 '영상에 맞춘 자막'용.
 *
 * ai-v3 영상은 manage-motion-guides.mjs 가 포즈 패널(8장 또는 16장)을 정해진 순서로
 * 이어 붙인 8초짜리다. 그래서 몇 초에 시작 자세·올라가는 중·정점·돌아오는 중인지가
 * 패널 수와 cycle(reverse/full)만으로 정확히 정해진다. 클라이언트가 그 둘만 알면 되므로
 * 공개된(검수 통과) 영상 id 만 골라 작은 JSON 으로 뽑는다.
 *
 * 사용: node tools/media/build-motion-specs.mjs
 * 영상을 새로 만들거나 manifest 가 바뀌면 다시 돌린다(motion-caption.test 가 빠진 id 를 잡는다).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(readFileSync("public/exercise-guides/ai-v3/manifest.json", "utf8"));
const out = {};
const revisions = {};
for (const id of manifest) {
  const specPath = join("tools/media/motion-guides", `${id}.json`);
  if (!existsSync(specPath)) throw new Error(`사양 파일 없음: ${specPath}`);
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const panels = spec.panels ?? 8;
  if (panels !== 8 && panels !== 16) throw new Error(`패널 수 이상: ${id} ${panels}`);
  out[id] = { panels, cycle: spec.cycle === "full" ? "full" : "reverse", ...(["smooth", "hold"].includes(spec.timing) ? { timing: spec.timing } : {}) };
  if (spec.renderer) revisions[id] = spec.renderer;
}
writeFileSync("src/features/workout-timer/motion-specs.json", JSON.stringify(out, null, 0) + "\n");
console.log(`✓ ${Object.keys(out).length}개 → src/features/workout-timer/motion-specs.json`);

writeFileSync("src/features/exercises/motion-revisions.json", JSON.stringify(revisions, null, 2) + "\n");
