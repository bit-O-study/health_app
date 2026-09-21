/** 잔디 한 칸 — 홈 위젯이 연속일수를 셀 때 필요한 최소 정보만 본다. */
export type StreakDay = {
  /** 운동한 시간(분). 0 이하면 안 한 날. */
  minutes: number;
  /** -1 은 집계 범위 밖(달력 앞뒤 여백). 세지 않는다. */
  level: number;
};

/**
 * 연속 운동일수 — 최근 날짜부터 거꾸로 센다(2026-09-20 런처 홈 위젯).
 *
 * **오늘은 아직 안 했을 수 있다.** 그래서 마지막 날이 0분이면 그 하루는 건너뛰고
 * 어제부터 센다 — 저녁에 운동하는 사람이 아침에 홈을 열었다고 연속이 끊긴 것처럼
 * 보이면 안 된다. 어제까지도 0이면 연속은 0이다.
 */
export function computeStreakDays(days: readonly StreakDay[]): number {
  const counted = days.filter((d) => d.level !== -1);
  let i = counted.length - 1;
  if (i < 0) return 0;
  // 오늘이 비어 있으면 한 칸만 봐준다.
  if (counted[i].minutes <= 0) i -= 1;

  let streak = 0;
  for (; i >= 0; i -= 1) {
    if (counted[i].minutes <= 0) break;
    streak += 1;
  }
  return streak;
}
