/**
 * APK 릴리스 이름·중복판정·이력 — 순수 로직(파일시스템·git 접근 없음).
 *
 * 왜 분리했나: 여태 APK 이름이 `helssu-debug.apk` / `app-debug-<날짜>-<해시>.apk` /
 * `helssu-debug-v3-tab-crash-fix.apk` 세 가지로 섞여 있어서, 폰에 깔린 게 어느
 * 커밋인지 사후에 못 맞췄다(8/21 진단 때 md5 로 겨우 구분). 이름 규칙과 중복 판정은
 * 순수 함수로 고정해 테스트로 지키고, fs/git 은 release-apk.mjs 가 담당한다.
 */

/** 빌드 시각은 항상 한국 기준으로 읽는다(빌드 머신 TZ 와 무관하게 같은 이름). */
const SEOUL = "Asia/Seoul";

/**
 * 한국 시간대의 연·월·일·시·분을 숫자 문자열로. Intl 로 뽑아 서버/CI TZ 에 안 흔들린다.
 * @param {Date} at
 */
export function seoulParts(at) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  /** @type {Record<string,string>} */
  const p = {};
  for (const { type, value } of fmt.formatToParts(at)) p[type] = value;
  // en-CA 는 24시 자정을 "24" 로 주는 구현이 있다 — "00" 으로 정규화.
  const hour = p.hour === "24" ? "00" : p.hour;
  return { year: p.year, month: p.month, day: p.day, hour, minute: p.minute };
}

/** 릴리스 폴더 이름 — `2026-08-31`. 기존 날짜별 보관 구조를 그대로 유지한다. */
export function releaseDateDir(at) {
  const { year, month, day } = seoulParts(at);
  return `${year}-${month}-${day}`;
}

