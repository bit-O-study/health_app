/**
 * 오늘 운동 진행률 — 워밍업·본운동·마무리를 **한 덩어리로** 센다.
 *
 * 예전엔 운동탭이 "얼마나 했나"를 칼로리(kcal)로만 말했다. kcal 은 종목마다 무게가
 * 달라 "몇 개 남았나"를 알려주지 못한다(가벼운 마무리 3개가 남아도 숫자는 거의 안 준다).
 * 그래서 **개수 기준** 진행률을 따로 둔다 — 남은 게 몇 개인지가 사람이 보는 값이다.
 *
 * '오늘 안 함'(skipped)도 **끝난 항목**으로 친다. 안 그러면 스킵한 운동 때문에
 * 진행률이 영영 100%가 안 돼서, 다 끝낸 날에도 막대가 덜 찬 채로 남는다.
 * 다만 완료와 같은 색으로 세지는 않는다 — 막대를 두 구간으로 나눠 구분한다.
 *
 * 순수 함수: 화면(today-exercises)이 세는 규칙을 여기 한 곳에만 둔다.
 */

export type TodayProgressInput = {
  /** 오늘 담긴 항목 수(워밍업 + 본운동 + 마무리). */
  total: number;
  /** 완료한 항목 수. */
  done: number;
  /** '오늘 안 함'으로 넘긴 항목 수. */
  skipped: number;
};

export type TodayProgress = {
  total: number;
  done: number;
  skipped: number;
  /** 아직 안 건드린 항목 수. */
  remaining: number;
  /** 막대에서 완료가 차지하는 비율(0~100). */
  donePct: number;
  /** 막대에서 '오늘 안 함'이 차지하는 비율(0~100). donePct 와 합쳐 100 을 넘지 않는다. */
  skippedPct: number;
  /** 오늘 할 게 남지 않았는가(완료 + 넘김 = 전체). 담긴 게 0이면 false. */
  settled: boolean;
  /** "3/8 완료" */
  label: string;
  /** "2개 넘김" — 넘긴 게 없으면 null(없는 말을 자리만 잡고 띄우지 않는다). */
  skippedLabel: string | null;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function todayProgress(input: TodayProgressInput): TodayProgress {
  const total = clamp(input.total, 0, Number.MAX_SAFE_INTEGER);
  // 완료 → 넘김 순으로 자리를 준다. 합이 전체를 넘으면(있을 수 없지만 서버/로컬
  // 상태가 어긋난 순간) 막대가 100% 를 넘어 튀어나가지 않게 잘라 둔다.
  const done = clamp(input.done, 0, total);
  const skipped = clamp(input.skipped, 0, total - done);
  const remaining = total - done - skipped;

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const donePct = pct(done);
  const skippedPct = Math.min(pct(skipped), 100 - donePct);

  return {
    total,
    done,
    skipped,
    remaining,
    donePct,
    skippedPct,
    settled: total > 0 && remaining === 0,
    label: `${done}/${total} 완료`,
    skippedLabel: skipped > 0 ? `${skipped}개 넘김` : null,
  };
}
