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
};

/**
 * Steps 레코드를 서울 날짜별 합계로 버킷팅한다.
 * startTime 이 없거나 파싱 불가면 손실 방지를 위해 fallbackYmd(보통 오늘)로 귀속시킨다.
 * count 가 0/음수/비수치면 건너뛴다.
 */
export function bucketStepsBySeoulDay(
  records: readonly StepRecordLike[] | null | undefined,
  fallbackYmd: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records ?? []) {
    const n = Number(r?.count);
    if (!Number.isFinite(n) || n <= 0) continue;
    const ymd =
      (r?.startTime != null ? seoulYmdOf(r.startTime) : null) ?? fallbackYmd;
    out[ymd] = (out[ymd] ?? 0) + n;
  }
  return out;
}
