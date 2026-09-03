#!/usr/bin/env node
/**
 * 빌드된 APK 를 `releases/apk/<날짜>/` 로 규칙에 맞게 보관하고 배포 이력을 갱신한다.
 *
 * 이름·중복판정·이력 표 만들기는 전부 `apk-release.mjs` 의 순수 함수 — 여기선
 * git·파일시스템만 만진다(그래서 로직은 단위테스트로 지켜진다).
 *
 * 사용법:
 *   node tools/release/release-apk.mjs                      # 기본 debug APK 보관
 *   node tools/release/release-apk.mjs --note tab-crash-fix
 *   node tools/release/release-apk.mjs --apk <경로> --build-type release
 *   node tools/release/release-apk.mjs verify <파일명> [--logcat <경로>] [--note "..."]
 *   node tools/release/release-apk.mjs rollback             # 검증된 롤백 후보 보기
 *   node tools/release/release-apk.mjs sync                 # HISTORY.md 만 다시 생성
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addBuild,
  apkFileName,
  commitFromLegacyName,
  humanSize,
  makeEntry,
  parseArgs,
  parseGradleVersion,
  pickCommand,
  releaseDateDir,
  renderHistory,
  rollbackCandidates,
  sortNewestFirst,
} from "./apk-release.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const GRADLE = path.join(ROOT, "android", "app", "build.gradle");
const DEFAULT_APK = path.join(
  ROOT,
  "android/app/build/outputs/apk/debug/app-debug.apk",
);
const RELEASES = path.join(ROOT, "releases", "apk");
const HISTORY_JSON = path.join(RELEASES, "history.json");
const HISTORY_MD = path.join(RELEASES, "HISTORY.md");

// 색은 호출하는 셸 스크립트(_android-lib.sh)가 이미 쓰고 있어 여기선 기호만.
const log = (...a) => console.log("▸", ...a);
const warn = (...a) => console.log("!", ...a);
const fail = (msg) => {
  console.error("✗", msg);
  process.exit(1);
};

/** git 명령 — 실패해도(레포 밖·git 없음) 죽지 않고 빈 문자열. */
function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_JSON)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_JSON, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    fail(`history.json 을 읽지 못했습니다: ${e.message}`);
  }
}

