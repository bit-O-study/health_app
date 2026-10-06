/**
 * 아픈 부위 대체 운동 — 라이트 2단계 혜택 5(2026-10-02, docs/lite-stage2-design-2026-10-02.html). 순수 모듈.
 *
 * 오늘 운동 중 아픈 부위가 주로 쓰는 운동마다, 맞춤 운동 추천(이미 아픈 부위·내 헬스장 기구·초급자 제외·
 * 회복 중 근육을 거른 목록)에서 한 개씩 짝짓는다. 적용은 **오늘만** — 영구 루틴은 그대로(원칙 2).
 */
import { isEquipmentId, type BodyPart, type EquipmentId } from "@/features/routine/exercise-catalog-labels";

export type PainRow = { rowId: string; exerciseId: string; focus: string; part: BodyPart };
export type SwapCandidate = { exerciseId: string; equipment: EquipmentId };
export type SwapPair = { from: PainRow; to: SwapCandidate };

/** 아픈 운동 순서대로, 아직 안 쓴 후보를 하나씩. 후보가 모자라면 남은 아픈 운동은 짝 없이(그대로 둔다). */
export function pairPainSwaps(rows: readonly PainRow[], candidates: readonly SwapCandidate[]): SwapPair[] {
  const used = new Set<string>();
  const out: SwapPair[] = [];
  for (const row of rows) {
    const to = candidates.find((c) => !used.has(c.exerciseId) && c.exerciseId !== row.exerciseId);
    if (!to) break;
    used.add(to.exerciseId);
    out.push({ from: row, to });
  }
  return out;
}

/** 맞춤 운동 추천 → 대체 후보(기구 값이 올바른 것만). */
export function swapCandidates(picks: readonly { exerciseId: string; equipment: string }[]): SwapCandidate[] {
  return picks.flatMap((p) => (isEquipmentId(p.equipment) ? [{ exerciseId: p.exerciseId, equipment: p.equipment }] : []));
}
