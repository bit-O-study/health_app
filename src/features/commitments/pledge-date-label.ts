/**
 * 다짐 기간 표기 — "2026-11-16 ~ 2027-01-10" 대신 읽기 쉬운 "11월 16일 ~ 2027년 1월 10일".
 * 올해(thisYear) 날짜는 연도를 빼고, 다른 해만 연도를 붙인다. 화면 표기 전용(저장 값은 그대로).
 */
export function pledgeDateLabel(ymd: string, thisYear: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const [, y, mo, d] = m;
  const md = `${Number(mo)}월 ${Number(d)}일`;
  return Number(y) === thisYear ? md : `${Number(y)}년 ${md}`;
}

export function pledgeRangeLabel(start: string, end: string, thisYear: number): string {
  return `${pledgeDateLabel(start, thisYear)} ~ ${pledgeDateLabel(end, thisYear)}`;
}
