/**
 * 이번 주 정리 알림 — 라이트(990원) 2단계 혜택 2(2026-10-02, docs/lite-stage2-design-2026-10-02.html). 순수 판정.
 *
 * 🔴 별도 cron 을 두지 않는다 — Vercel cron 두 자리가 꽉 차 있어(`vercel-crons.test.ts`) 하루 리마인더
 *    cron(매일 20시) 안에서 **일요일에만** 판정한다(토요일 부위 균형 알림과 같은 방식).
 * 🔴 저녁에 두 통 보내지 않는다 — 이 알림을 받는 라이트 회원에게는 그날 하루 리마인더를 빼고 이것만 보낸다.
 * 🔴 운동을 안 한 주에도 다그치지 않는다 — 다음 주 첫 운동을 권하는 한 줄.
 */

/** 0=월 … 6=일. 일요일 저녁 = 한 주가 끝나는 때. */
export const SUMMARY_WEEKDAY = 6;

export function isSummaryDay(ymd: string): boolean {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  const dow = new Date(t).getUTCDay();
  return (dow === 0 ? 6 : dow - 1) === SUMMARY_WEEKDAY;
}

export function weeklySummaryKey(weekStart: string): string {
  return `weekly-summary:${weekStart}`;
}

export type WeekNumbers = {
  /** 이번 주 운동한 날. */
  days: number;
  volumeKg: number;
  /** 지난주 볼륨(없으면 0). */
  prevVolumeKg: number;
  /** 이번 주 신기록 수. */
  prs: number;
  /** 단백질 목표를 채운 날(식단 기록이 없으면 null — 말하지 않는다). */
  proteinHitDays: number | null;
};

export type SummaryPayload = { type: "weekly-summary"; title: string; body: string; url: string };

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 이번 주 숫자 → 알림 한 통. */
export function weeklySummaryPayload(n: WeekNumbers): SummaryPayload {
  const url = "/fit?tab=report";
  if (n.days === 0) {
    return {
      type: "weekly-summary",
      title: "이번 주 정리",
      body: "이번 주는 쉬었어요. 다음 주 첫 운동을 잡아 볼까요?",
      url,
    };
  }
  const parts = [`${n.days}일 운동`];
  if (n.volumeKg > 0) {
    const change = n.prevVolumeKg > 0 ? Math.round(((n.volumeKg - n.prevVolumeKg) / n.prevVolumeKg) * 100) : null;
    parts.push(`볼륨 ${fmt(n.volumeKg)}kg${change == null || change === 0 ? "" : `(${change > 0 ? "+" : ""}${change}%)`}`);
  }
  if (n.prs > 0) parts.push(`신기록 ${n.prs}개`);
  if (n.proteinHitDays != null) parts.push(`단백질 채운 날 ${n.proteinHitDays}일`);
  return {
    type: "weekly-summary",
    title: n.prs > 0 ? "이번 주 정리 · 신기록이 나왔어요 🎉" : "이번 주 정리",
    body: parts.join(" · "),
    url,
  };
}
