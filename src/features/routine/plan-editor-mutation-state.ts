export type ConditioningMutationState = {
  dirty: boolean;
  pending: boolean;
};

export type ArmSwapBlockReason = "dirty" | "pending" | null;

export function armSwapBlockReason({
  mainDirtyCount,
  mainPending,
  conditioningStates,
}: {
  mainDirtyCount: number;
  mainPending: boolean;
  conditioningStates: Readonly<Record<string, ConditioningMutationState>>;
}): ArmSwapBlockReason {
  const conditioning = Object.values(conditioningStates);
  if (mainPending || conditioning.some((state) => state.pending)) {
    return "pending";
  }
  if (mainDirtyCount > 0 || conditioning.some((state) => state.dirty)) {
    return "dirty";
  }
  return null;
}
