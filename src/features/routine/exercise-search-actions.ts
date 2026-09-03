"use server";

import { searchExercises, type SearchHit } from "@/features/routine/exercise-search";

/**
 * 운동 찾기(자연어 검색)를 **서버에서** 돌린다 — 클라이언트 번들 다이어트.
 *
 * 검색 인덱스는 카탈로그 1,237개의 이름·자극부위·기구·동의어로 만든다. 이걸 클라이언트에서
 * 돌리려면 운동 목록(274 KiB)이 통째로 `/routine` 에 실려야 했다 — 헤더의 '운동 찾기'
 * 버튼 하나 때문에. 실제 검색은 사용자가 문장을 보낸 뒤 한 번뿐이라 왕복 한 번이 훨씬 싸다.
 */

/** 한 번에 돌려주는 최대 개수 — 대화창이 5개까지만 보여준다. */
const MAX_LIMIT = 10;

export async function searchExercisesAction(
  query: string,
  limit = 5,
): Promise<SearchHit[]> {
  // 클라이언트가 보내는 값이라 그대로 믿지 않는다(질의 길이·개수 상한).
  const q = typeof query === "string" ? query.slice(0, 200).trim() : "";
  if (!q) return [];
  const n = Number.isFinite(limit) ? Math.min(Math.max(1, Math.trunc(limit)), MAX_LIMIT) : 5;
  return searchExercises(q, n);
}
