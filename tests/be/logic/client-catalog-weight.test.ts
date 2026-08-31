import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * P0(팅김·번들 다이어트) 회귀 가드.
 *
 * `exercise-catalog.ts` 는 확장 카탈로그 1,237개를 물고 있어, **클라이언트 컴포넌트가
 * 이걸 (직접이든 건너서든) import 하면 그 화면에 315 KiB 청크가 통째로 실린다.**
 * 기구 라벨 하나 쓰자고 끌어오는 일이 실제로 있었고(운동 종목 리스트·운동 상세),
 * 그 원본 바이트는 그대로 WebView JS 힙이라 저사양 폰에서 팅김으로 이어진다.
 *
 * 그래서 "무거운 카탈로그에 닿는 클라이언트 화면" 목록을 여기에 고정해 둔다.
 * - 줄이면 통과(허용목록을 줄이라고 알려준다)
 * - **늘면 실패** — 라벨만 필요하면 `exercise-catalog-labels.ts` 를 쓴다
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");

/**
 * 아직 카탈로그 데이터에 닿는 클라이언트 화면 — **줄여야 할 목록**이다.
 *
 * 위 5개는 운동 목록/검색이 실제로 필요한 편집기·픽커(2단계에서 서버 조회로 옮길 대상),
 * 나머지는 `muscle-map`·`exercise-search`·`calories` 같은 중간 모듈을 건너서 닿는다
 * (그 모듈들은 부위 매핑·칼로리 계산만 쓰는데 전체 카탈로그를 물고 있다 — 같이 쪼갤 대상).
 */
const ALLOWED = new Set([
  // 목록·검색 UI (데이터가 진짜 필요)
  "features/routine/components/daily-main-editor.tsx",
  "features/routine/components/exercise-search-select.tsx",
  "features/routine/components/muscle-exercise-picker.tsx",
  "features/routine/components/plan-editor.tsx",
  "features/routine/components/today-plan-list.tsx",
  "features/routine/components/exercise-finder.tsx",
  // 중간 모듈(muscle-map / muscle-detail / muscle-balance)을 건너서 닿는 화면
  "features/routine/components/conditioning-editor.tsx",
  "features/routine/components/muscle-balance-3d.tsx",
  "features/routine/components/muscle-mannequin-3d.tsx",
  "features/routine/components/today-conditioning-list.tsx",
  "features/workout-timer/guided-workout.tsx",
  "features/workout-timer/muscle-body-view.tsx",
  "features/workout-timer/workout-session-timer.tsx",
  // dashboard-metrics → calories 를 건너서 닿는다
  "features/home/components/contribution-graph.tsx",
]);

const HEAVY = new Set([
  "features/routine/exercise-catalog.ts",
  "features/routine/exercise-catalog-extra.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const rel = (p: string) => p.slice(SRC.length + 1).replace(/\\/g, "/");

/** `@/...` import 를 파일 경로로 — 확장자·index 를 붙여 실제 파일을 찾는다. */
const byPath = new Map(files.map((f) => [rel(f), f]));
function resolveImport(spec: string): string | null {
  if (!spec.startsWith("@/")) return null;
  const base = spec.slice(2);
  for (const cand of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (byPath.has(cand)) return cand;
  }
  return null;
}

const source = new Map(files.map((f) => [rel(f), readFileSync(f, "utf8")]));
const importsOf = new Map<string, string[]>();
for (const [key, text] of source) {
  const specs = [...text.matchAll(/from\s+"(@\/[^"]+)"/g)]
    .map((m) => resolveImport(m[1]))
    .filter((v): v is string => v !== null);
  importsOf.set(key, [...new Set(specs)]);
}

/**
 * 서버 전용 모듈 — 여기서 탐색을 멈춘다.
 * `"use server"`(서버 액션)는 클라이언트에서 RPC 스텁으로 바뀌고,
 * `import "server-only"` 모듈은 애초에 클라 번들에 못 들어간다.
 * 이 둘을 타고 넘어가면 "닿는다"고 오판한다(실제 번들에는 안 실린다).
 */
function isServerOnly(key: string): boolean {
  const text = source.get(key) ?? "";
  return /^\s*["']use server["']/.test(text) || /import\s+"server-only"/.test(text);
}

/** 이 파일에서 무거운 모듈까지 닿는 경로가 있으면 그 경로를 돌려준다. */
function pathToHeavy(entry: string): string[] | null {
  const seen = new Set<string>();
  const stack: { key: string; trail: string[] }[] = [{ key: entry, trail: [entry] }];
  while (stack.length > 0) {
    const { key, trail } = stack.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    if (HEAVY.has(key) && key !== entry) return trail;
    if (key !== entry && isServerOnly(key)) continue; // 클라 번들에 안 실린다
    for (const dep of importsOf.get(key) ?? []) {
      stack.push({ key: dep, trail: [...trail, dep] });
    }
  }
  return null;
}

const clientFiles = [...source.entries()]
  .filter(([, text]) => /^\s*["']use client["']/.test(text))
  .map(([key]) => key);

describe("클라이언트 번들 — 무거운 운동 카탈로그 확산 가드", () => {
  it("허용목록에 없는 클라이언트 컴포넌트는 카탈로그에 닿지 않는다", () => {
    const offenders: string[] = [];
    for (const f of clientFiles) {
      if (ALLOWED.has(f)) continue;
      const trail = pathToHeavy(f);
      if (trail) offenders.push(trail.join(" → "));
    }
    // 실패하면: 라벨만 필요한지 보고 exercise-catalog-labels 로 바꾼다.
    // 데이터가 정말 필요하면 서버에서 props 로 내리거나 서버 액션으로 조회한다.
    expect(offenders).toEqual([]);
  });

  it("허용목록이 실제보다 넓어지지 않는다(줄었으면 목록도 줄인다)", () => {
    const stale = [...ALLOWED].filter((f) => {
      if (!source.has(f)) return true;
      return pathToHeavy(f) === null;
    });
    expect(stale).toEqual([]);
  });

  it("라벨 계층은 어떤 데이터 모듈도 import 하지 않는다", () => {
    const labels = "features/routine/exercise-catalog-labels.ts";
    expect(source.has(labels)).toBe(true);
    expect(importsOf.get(labels)).toEqual([]);
  });
});
