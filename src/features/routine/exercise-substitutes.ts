import type { CatalogExercise, EquipmentId } from "@/features/routine/exercise-catalog-labels";

export type ExerciseSubstitute = {
  exerciseId: string;
  name: string;
  equipment: EquipmentId;
  reason: string;
};

/** 같은 부위 후보 중 내 헬스장에서 가능한 운동을 고르고, 같은 기구를 우선한다. */
export function recommendExerciseSubstitutes(
  currentExerciseId: string,
  currentEquipment: EquipmentId,
  candidates: readonly CatalogExercise[],
  availableEquipment: ReadonlySet<string> | null,
  limit = 3,
): ExerciseSubstitute[] {
  return candidates
    .filter((exercise) => exercise.id !== currentExerciseId)
    .flatMap((exercise) => {
      const equipments = exercise.equipments
        .map((variant) => variant.equipment)
        .filter((equipment) => !availableEquipment || availableEquipment.has(equipment));
      const equipment = equipments.includes(currentEquipment)
        ? currentEquipment
        : equipments[0];
      if (!equipment) return [];
      return [{
        exerciseId: exercise.id,
        name: exercise.name,
        equipment,
        reason:
          equipment === currentEquipment
            ? "같은 부위·같은 기구로 동작을 바꿔 정체 자극을 줄여요."
            : "같은 부위를 쓰면서 현재 헬스장에 있는 기구로 바꿔요.",
      }];
    })
    .sort((a, b) => Number(b.equipment === currentEquipment) - Number(a.equipment === currentEquipment))
    .slice(0, Math.max(0, limit));
}
