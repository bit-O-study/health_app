import type { EquipmentId } from "@/features/routine/exercise-catalog";

/**
 * 운동 카탈로그의 거친 EquipmentId(5종) 를 헬스장 기구로 만족하는지 판정.
 *
 * EquipmentId 가 barbell/dumbbell/machine/cable/bodyweight 5종으로 카테고리화
 * 되어 있어 정확한 매핑은 한계가 있다. "있을 법한 기구 중 하나라도 있으면 가능"
 * 으로 판정 — false positive(있다고 판정했는데 실제로는 없음) 위험 있지만
 * false negative(있는데 없다고 판정해 사용자가 못 고르게 됨) 보다는 덜 짜증남.
 */
const EQUIPMENT_REQUIREMENTS: Record<EquipmentId, string[]> = {
  // 바벨 운동: 바벨 또는 스미스머신 (스미스로도 비슷한 운동 대체 가능)
  barbell: ["barbell", "smith"],
  // 덤벨
  dumbbell: ["dumbbell"],
  // "머신" 카테고리 — 다양한 머신 중 어느 하나만 있어도 통과 (정확도 한계)
  machine: [
    "chest_press",
    "shoulder_press",
    "pec_deck",
    "lateral_raise",
    "tricep_machine",
    "leg_press",
    "hack_squat",
    "leg_extension",
    "leg_curl",
    "calf_raise",
    "adduction",
    "glute_machine",
    "smith",
    "preacher_curl",
  ],
  // 케이블 — 케이블 머신 / 랫풀다운 / 시티드 로우 / 크로스오버
  cable: ["cable_dual", "cable_crossover", "lat_pulldown", "seated_row"],
  // 맨몸 — 풀업/딥 등 일부는 봉 필요하지만 평균적으로 어디서나 가능 → 항상 통과
  bodyweight: [],
  // 확장 기구(1,300 카탈로그). 휴대/소도구류는 항상 통과(false negative 최소화).
  smith: ["smith"],
  kettlebell: ["dumbbell"],
  landmine: ["barbell"],
  band: [],
  trx: [],
  medicineball: [],
  sled: [],
  battlerope: [],
  bosu: [],
  ball: [],
  plate: [],
  other: [],
};

/**
 * 해당 equipment 카테고리가 헬스장에 있는지.
 * gymEquipment = null → 미설정 사용자, 필터 안 함 (모두 가능).
 */
export function isEquipmentAvailable(
  equipmentId: EquipmentId,
  gymEquipment: ReadonlySet<string> | null,
): boolean {
  if (gymEquipment === null) return true;
  const required = EQUIPMENT_REQUIREMENTS[equipmentId];
  if (!required || required.length === 0) return true;
  return required.some((id) => gymEquipment.has(id));
}

/** 배열 → Set 헬퍼 (null 처리 포함) */
export function toGymEquipmentSet(
  ids: readonly string[] | null,
): ReadonlySet<string> | null {
  if (ids === null) return null;
  return new Set(ids);
}

/** 기구 옵션만 있으면 되는 최소 모양 — 카탈로그 전체를 끌고 오지 않는다. */
type WithEquipments = { equipments: readonly { equipment: EquipmentId }[] };

/**
 * 이 운동을 그 헬스장에서 할 수 있는가.
 * 운동은 보통 기구 옵션이 여러 개다(예: 프레스 = 바벨/덤벨/머신) — **하나라도**
 * 되면 할 수 있는 운동이다.
 */
export function isExerciseAvailable(
  ex: WithEquipments,
  gymEquipment: ReadonlySet<string> | null,
): boolean {
  if (gymEquipment === null) return true;
  return ex.equipments.some((eq) => isEquipmentAvailable(eq.equipment, gymEquipment));
}

/** 운동의 기구 옵션 중 헬스장에 있는 첫 번째. 없으면 첫 번째(=카탈로그 기본값). */
export function pickAvailableEquipment(
  ex: WithEquipments,
  gymEquipment: ReadonlySet<string> | null,
): EquipmentId {
  const ok = ex.equipments.find((eq) =>
    isEquipmentAvailable(eq.equipment, gymEquipment),
  );
  return ok?.equipment ?? ex.equipments[0].equipment;
}

/**
 * 헬스장에서 할 수 있는 운동만 남긴다.
 *
 * 🔴 **전부 걸러지면 원본을 그대로 돌려준다.** 추천이 비면 그 부위는 빈칸으로
 * 남는데, 그건 "우리 헬스장엔 없는 운동 하나가 섞여 있다" 보다 훨씬 나쁘다.
 * (기구 판정 자체가 5종 카테고리라 정확하지 않다 — 확신 없이 지우지 않는다.)
 */
export function keepAvailableExercises<T extends WithEquipments>(
  list: readonly T[],
  gymEquipment: ReadonlySet<string> | null,
): T[] {
  if (gymEquipment === null) return [...list];
  const doable = list.filter((ex) => isExerciseAvailable(ex, gymEquipment));
  return doable.length > 0 ? doable : [...list];
}
