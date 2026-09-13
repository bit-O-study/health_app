/**
 * 오프라인 큐가 **나중에** 올리는 기록의 날짜를 정한다 — 서버에서 판정.
 *
 * ## 왜 클라이언트 날짜를 그냥 믿지 않는가
 * 큐 항목은 "23:55 에 친 세트" 처럼 **누른 순간의 날짜**를 들고 온다. 그걸 안 쓰면
 * 00:05 에 올라간 기록이 하루 밀려 주간 분석이 통째로 어긋난다. 그렇다고 클라이언트가
 * 보낸 날짜를 그대로 쓰면 **아무 날짜에나 기록을 심을 수 있다** — 지난달을 전부
 * 채워 넣고 연속 기록·그룹 랭킹을 만들어 낼 수 있다는 뜻이다.
 *
 * 그래서 **오늘과 어제만** 받는다. 큐가 존재하는 이유(자정을 넘긴 운동, 잠깐의 끊김)는
 * 전부 이 폭 안에 들어오고, 그 밖은 정당한 쓰임이 없다.
 *
 * 🔴 벗어난 값은 거절이 아니라 **오늘로 떨어뜨린다.** 거절하면 그 세트는 영영
 * 사라지는데, 이건 악의보다 기기 시계 문제일 가능성이 훨씬 크다(큐는 48시간 뒤
 * 스스로 버리므로 옛 기록이 여기까지 올 일도 거의 없다).
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function epochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * @param requested 클라이언트가 보낸 날짜(YYYY-MM-DD). 없으면 오늘.
 * @param todayYmd  서버가 판정한 오늘(서울).
 * @returns 실제로 기록할 날짜.
 */
export function resolveForDate(
  requested: string | undefined | null,
  todayYmd: string,
): string {
  if (!requested || !YMD.test(requested)) return todayYmd;
  const diff = epochDay(todayYmd) - epochDay(requested);
  // 어제(1)와 오늘(0)만. 미래(음수)도 오늘로 — 기기 시계가 앞선 경우다.
  return diff === 0 || diff === 1 ? requested : todayYmd;
}
