import { allExercisesForSlot, focusExercisesForSlot, sideExercisesForSlot } from "./recommend";
import { personalizeExercises } from "./recommend-personalization";

/** All recommendation entry points use the same slot selection and personalization. */
export function recommendSlot(
  focus: Parameters<typeof focusExercisesForSlot>[0],
  blockIds: Parameters<typeof focusExercisesForSlot>[1],
  gender: Parameters<typeof focusExercisesForSlot>[2],
  gym: Parameters<typeof focusExercisesForSlot>[3],
  context: Parameters<typeof focusExercisesForSlot>[4],
  personalization: Parameters<typeof personalizeExercises>[3],
  isSide = false,
) {
  const base = isSide
    ? sideExercisesForSlot(focus, blockIds, gender, gym)
    : focusExercisesForSlot(focus, blockIds, gender, gym, context);
  return personalizeExercises(base, allExercisesForSlot(focus, blockIds), gym ?? null, personalization, isSide, focus);
}
