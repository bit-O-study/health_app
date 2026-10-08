/**
 * 남의 루틴을 볼 때 — 내 헬스장에 그 기구가 없으면 무엇으로 바꿔 하면 되는지(2026-10-08).
 * 순수 로직. 헬스장을 등록하지 않았으면(기구 목록 null) 아무것도 말하지 않는다.
 *
 * 1) 같은 운동을 다른 기구로 할 수 있으면 그게 먼저(예: 바벨 → 덤벨 벤치프레스).
 * 2) 아니면 같은 부위 운동 중 헬스장에서 할 수 있고 **같은 근육을 가장 많이 겹쳐 쓰는** 것 2개.
 *    겹침 = 두 운동의 세부 근육 몫(setShare)이 서로 겹치는 양 ÷ 원래 운동 몫. 40% 미만은 대체가 아니라 다른 운동이라 뺀다.
 */
import type { CatalogExercise, EquipmentId } from "@/features/routine/exercise-catalog-labels";
import { isEquipmentAvailable, isExerciseAvailable, pickAvailableEquipment } from "@/features/gym/gym-equipment-mapping";
import { setShare, type StimulusOf } from "@/features/routine/fit";

export type GymSwapOption = { exerciseId: string; name: string; equipment: EquipmentId; overlapPct: number };
export type GymSwap =
  | { kind: "ok" }
  | { kind: "other-equipment"; equipment: EquipmentId }
  | { kind: "replace"; options: GymSwapOption[] }
  | { kind: "none" };

/** 이/가 — 받침 있으면 '이'. */
export function iGa(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "이" : "가";
}
/** (으)로 — 받침이 있고 ㄹ이 아니면 '으로'. */
export function euro(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  return jong !== 0 && jong !== 8 ? "으로" : "로";
}

/** 대체로 칠 최소 겹침. */
export const MIN_OVERLAP = 0.4;

export function muscleOverlap(a: Record<string, number>, b: Record<string, number>): number {
  const total = Object.values(a).reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  let shared = 0;
  for (const [k, v] of Object.entries(a)) shared += Math.min(v, b[k] ?? 0);
  return shared / total;
}

export function gymSwapFor(
  exerciseId: string,
  equipment: string,
  gym: ReadonlySet<string> | null,
  catalog: readonly CatalogExercise[],
  partOf: (exerciseId: string) => string,
  stimulusOf: StimulusOf,
  limit = 2,
): GymSwap {
  if (gym === null) return { kind: "ok" };
  const ex = catalog.find((c) => c.id === exerciseId);
  if (!ex) return { kind: "ok" };
  if (isEquipmentAvailable(equipment as EquipmentId, gym)) return { kind: "ok" };
  const variant = ex.equipments.find((v) => v.equipment !== equipment && isEquipmentAvailable(v.equipment, gym));
  if (variant) return { kind: "other-equipment", equipment: variant.equipment };

  const base = setShare(stimulusOf(exerciseId));
  const part = partOf(exerciseId);
  const options = catalog
    .filter((c) => c.id !== exerciseId && partOf(c.id) === part && isExerciseAvailable(c, gym))
    .map((c) => ({ c, overlap: muscleOverlap(base, setShare(stimulusOf(c.id))) }))
    .filter((x) => x.overlap >= MIN_OVERLAP)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(({ c, overlap }) => ({ exerciseId: c.id, name: c.name, equipment: pickAvailableEquipment(c, gym), overlapPct: Math.round(overlap * 100) }));
  return options.length ? { kind: "replace", options } : { kind: "none" };
}
