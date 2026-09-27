/**
 * 권한 넛지는 **한 번에 하나만** 띄운다.
 *
 * 예전엔 알림·걸음수 배너가 홈 맨 위에 두 장 겹쳐 떠서 내 정보보다 먼저 보였다.
 * 알림을 먼저 묻고(리마인더·그룹 응원이 알림에 달려 있다), 닫거나 허용하면
 * 그다음에 걸음수를 묻는다.
 */
export type NudgeKind = "push" | "steps";

export function pickNudge(state: {
  push: boolean;
  steps: boolean;
}): NudgeKind | null {
  if (state.push) return "push";
  if (state.steps) return "steps";
  return null;
}
