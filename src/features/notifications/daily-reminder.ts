/**
 * 하루 리마인더 순수 로직 — 의존성 없는 판정(cron·테스트 공용).
 *
 * 규칙(사용자 요청):
 * - 오늘이 **휴식일**이면 → 식단 미기록 시 "식단 적으세요" 알림.
 * - 오늘이 **운동일**이면 → 운동 미완료 시 "운동하세요" 알림.
 * (이미 기록/완료했으면 아무 알림도 안 보냄.)
 */

export type ReminderKind = "diet" | "workout";

/**
 * 오늘 사용자에게 보낼 리마인더 종류를 판정. 보낼 게 없으면 null.
 *
 * @param isRest    오늘이 휴식일인가
 * @param hasDiet   오늘 식단 기록이 하나라도 있는가
 * @param hasWorkout 오늘 완료한(status=done) 본운동이 하나라도 있는가
 */
export function reminderKindFor(opts: {
  isRest: boolean;
  hasDiet: boolean;
  hasWorkout: boolean;
}): ReminderKind | null {
  if (opts.isRest) {
    return opts.hasDiet ? null : "diet";
  }
  return opts.hasWorkout ? null : "workout";
}

/** 리마인더 종류별 푸시 페이로드(SW 의 generic 알림 분기에서 표시). */
export const REMINDER_PAYLOADS: Record<
  ReminderKind,
  { type: string; title: string; body: string; url: string }
> = {
  diet: {
    type: "reminder-diet",
    title: "오늘 식단을 기록해볼까요? 🥗",
    body: "휴식일이에요. 먹은 걸 남겨두면 다음 주 관리가 쉬워져요.",
    url: "/diet",
  },
  workout: {
    type: "reminder-workout",
    title: "오늘 운동, 아직이에요 💪",
    body: "오늘은 운동일이에요. 가볍게라도 시작해볼까요?",
    url: "/routine",
  },
};