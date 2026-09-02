import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 화면별 클라이언트 번들 크기 측정 — docs/PERFORMANCE-BASELINE.md 의 '재현 방법'을
 * 그대로 코드로 옮긴 것.
 *
 * 왜 스크립트로 만드나 — 문서에 절차만 있고 매번 손으로 쟀다. 손으로 재면 사람마다
 * 다르게 세고(중복 청크를 빼는지, gzip 을 어떤 설정으로 하는지), 그러면 "전후 비교"
 * 라는 말 자체가 성립하지 않는다.
 *
 * 세는 법: 각 라우트의 `page_client-reference-manifest.js` 가 참조하는
 * `static/chunks/*.js` 를 **중복 제거**해 원본과 gzip 을 합산한다.
 * 공유 청크가 있으므로 라우트 합계는 "그 화면에서 참조될 수 있는 최대치" 이지
 * 매번 새로 받는 양이 아니다 — 전후 비교용 숫자다.
 *
 * 사용: node tools/perf/measure-bundles.mjs [--json]
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const NEXT = resolve(ROOT, ".next");

/** 기준값(2026-08-31, docs/PERFORMANCE-BASELINE.md) — 원본 KiB. */
const BASELINE = {
  "/home": 168.0,
  "/plan": 782.1,
  "/plan/muscle": 725.5,
  "/routine": 964.7,
  "/running": 154.0,
  "/exercises": 746.3,
  "/exercises/[slug]": 1107.4,
  "/diet": 508.7,
  "/community": 406.3,
};

/** 라우트 → .next/server/app 아래 경로. */
const routeToDir = (route) => (route === "/" ? "" : route.slice(1));

function chunksFor(route) {
  const file = resolve(
    NEXT,
    "server/app",
    routeToDir(route),
    "page_client-reference-manifest.js",
  );
  if (!existsSync(file)) return null;
  const src = readFileSync(file, "utf8");
  // 매니페스트는 JS 지만 청크 경로는 문자열로 그대로 들어 있다.
  const found = new Set();
  for (const m of src.matchAll(/static\/chunks\/[^"']+?\.js/g)) found.add(m[0]);
  return [...found];
}

function measure(route) {
  const chunks = chunksFor(route);
  if (chunks === null) return null;
  let raw = 0;
  let gz = 0;
  let missing = 0;
  for (const c of chunks) {
    const p = resolve(NEXT, c);
    if (!existsSync(p)) {
      missing++;
      continue;
    }
    const buf = readFileSync(p);
    raw += buf.length;
    gz += gzipSync(buf).length;
  }
  return { route, chunks: chunks.length, raw, gz, missing };
}

const kib = (n) => n / 1024;
const fmt = (n) => kib(n).toLocaleString("en-US", { maximumFractionDigits: 1 });

if (!existsSync(NEXT)) {
  console.error("먼저 프로덕션 빌드가 필요합니다: next build");
  process.exit(1);
}

const rows = [];
for (const route of Object.keys(BASELINE)) {
  const r = measure(route);
  if (!r) {
    rows.push({ route, missing: true });
    continue;
  }
  const before = BASELINE[route];
  const after = kib(r.raw);
  rows.push({
    ...r,
    beforeKiB: before,
    afterKiB: after,
    deltaKiB: after - before,
    pct: before > 0 ? ((after - before) / before) * 100 : 0,
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("| 화면 | 청크 | 기준(8/31) | 현재 | 변화 |");
  console.log("|---|---:|---:|---:|---:|");
  let before = 0;
  let after = 0;
  for (const r of rows) {
    if (r.missing) {
      console.log(`| \`${r.route}\` | — | — | (빌드에 없음) | — |`);
      continue;
    }
    before += r.beforeKiB;
    after += r.afterKiB;
    const sign = r.deltaKiB > 0 ? "+" : "";
    console.log(
      `| \`${r.route}\` | ${r.chunks} | ${r.beforeKiB.toLocaleString()} KiB | ` +
        `${fmt(r.raw)} KiB (gzip ${fmt(r.gz)}) | ${sign}${r.deltaKiB.toFixed(1)} KiB ` +
        `(${sign}${r.pct.toFixed(0)}%) |`,
    );
  }
  const d = after - before;
  console.log(
    `| **합계** | | **${before.toLocaleString(undefined, { maximumFractionDigits: 1 })} KiB** | ` +
      `**${after.toLocaleString(undefined, { maximumFractionDigits: 1 })} KiB** | ` +
      `**${d > 0 ? "+" : ""}${d.toFixed(1)} KiB (${((d / before) * 100).toFixed(0)}%)** |`,
  );
}

// 정적 미디어(운동 가이드 MP4)도 같이 — 압축 작업의 전후 비교 대상이다.
const guides = resolve(ROOT, "public/exercise-guides");
if (existsSync(guides)) {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(guides).filter((f) => f.endsWith(".mp4"));
  const total = files.reduce(
    (s, f) => s + statSync(resolve(guides, f)).size,
    0,
  );
  console.error(
    `\n운동 가이드 MP4 ${files.length}개 합계: ${total.toLocaleString()} bytes ` +
      `(${(total / 1024 / 1024).toFixed(1)} MiB)`,
  );
}
