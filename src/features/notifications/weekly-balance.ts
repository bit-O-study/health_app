/**
 * 주간 균형 알림 — "이번 주 하체를 아직 안 했어요" 순수 판정(cron·테스트 공용).
 *
 * 왜 이 알림이 필요한가: 어느 부위를 빼먹고 있다는 건 **주가 끝난 뒤에 알면 늦다.**
 * 점수 화면에 들어가야만 보이니 대부분은 영영 모르고 지나간다. 주말이 남았을 때
 * 한 번만 알려 주면 그 주 안에 메울 수 있다.
 *
 * 🔴 **별도 cron 을 두지 않는다.** Vercel Hobby 는 cron 이 **두 개까지**이고
 * (`tests/be/logic/vercel-crons.test.ts` 가 지킨다) 두 자리를 이미 쓰고 있다.
 * 그래서 하루 리마인더 cron(매일 저녁) 안에서 **토요일에만** 함께 판정한다.
 *
 * 🔴 그리고 **한 사람에게 저녁에 두 번 보내지 않는다.** 하루 리마인더가 나갈 사람에게
 * 균형 알림까지 보내면 알림 두 개가 연달아 뜨고, 그건 알림 자체를 끄게 만드는 바로
 * 그 행동이다. 리마인더가 안 나가는 사람(= 오늘 할 일을 이미 한 사람)에게만 보낸다 —
 * 마침 이 알림이 필요한 사람도 그쪽이다(나오고는 있는데 한쪽만 하는 사람).
 *
 * 보내는 조건(전부 만족해야 한다):
 *  1) **이번 주에 운동을 했다.** 아예 안 나온 사람에게 "하체 0세트"는 잔소리다 —
 *     그 사람에게 필요한 알림은 이미 있는 하루 리마인더다.
 *  2) **안 한 부위가 있다.** 없으면 보낼 말이 없다.
 *  3) **전부 안 한 게 아니다.** 여섯 부위가 다 0이면 그건 부위 배분 문제가 아니라
 *     기록이 제대로 안 남은 것(운동 id 없는 옛 기록 등)일 가능성이 크다 —
 *     그런 추측으로 알림을 보내지 않는다.
 */

/** 전체 부위 수. 이 수만큼 비어 있으면 '배분 문제'로 보지 않는다. */
export const ALL_REGION_COUNT = 6;

export type BalancePayload = {
  type: string;
  title: string;
  body: string;
  url: string;
};

/** 이 알림을 판정할 요일 — 0=월 … 5=토. 주말이 남아 있어야 메울 수 있다. */
export const NUDGE_WEEKDAY = 5;

/** `YYYY-MM-DD` 가 토요일인가(서울 기준 날짜 문자열). */
export function isNudgeDay(ymd: string): boolean {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  const dow = new Date(t).getUTCDay(); // 0=일
  return (dow === 0 ? 6 : dow - 1) === NUDGE_WEEKDAY;
}

export function balanceNudgeFor(opts: {
  /** 이번 주 직접 세트 합계. */
  weekSets: number;
  /** 이번 주 한 세트도 안 한 부위 라벨(예: ["하체", "코어"]). */
  untouchedLabels: readonly string[];
}): BalancePayload | null {
  const { weekSets, untouchedLabels } = opts;
  if (weekSets <= 0) return null;
  if (untouchedLabels.length === 0) return null;
  if (untouchedLabels.length >= ALL_REGION_COUNT) return null;

  // 이름을 자르지 않는다 — 정작 찾던 부위가 "외 2" 에 묻히면 알림의 뜻이 사라진다.
  const names = untouchedLabels.join("·");
  return {
    type: "weekly-balance",
    title: `이번 주 ${names}, 아직이에요`,
    body: `이번 주 ${weekSets}세트 하셨어요. 주말에 ${names}를 채우면 균형이 맞아요.`,
    url: "/settings/score",
  };
}

/** 주간 균형 알림 키 — 주(월요일 날짜)별로 한 번. */
export function weeklyBalanceKey(weekStartYmd: string): string {
  return `weekly-balance:${weekStartYmd}`;
}