function saveHistory(entries) {
  fs.mkdirSync(RELEASES, { recursive: true });
  const sorted = sortNewestFirst(entries);
  fs.writeFileSync(HISTORY_JSON, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  fs.writeFileSync(HISTORY_MD, renderHistory(sorted), "utf8");
  log(`이력 갱신 → releases/apk/history.json · HISTORY.md (${sorted.length}건)`);
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// ── archive: 빌드 산출물을 규칙대로 보관 ────────────────────────────────────
function cmdArchive(opts) {
  const apk = path.resolve(ROOT, opts.apk ? String(opts.apk) : DEFAULT_APK);
  if (!fs.existsSync(apk)) {
    fail(`APK 를 못 찾았습니다: ${apk}\n  먼저 빌드하세요: corepack pnpm android:setup:win`);
  }

  const gradleText = fs.existsSync(GRADLE) ? fs.readFileSync(GRADLE, "utf8") : "";
  const version = parseGradleVersion(gradleText);
  if (!version) {
    warn(`android/app/build.gradle 에서 버전을 못 읽었습니다 — 0.0.0 으로 기록합니다.`);
  }
  const versionName = version?.versionName ?? "";
  const versionCode = version?.versionCode ?? "";

  const commit = git("rev-parse", "HEAD");
  // 소스가 커밋 안 된 상태로 구운 APK 는 나중에 재현이 안 된다 — 이름에 남긴다.
  const dirty = git("status", "--porcelain").length > 0;
  const buildType = String(opts["build-type"] ?? "debug");
  const note = opts.note ? String(opts.note) : "";
  const builtAt = new Date();

  const digest = sha256(apk);
  const entries = loadHistory();

  const file = apkFileName({
    versionName,
    versionCode,
    commit,
    builtAt,
    dirty,
    buildType,
    note,
  });
  const dir = path.posix.join("releases/apk", releaseDateDir(builtAt));
  const entry = makeEntry({
    file,
    dir,
    sha256: digest,
    versionName: versionName || "0.0.0",
    versionCode: versionCode || 0,
    commit,
    builtAt,
    buildType,
    sizeBytes: fs.statSync(apk).size,
    note,
  });

  const { entries: next, duplicateOf } = addBuild(entries, entry);

  if (duplicateOf) {
    // 내용이 같은 APK 를 또 커밋하면 14MB 가 git 에 그냥 쌓인다(8/12 (3) 이슈).
    warn(`내용이 같은 APK 가 이미 있습니다 — 새로 만들지 않습니다.`);
    log(`  기존 파일: ${duplicateOf.dir}/${duplicateOf.file}`);
    log(`  sha256   : ${digest}`);
    saveHistory(next);
    return;
  }

  const outDir = path.join(ROOT, dir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(apk, path.join(outDir, file));
  saveHistory(next);

  log(`보관 완료 → ${dir}/${file} (${humanSize(entry.sizeBytes)})`);
  log(`  버전 ${entry.versionName} (${entry.versionCode}) · 커밋 ${entry.commit}${dirty ? " · 미커밋 변경 있음(dirty)" : ""}`);
  warn(`실기기 검증 전까지는 롤백 후보가 아닙니다. 검증 뒤:`);
  warn(`  node tools/release/release-apk.mjs verify ${file} --logcat <logcat 경로>`);
}

// ── verify: 실기기 검증 결과를 이력에 남긴다 ────────────────────────────────
function cmdVerify(rest, opts) {
  const target = rest[0];
  if (!target) fail("검증할 APK 파일명을 넘기세요. 예: verify helssu-v1.0.3-4-d4717df-20260831-1612.apk");

  const entries = loadHistory();
  const hit = entries.find((e) => e.file === target);
  if (!hit) {
    fail(`이력에 없는 파일입니다: ${target}\n  현재 이력: ${entries.map((e) => e.file).join(", ") || "(없음)"}`);
  }

  hit.verified = opts.fail ? false : true;
  if (opts.logcat) {
    const src = path.resolve(ROOT, String(opts.logcat));
    if (!fs.existsSync(src)) fail(`logcat 파일을 못 찾았습니다: ${src}`);
    // logcat 은 APK 와 같은 날짜 폴더에 둬야 "어느 빌드의 로그"인지 안 흩어진다.
    const dest = path.posix.join(hit.dir, `logcat-${hit.commit}-${Date.now()}.txt`);
    fs.mkdirSync(path.join(ROOT, hit.dir), { recursive: true });
    fs.copyFileSync(src, path.join(ROOT, dest));
    hit.logcat = dest;
    log(`logcat 보관 → ${dest}`);
  }
  if (opts.note) hit.note = String(opts.note);
  if (opts.device) hit.note = [hit.note, `기기: ${opts.device}`].filter(Boolean).join(" / ");

  saveHistory(entries);
  log(hit.verified ? `검증 통과로 기록: ${target}` : `검증 실패로 기록: ${target}`);
}

// ── rollback: 되돌릴 수 있는(검증된) 빌드 목록 ──────────────────────────────
function cmdRollback() {
  const list = rollbackCandidates(loadHistory());
  if (list.length === 0) {
    warn("검증된 롤백 후보가 없습니다. 실기기 검증을 마친 빌드에 verify 를 먼저 기록하세요.");
    return;
  }
  console.log("되돌릴 수 있는 빌드(최신순, 실기기 검증 통과분만):\n");
  for (const e of list) {
    console.log(`  ${e.dir}/${e.file}`);
    console.log(`    버전 ${e.versionName} (${e.versionCode}) · 커밋 ${e.commit} · ${humanSize(e.sizeBytes)}`);
    if (e.note) console.log(`    ${e.note}`);
  }
  const top = list[0];
  console.log(`\n설치:\n  adb install -r ${top.dir}/${top.file}`);
}

// ── backfill: 이미 보관돼 있던 APK 들을 이력에 채워 넣는다 ──────────────────
/**
 * 규칙을 만들기 전에 쌓인 파일들(`helssu-debug.apk`, `app-debug-<날짜>-<해시>.apk`,
 * `helssu-debug-v3-tab-crash-fix.apk` …)을 한 번 훑어 이력에 올린다.
 * 파일은 옮기거나 지우지 않는다 — 이름만으로 못 맞추던 것을 sha256 으로 묶어주는 게 목적.
 */
function cmdBackfill() {
  if (!fs.existsSync(RELEASES)) {
    warn("releases/apk 가 없습니다 — 채울 것이 없습니다.");
    return;
  }
  let entries = loadHistory();
  const known = new Set(entries.map((e) => `${e.dir}/${e.file}`));
  let added = 0;
  let dupes = 0;

  const dirs = fs
    .readdirSync(RELEASES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const day of dirs) {
    for (const file of fs.readdirSync(path.join(RELEASES, day)).sort()) {
      if (!file.endsWith(".apk")) continue;
      const dir = path.posix.join("releases/apk", day);
      if (known.has(`${dir}/${file}`)) continue;

      const abs = path.join(RELEASES, day, file);
      const stat = fs.statSync(abs);
      // 옛 이름 `app-debug-<날짜>-<해시>.apk` 에서만 커밋을 건질 수 있다.
      const entry = makeEntry({
        file,
        dir,
        sha256: sha256(abs),
        // 옛 파일엔 버전이 안 박혀 있다 — 규칙 도입 전이라는 뜻으로 0.0.0 을 남긴다.
        versionName: "0.0.0",
        versionCode: 0,
        commit: commitFromLegacyName(file),
        builtAt: stat.mtime,
        sizeBytes: stat.size,
        note: "규칙 도입 전 보관분(backfill)",
      });
      const res = addBuild(entries, entry);
      entries = res.entries;
      if (res.duplicateOf) {
        dupes += 1;
        warn(`내용 동일: ${dir}/${file} = ${res.duplicateOf.dir}/${res.duplicateOf.file}`);
      } else {
        added += 1;
      }
    }
  }

  saveHistory(entries);
  log(`backfill 완료 — 새 항목 ${added}건, 내용 중복 ${dupes}건`);
  if (dupes > 0) {
    warn("중복분은 파일을 지우지 않았습니다. 정리는 사용자가 확인 후 결정하세요.");
  }
}

const parsed = parseArgs(process.argv.slice(2));
const { cmd, rest } = pickCommand(parsed.rest);
const opts = parsed.opts;

switch (cmd) {
  case "archive":
    cmdArchive(opts);
    break;
  case "verify":
    cmdVerify(rest, opts);
    break;
  case "rollback":
    cmdRollback();
    break;
  case "backfill":
    cmdBackfill();
    break;
  case "sync":
    saveHistory(loadHistory());
    break;
  default:
    fail(`모르는 명령: ${cmd} (archive | verify | rollback | backfill | sync)`);
}
