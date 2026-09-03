/**
 * 린트 기준선 비교 — 순수 로직(파일시스템·프로세스 실행 없음).
 *
 * 왜 필요한가: 산출물을 무시 범위에서 뺀 뒤에도 실제 소스에 에러가 29건 남아 있다.
 * 지금 당장 전부 고칠 수는 없지만(다른 작업과 파일이 겹친다), 그렇다고 방치하면
 * 새 에러가 조용히 섞여 들어온다. 그래서 "현재 상태"를 기준선으로 박아두고
 * **거기서 늘어난 것만** CI 에서 막는다. 줄어들면 기준선을 낮추라고 알려준다.
 *
 * 줄 번호는 코드가 조금만 움직여도 바뀌므로 키에 넣지 않는다.
 * 키 = `<레포 상대경로>::<규칙 id>`, 값 = 그 파일에서 그 규칙으로 난 **에러 개수**.
 */

/** ESLint severity 2 = error. 경고는 기준선 대상이 아니다(막지 않는다). */
const ERROR = 2;

/** 규칙 id 가 없는 경우(파서·설정 오류)도 놓치면 안 되므로 이름을 붙여 센다. */
const NO_RULE = "(parse/config)";

/** OS 차이(역슬래시)와 절대경로를 걷어내 레포 상대경로로 통일. */
export function toRelative(filePath, root) {
  const f = String(filePath ?? "").split("\\").join("/");
  const r = String(root ?? "")
    .split("\\")
    .join("/")
    .replace(/\/?$/, "/");
  return f.startsWith(r) ? f.slice(r.length) : f;
}

/**
 * ESLint JSON 결과 → `{ "경로::규칙": 에러개수 }`.
 * @param {Array<{filePath:string, messages:Array<{ruleId:string|null, severity:number}>}>} [results]
 * @param {string} root 레포 루트 절대경로
 */
export function resultsToCounts(results, root) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const r of results ?? []) {
    const rel = toRelative(r.filePath, root);
    for (const m of r.messages ?? []) {
      if (m.severity !== ERROR) continue;
      const key = `${rel}::${m.ruleId || NO_RULE}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/** 전체 에러 수. */
export function totalErrors(counts) {
  return Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
}

/**
 * 기준선 대비 변화.
 * - `added`   : 기준선에 없던 (파일,규칙) 조합 → **차단 대상**
 * - `increased`: 있던 조합인데 개수가 늘었다 → **차단 대상**
 * - `decreased`/`removed`: 고쳐진 것 → 기준선을 낮추라고 알린다
 */
export function compareCounts(baseline, current) {
  const base = baseline ?? {};
  const cur = current ?? {};
  const added = [];
  const increased = [];
  const decreased = [];
  const removed = [];

  for (const [key, count] of Object.entries(cur)) {
    const was = base[key];
    if (was === undefined) added.push({ key, count });
    else if (count > was) increased.push({ key, from: was, to: count });
    else if (count < was) decreased.push({ key, from: was, to: count });
  }
  for (const [key, count] of Object.entries(base)) {
    if (cur[key] === undefined) removed.push({ key, from: count });
  }

  const sortKey = (a, b) => a.key.localeCompare(b.key);
  return {
    added: added.sort(sortKey),
    increased: increased.sort(sortKey),
    decreased: decreased.sort(sortKey),
    removed: removed.sort(sortKey),
    baselineTotal: totalErrors(base),
    currentTotal: totalErrors(cur),
  };
}

/** 새로 생긴 에러가 있는가 — CI 는 이것만 보고 막는다. */
export function hasRegression(diff) {
  return (diff?.added?.length ?? 0) > 0 || (diff?.increased?.length ?? 0) > 0;
}

/** 고쳐진 게 있는가 — 기준선을 낮출 수 있다는 신호. */
export function hasImprovement(diff) {
  return (diff?.decreased?.length ?? 0) > 0 || (diff?.removed?.length ?? 0) > 0;
}

/** 사람이 읽는 요약. CI 로그에 그대로 찍는다. */
export function renderDiff(diff) {
  const lines = [];
  lines.push(
    `린트 에러: 기준선 ${diff.baselineTotal}건 → 현재 ${diff.currentTotal}건`,
  );

  if (diff.added.length) {
    lines.push("", `❌ 새로 생긴 에러 ${diff.added.length}종:`);
    for (const a of diff.added) lines.push(`   + ${a.key} (${a.count}건)`);
  }
  if (diff.increased.length) {
    lines.push("", `❌ 늘어난 에러 ${diff.increased.length}종:`);
    for (const a of diff.increased) {
      lines.push(`   ↑ ${a.key} (${a.from} → ${a.to}건)`);
    }
  }
  if (diff.removed.length || diff.decreased.length) {
    lines.push(
      "",
      `✅ 고쳐진 것 ${diff.removed.length + diff.decreased.length}종 — 기준선을 낮추세요:`,
      "   node tools/lint/check-lint.mjs --update",
    );
    for (const a of diff.removed) lines.push(`   - ${a.key} (${a.from}건 → 0)`);
    for (const a of diff.decreased) {
      lines.push(`   ↓ ${a.key} (${a.from} → ${a.to}건)`);
    }
  }
  if (!hasRegression(diff) && !hasImprovement(diff)) {
    lines.push("", "기준선과 동일 — 새 에러 없음.");
  }
  return lines.join("\n");
}

/**
 * 기준선 파일로 저장할 형태. 키를 정렬해 두면 diff 가 깔끔하고 충돌이 덜 난다.
 * (여러 작업이 동시에 돌아가는 레포라 이게 실질적으로 중요하다.)
 */
export function serializeBaseline(counts) {
  const sorted = {};
  for (const key of Object.keys(counts ?? {}).sort()) sorted[key] = counts[key];
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * ESLint stdout 에서 JSON 배열만 떼어낸다.
 * pnpm 이 "Already up to date" 같은 줄을 앞에 붙이는 경우가 있어 그대로 파싱하면 깨진다.
 */
export function extractJson(stdout) {
  const s = String(stdout ?? "");
  const start = s.indexOf("[");
  if (start < 0) return null;
  const end = s.lastIndexOf("]");
  if (end <= start) return null;
  try {
    const parsed = JSON.parse(s.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
