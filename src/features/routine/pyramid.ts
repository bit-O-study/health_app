/**
 * 추천이 세트 방식을 골라 준다 — 피라미드(2026-10-14) · 순수 로직.
 *
 * "추천해 줄 때 피라미드 세트처럼 세트랑 횟수도 다르게" — 지금까지 추천은 늘 같은 무게 · 같은 횟수였다.
 *
 * 규칙(사용자 결정 전 기본값, 보고서 제안대로):
 *  - 큰 복합 운동(강도 등급 heavy: 스쿼트·벤치·데드·로우·프레스…)에만, 중급 이상에게만.
 *  - 초급과 고립 운동(컬·레이즈)은 같은 무게·같은 횟수 그대로 — 자세가 먼저다.
 *  - 올라가는 두 세트로 몸을 풀고 **기준 무게로 본세트**를 한다: 무게 85% → 92% → 100% …, 횟수 +2 → 그대로 → −2 …
 *    (기준 60kg × 10회 × 4세트 → 50×12 · 55×10 · 60×8 · 60×8)
 *
 * 지난 기록이 있으면 추천의 기준 무게가 아니라 **내 지난번 값**을 쓴다(`prefillFromLast`) —
 * 처방 기본값으로 덮으면 무게가 갑자기 달라진다.
 */
import { loadClassOf } from "@/features/routine/exercise-load";
import type { SetDetail } from "@/features/routine/set-details";

/** 올라가는 세트의 무게 비율(기준 무게 대비)과 횟수 차이. 나머지는 기준 무게 · −2회. */
const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.85, reps: 2 },
  { pct: 0.92, reps: 0 },
];
/** 본세트(기준 무게)의 횟수 차이. */
const TOP_REPS = -2;
/** 피라미드를 권하는 최소 세트 수 — 올라가는 두 세트 + 본세트 하나. */
export const PYRAMID_MIN_SETS = 3;

/** 이 사람·이 종목에 피라미드를 권하는가. */
export function recommendsPyramid(exerciseId: string, experience: string | null | undefined): boolean {
  return experience !== "beginner" && experience != null && loadClassOf(exerciseId) === "heavy";
}

const snap = (kg: number, grid: number) => Math.max(grid, Math.round(kg / grid) * grid);
const fix = (kg: number) => Math.round(kg * 100) / 100;

/**
 * 기준 무게·횟수·세트 → 피라미드 세트 목록. 못 만들면(맨몸 · 세트 부족 · 눈금 때문에 무게가 안 갈림) null.
 * @param grid 그 기구에서 고를 수 있는 무게 눈금(kg).
 */
export function pyramidSets(topKg: number | null, reps: number, sets: number, grid: number): SetDetail[] | null {
  if (!topKg || !(topKg > 0) || !(sets >= PYRAMID_MIN_SETS) || !(grid > 0)) return null;
  const n = Math.min(20, Math.floor(sets));
  const out: SetDetail[] = [];
  for (let i = 0; i < n; i += 1) {
    const ramp = RAMP[i];
    out.push({
      weightKg: ramp ? fix(Math.min(topKg, snap(topKg * ramp.pct, grid))) : fix(topKg),
      reps: Math.min(100, Math.max(1, Math.round(reps + (ramp ? ramp.reps : TOP_REPS)))),
    });
  }
  // 눈금이 굵어 첫 세트가 본세트와 같은 무게가 되면 피라미드가 아니다.
  if (!(out[0].weightKg! < out[n - 1].weightKg!)) return null;
  return out;
}

/** 세트별 기록의 대표값 — 가장 무거운 세트(같으면 횟수가 많은 쪽). */
export function topOf(details: readonly SetDetail[]): SetDetail {
  return details.reduce((best, s) => {
    const a = s.weightKg ?? 0, b = best.weightKg ?? 0;
    return a > b || (a === b && s.reps > best.reps) ? s : best;
  });
}

export type PlanValues = { sets: number; reps: number; weightKg: number | null; setDetails: SetDetail[] | null };
export type LastValues = { sets: number | null; reps: number | null; weightKg: number | null; setDetails?: SetDetail[] | null };

/**
 * 계획 한 줄을 **지난번 실제 값**으로 미리 채운다(무게·횟수 고정이 꺼져 있을 때).
 *
 *  1) 지난번을 세트별로 했으면(피라미드 등) 그 세트들을 그대로 — 내가 고친 값까지.
 *  2) 계획은 세트별(추천 피라미드)인데 지난번은 같은 무게였으면, 지난번 무게를 기준으로 피라미드를 다시 만든다.
 *     (처방 기본 무게로 만든 피라미드를 그대로 쓰면 내 무게와 동떨어진다.)
 *  3) 둘 다 균일이면 예전처럼 지난번 무게·횟수·세트.
 */
export function prefillFromLast(plan: PlanValues, last: LastValues | null | undefined, grid: number): PlanValues {
  if (!last) return plan;
  if (last.setDetails && last.setDetails.length > 0) {
    const sd = last.setDetails;
    return { sets: sd.length, reps: sd[0].reps, weightKg: sd[0].weightKg, setDetails: [...sd] };
  }
  const flat = {
    sets: last.sets ?? plan.sets,
    reps: last.reps ?? plan.reps,
    weightKg: last.weightKg ?? plan.weightKg,
  };
  if (plan.setDetails && plan.setDetails.length > 0) {
    // 지난번에 무게를 안 남겼으면(맨몸으로 기록) 기준으로 삼을 무게가 없다 — 추천 그대로 둔다.
    if (last.weightKg == null) return plan;
    // 지난번 횟수는 본세트 횟수다 — 피라미드의 기준 횟수는 거기서 2회 위.
    const rebuilt = pyramidSets(flat.weightKg, flat.reps - TOP_REPS, Math.max(flat.sets, plan.setDetails.length), grid);
    if (rebuilt) return { sets: rebuilt.length, reps: rebuilt[0].reps, weightKg: rebuilt[0].weightKg, setDetails: rebuilt };
    return { ...flat, setDetails: null };
  }
  return { ...flat, setDetails: null };
}
