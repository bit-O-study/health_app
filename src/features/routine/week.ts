/**
 * 그 주의 월요일(YYYY-MM-DD) — 주간 볼륨 · 주간 정리 알림 · 1년 돌아보기가 이 함수 하나만 쓴다
 * (2026-10-07 정리: 같은 계산이 세 곳에 따로 있었다). 한국 기준 월요일 시작.
 */
export function weekStartYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay(); // 0=일
  dt.setUTCDate(dt.getUTCDate() - (jsDay === 0 ? 6 : jsDay - 1));
  return dt.toISOString().slice(0, 10);
}
