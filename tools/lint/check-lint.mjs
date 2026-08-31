#!/usr/bin/env node
/**
 * ESLint 를 돌려 **기준선보다 늘어난 에러만** 막는다.
 *
 * 비교 로직은 전부 `lint-baseline.mjs` 의 순수 함수 — 여기선 프로세스 실행과 파일만.
 *
 *   node tools/lint/check-lint.mjs            # 검사(신규 에러 있으면 exit 1)
 *   node tools/lint/check-lint.mjs --update   # 현재 상태를 기준선으로 저장
 *   node tools/lint/check-lint.mjs --json <경로>  # 이미 뽑아둔 eslint JSON 으로 비교
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareCounts,
  extractJson,
  hasRegression,
  renderDiff,
  resultsToCounts,
  serializeBaseline,
  totalErrors,
} from "./lint-baseline.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const BASELINE = path.join(ROOT, "tools", "lint", "lint-baseline.json");

const argv = process.argv.slice(2);
const update = argv.includes("--update");
const jsonIdx = argv.indexOf("--json");
const jsonPath = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;

/**
 * ESLint 를 JSON 포매터로 실행. 에러가 있으면 exit code 1 이라 실패를 삼킨다.
 *
 * `.bin/eslint.cmd` + `shell:true` 로 부르면 인자가 이스케이프 없이 이어붙어
 * 경고(DEP0190)가 뜬다. 자바스크립트 진입점을 현재 node 로 직접 실행하면
 * 셸이 필요 없고 OS 차이도 사라진다.
 */
function runEslint() {
  const entry = path.join(ROOT, "node_modules", "eslint", "bin", "eslint.js");
  if (!fs.existsSync(entry)) {
    console.error(`✗ eslint 를 찾지 못했습니다: ${entry}`);
    console.error("  먼저 의존성을 설치하세요: corepack pnpm install");
    process.exit(2);
  }
  try {
    return execFileSync(process.execPath, [entry, ".", "-f", "json"], {
      cwd: ROOT,
      encoding: "utf8",
      // 산출물을 무시해도 결과 JSON 이 수 MB 가 될 수 있다.
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (e) {
    // 린트 에러가 있으면 비정상 종료지만 stdout 에 결과는 들어 있다.
    if (e.stdout) return e.stdout;
    console.error("✗ eslint 실행 실패:", e.message);
    process.exit(2);
  }
}

const raw = jsonPath
  ? fs.readFileSync(path.resolve(ROOT, jsonPath), "utf8")
  : runEslint();

const results = extractJson(raw);
if (!results) {
  console.error("✗ eslint JSON 을 해석하지 못했습니다.");
  process.exit(2);
}

const current = resultsToCounts(results, ROOT);

if (update) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, serializeBaseline(current), "utf8");
  console.log(
    `▸ 기준선 갱신 → tools/lint/lint-baseline.json (${totalErrors(current)}건 / ${Object.keys(current).length}종)`,
  );
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(
    "✗ 기준선이 없습니다. 먼저 만드세요: node tools/lint/check-lint.mjs --update",
  );
  process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const diff = compareCounts(baseline, current);
console.log(renderDiff(diff));

if (hasRegression(diff)) {
  console.error(
    "\n✗ 새 린트 에러가 있습니다. 고치거나, 의도한 것이면 --update 로 기준선을 갱신하세요.",
  );
  process.exit(1);
}
console.log("\n✓ 새 린트 에러 없음.");
