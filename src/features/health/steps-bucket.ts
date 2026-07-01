/**
 * 걸음수 버킷팅 — 순수 모듈(네이티브/DOM 없음 → 단위 테스트 가능).
 *
 * Health Connect 의 Steps 레코드는 각자 시작시각(startTime)을 가진다. 이걸 **서울(Asia/Seoul)
 * 날짜**로 환산해 날짜별 합계로 모은다. 기기 타임존이 서울이 아니거나 자정 근처여도
 * 캘린더(서울 고정 for_date)와 같은 날짜에 귀속돼 "걸음수가 엉뚱한 날/0으로 뜨는" 문제를 막는다.
 */

/** 임의 시각을 서울(Asia/Seoul) 기준 YYYY-MM-DD 로. 파싱 불가면 null. */
export function seoulYmdOf(t: string | number | Date): string | null {
  const d = t instanceof Date ? t : new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  // en-CA 로케일 → "YYYY-MM-DD" 형식으로 안정 출력.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type StepRecordLike = {
  count?: number | string | null;
  startTime?: string | number | Date | null;
  /** 데이터 출처(앱 패키지). 여러 앱이 같은 걸음수를 Health Connect 에 기록하면 중복된다. */
  metadata?: { dataOrigin?: string | null } | null;
  dataOrigin?: string | null;
};

/**
 * Steps 레코드를 서울 날짜별 걸음수로 버킷팅한다.
 *
 * ⚠ 중복 방지: 삼성헬스 + 다른 앱(또는 겹치는 레코드)이 같은 걸음수를 Health Connect 에
 * 각각 기록하면 전부 더하면 2배가 된다. 그래서 **날짜별로 '데이터 출처(dataOrigin)'별 합계**
 * 를 낸 뒤, 그 중 **최댓값**을 그 날 걸음수로 쓴다(같은 하루를 두 소스가 중복 기록해도
 * 한 소스치만 반영). 출처 정보가 없으면 하나의 출처로 보고 합산한다.
 * startTime 없거나 파싱 불가면 fallbackYmd(보통 오늘)로 귀속. count 0/음수/비수치는 건너뜀.
 */
export function bucketStepsBySeoulDay(
  records: readonly StepRecordLike[] | null | undefined,
  fallbackYmd: string,
): Record<string, number> {
  // ymd → (dataOrigin → 합계)
  const byDayOrigin: Record<string, Record<string, number>> = {};
  for (const r of records ?? []) {
    const n = Number(r?.count);
    if (!Number.isFinite(n) || n <= 0) continue;
    const ymd =
      (r?.startTime != null ? seoulYmdOf(r.startTime) : null) ?? fallbackYmd;
    const origin = r?.metadata?.dataOrigin ?? r?.dataOrigin ?? "";
    const perOrigin = (byDayOrigin[ymd] ??= {});
    perOrigin[origin] = (perOrigin[origin] ?? 0) + n;
  }
  const out: Record<string, number> = {};
  for (const [ymd, origins] of Object.entries(byDayOrigin)) {
    const sums = Object.values(origins);
    out[ymd] = sums.length ? Math.max(...sums) : 0;
  }
  return out;
}