/** 커밋 해시 7자리. 짧거나 비면 `nogit`(git 없이 빌드한 경우). */
export function shortSha(sha) {
  const s = String(sha ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return "nogit";
  return s.slice(0, 7);
}

/** 파일명에 넣을 수 있게 버전 문자열을 정리(공백·슬래시 등 제거). */
function safeVersion(v) {
  return String(v ?? "")
    .trim()
    .replace(/[^0-9A-Za-z.+_-]/g, "")
    .replace(/^[.-]+|[.-]+$/g, "");
}

/**
 * APK 파일명 — `helssu-v1.0.3-4-d4717df-20260831-1612[-dirty][-note].apk`
 *
 * 버전(versionName+versionCode)·커밋·빌드시각을 항상 이 순서로 넣는다. 이름만 보고
 * "어느 커밋의 어느 버전을 언제 구운 것"인지 바로 알 수 있어야 한다.
 * @param {{versionName:string, versionCode:number|string, commit?:string, builtAt:Date,
 *          dirty?:boolean, buildType?:string, note?:string}} input
 */
export function apkFileName({
  versionName,
  versionCode,
  commit,
  builtAt,
  dirty = false,
  buildType = "debug",
  note = "",
}) {
  const { year, month, day, hour, minute } = seoulParts(builtAt);
  const stamp = `${year}${month}${day}-${hour}${minute}`;
  const vName = safeVersion(versionName) || "0.0.0";
  const vCode = safeVersion(versionCode) || "0";
  const parts = [
    "helssu",
    buildType === "debug" ? "" : buildType,
    `v${vName}`,
    vCode,
    shortSha(commit),
    stamp,
    dirty ? "dirty" : "",
    safeVersion(note),
  ].filter(Boolean);
  return `${parts.join("-")}.apk`;
}

/**
 * `android/app/build.gradle` 에서 versionName/versionCode 를 읽는다.
 * 주석 처리된 줄은 무시한다.
 * @param {string} gradleText
 */
export function parseGradleVersion(gradleText) {
  const lines = String(gradleText ?? "")
    .split(/\r?\n/)
    .filter((l) => !/^\s*\/\//.test(l));
  const body = lines.join("\n");
  const name = body.match(/versionName\s+["']([^"']+)["']/);
  const code = body.match(/versionCode\s+(\d+)/);
  if (!name || !code) return null;
  return { versionName: name[1], versionCode: Number(code[1]) };
}

/**
 * 같은 내용(sha256)의 APK 가 이미 보관돼 있으면 그 항목을 돌려준다.
 * 내용이 같으면 새 파일을 또 만들지 않는다 — 14MB 짜리가 git 에 계속 쌓였던 원인.
 * @param {string} sha256
 * @param {ReleaseEntry[]} entries
 */
export function findDuplicate(sha256, entries) {
  const key = String(sha256 ?? "").trim().toLowerCase();
  if (!key) return null;
  return (entries ?? []).find((e) => String(e.sha256).toLowerCase() === key) ?? null;
}

/**
 * @typedef {{file:string, dir:string, sha256:string, versionName:string,
 *   versionCode:number, commit:string, builtAt:string, buildType:string,
 *   sizeBytes:number, verified?:boolean, note?:string, logcat?:string,
 *   rebuiltAs?:string[]}} ReleaseEntry
 */

/** 이력 항목 생성. `verified` 는 실기기 검증 전까진 false — 롤백 후보에서 제외된다. */
export function makeEntry({
  file,
  dir,
  sha256,
  versionName,
  versionCode,
  commit,
  builtAt,
  buildType = "debug",
  sizeBytes = 0,
  note = "",
}) {
  return {
    file,
    dir,
    sha256: String(sha256).toLowerCase(),
    versionName,
    versionCode: Number(versionCode),
    commit: shortSha(commit),
    builtAt: builtAt instanceof Date ? builtAt.toISOString() : String(builtAt),
    buildType,
    sizeBytes: Number(sizeBytes) || 0,
    verified: false,
    note,
    logcat: "",
    rebuiltAs: [],
  };
}

/**
 * 이력에 새 빌드를 반영. 같은 내용이면 항목을 새로 안 만들고 기존 항목에
 * "이 커밋에서도 같은 결과가 나왔다"는 기록만 붙인다(중복 APK 방지).
 * 항상 새 배열을 돌려준다(입력 불변).
 * @param {ReleaseEntry[]} entries
 * @param {ReleaseEntry} entry
 * @returns {{entries:ReleaseEntry[], duplicateOf:ReleaseEntry|null}}
 */
export function addBuild(entries, entry) {
  const list = (entries ?? []).map((e) => ({ ...e }));
  const dup = findDuplicate(entry.sha256, list);
  if (dup) {
    const mark = `${entry.commit}@${entry.builtAt}`;
    const seen = new Set(dup.rebuiltAs ?? []);
    if (!seen.has(mark)) dup.rebuiltAs = [...(dup.rebuiltAs ?? []), mark];
    return { entries: list, duplicateOf: dup };
  }
  return { entries: [...list, entry], duplicateOf: null };
}

/** 최신순 정렬(빌드 시각 내림차순). */
export function sortNewestFirst(entries) {
  return [...(entries ?? [])].sort(
    (a, b) => Date.parse(b.builtAt) - Date.parse(a.builtAt),
  );
}

/**
 * 롤백 후보 — **실기기 검증(verified)을 통과한** 빌드만, 최신순.
 * 검증 안 된 APK 로 되돌리면 롤백이 또 다른 사고가 된다.
 */
export function rollbackCandidates(entries) {
  return sortNewestFirst(entries).filter((e) => e.verified === true);
}

/**
 * 옛 파일명에서 커밋 해시를 건진다 — `app-debug-2026-08-11-5ea9aee.apk` → `5ea9aee`.
 * 규칙 도입 전 이름(`helssu-debug.apk`, `helssu-debug-v3-tab-crash-fix.apk`)은 못 건진다.
 */
export function commitFromLegacyName(file) {
  const m = String(file ?? "").match(/-([0-9a-f]{7})\.apk$/);
  return m ? m[1] : "";
}

/**
 * `--key value` / `--flag` 를 걷어내고 위치 인자를 남긴다.
 * @param {string[]} [argv] 미지정이면 빈 결과.
 */
export function parseArgs(argv) {
  const opts = {};
  const rest = [];
  const list = argv ?? [];
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (!a.startsWith("--")) {
      rest.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = list[i + 1];
    // 다음 토큰이 또 다른 옵션이면 이건 값 없는 플래그다.
    if (next !== undefined && !next.startsWith("--")) {
      opts[key] = next;
      i += 1;
    } else {
      opts[key] = true;
    }
  }
  return { opts, rest };
}

/**
 * 첫 위치 인자가 명령인지 판정. `...apk` 로 끝나면 명령이 아니라 파일명이다.
 * @param {string[]} rest
 */
export function pickCommand(rest) {
  const first = (rest ?? [])[0];
  if (!first || first.endsWith(".apk")) {
    return { cmd: "archive", rest: [...(rest ?? [])] };
  }
  return { cmd: first, rest: (rest ?? []).slice(1) };
}

/** 사람이 읽을 크기. */
export function humanSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** 이력 마크다운 표 — `releases/apk/HISTORY.md` 로 생성한다(수기 편집 금지, 재생성됨). */
export function renderHistory(entries) {
  const rows = sortNewestFirst(entries);
  const head = [
    "# APK 배포 이력 (자동 생성)",
    "",
    "> `tools/release/release-apk.mjs` 가 다시 만든다. 직접 고치지 말고 `history.json` 을 고칠 것.",
    "> `검증` 은 실기기 확인(`tools/RELEASE-CHECKLIST.md`)을 통과한 빌드만 ✅ 가 된다 — 롤백은 ✅ 중에서만 고른다.",
    "",
    "| 빌드(KST) | 버전 | 커밋 | 파일 | 크기 | 검증 | 비고 |",
    "| --- | --- | --- | --- | ---: | :---: | --- |",
  ];
  if (rows.length === 0) {
    return [...head, "| _(없음)_ | | | | | | |", ""].join("\n");
  }
  const body = rows.map((e) => {
    const p = seoulParts(new Date(e.builtAt));
    const when = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
    const notes = [e.note, e.logcat ? `logcat: \`${e.logcat}\`` : ""]
      .filter(Boolean)
      .join(" / ");
    const dupes = (e.rebuiltAs ?? []).length
      ? ` (동일 빌드 재현 ${e.rebuiltAs.length}회)`
      : "";
    return `| ${when} | ${e.versionName} (${e.versionCode}) | \`${e.commit}\` | \`${e.dir}/${e.file}\` | ${humanSize(e.sizeBytes)} | ${e.verified ? "✅" : "—"} | ${notes}${dupes} |`;
  });
  return [...head, ...body, ""].join("\n");
}
