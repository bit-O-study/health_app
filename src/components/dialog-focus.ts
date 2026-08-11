export function nextDialogFocusIndex(
  currentIndex: number,
  focusableCount: number,
  backwards: boolean,
): number {
  if (focusableCount < 1) return -1;
  if (currentIndex < 0 || currentIndex >= focusableCount) {
    return backwards ? focusableCount - 1 : 0;
  }
  const delta = backwards ? -1 : 1;
  return (currentIndex + delta + focusableCount) % focusableCount;
}
