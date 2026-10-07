/** 그룹 스트릭/뱃지 — 순수 로직(운동일 집합 → 연속일·뱃지). 테스트 가능. */

import { addDaysYmd } from "@/features/groups/ranking";
import { countStreak } from "@/features/routine/streak-rule";

/**
 * 연속 운동일 스트릭 — 오늘(또는 어제)부터 거꾸로 끊기지 않고 이어진 운동일 수.
 * 오늘 아직 운동을 안 했어도 어제까지 이어졌으면 스트릭은 유지된다(오늘은 진행 중).
 */
export function computeWorkoutStreak(
  workoutDates: Iterable<string>,
  today: string,
): number {
  const set = new Set(workoutDates);
  if (set.size === 0) return 0;
  // 캘린더·홈과 같은 규칙(streak-rule). 상한은 기록 수 — 그보다 길게 이어질 수 없다.
  return countStreak((k) => set.has(addDaysYmd(today, -k)), set.size);
}

export type Badge = { id: string; label: string; emoji: string };

/** 연속일 임계값별 뱃지(가장 높은 것 순으로 정렬해 반환). */
export function streakBadges(streak: number): Badge[] {
  const out: Badge[] = [];
  if (streak >= 3) out.push({ id: "streak3", label: "3일 연속", emoji: "🔥" });
  if (streak >= 7) out.push({ id: "streak7", label: "일주일 연속", emoji: "⚡" });
  if (streak >= 14) out.push({ id: "streak14", label: "2주 연속", emoji: "💎" });
  if (streak >= 30) out.push({ id: "streak30", label: "30일 연속", emoji: "🏆" });
  return out.reverse();
}

/** 화면에 하나만 강조할 때 쓸 '대표 뱃지'(가장 높은 등급). 없으면 null. */
export function topBadge(streak: number): Badge | null {
  return streakBadges(streak)[0] ?? null;
}
