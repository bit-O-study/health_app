/**
 * 비전 모델이 돌려준 '운동 이름(한국어)'을 앱 운동 카탈로그의 slug 로 매칭 — 순수 모듈.
 *
 * 매칭되면 /exercises/[slug] 로 링크할 수 있고, 못 찾으면 텍스트로만 보여준다.
 * (server-only 없음 → 단위 테스트 가능.)
 */

import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";

export type CatalogRef = { slug: string; name: string };

/** 공백·기호 제거 + 소문자 — "벤치 프레스" / "벤치프레스" / "Bench-Press" 를 같게 본다. */
export function normalizeExerciseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s··・.\-_/()[\]]/g, "")
    .trim();
}

type IndexEntry = { key: string; ref: CatalogRef };

let cachedIndex: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  if (cachedIndex) return cachedIndex;
  const seen = new Set<string>();
  const out: IndexEntry[] = [];
  for (const ex of ALL_EXERCISES) {
    const key = normalizeExerciseName(ex.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, ref: { slug: ex.id, name: ex.name } });
  }
  cachedIndex = out;
  return out;
}

/**
 * 이름 하나를 카탈로그에 매칭. 정확 일치(정규화 후) 우선, 없으면 한쪽이 다른 쪽을
 * 포함하는 가장 '가까운'(길이차 최소) 항목. 애매하면 null(텍스트로만 표시).
 */
export function matchCatalogExercise(name: string): CatalogRef | null {
  const key = normalizeExerciseName(name);
  if (key.length < 2) return null; // 너무 짧으면 오매칭 방지
  const index = buildIndex();

  const exact = index.find((e) => e.key === key);
  if (exact) return exact.ref;

  let best: { entry: IndexEntry; diff: number } | null = null;
  for (const e of index) {
    if (e.key.includes(key) || key.includes(e.key)) {
      const diff = Math.abs(e.key.length - key.length);
      if (!best || diff < best.diff) best = { entry: e, diff };
    }
  }
  // 포함 매칭은 길이차가 작을 때만 신뢰(예: "레그프레스머신" vs "레그프레스").
  if (best && best.diff <= 4) return best.entry.ref;
  return null;
}

/** 테스트/특수 상황용 — 인덱스 캐시 초기화. */
export function _resetCatalogIndex(): void {
  cachedIndex = null;
}
