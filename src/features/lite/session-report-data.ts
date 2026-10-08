import "server-only";

import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import { makeStimulusOf } from "@/features/routine/fit-data";
import { sessionReport, type SessionReport } from "@/features/lite/session-report";
import { loadRecentRecords } from "@/features/lite/recent-records";

/**
 * 운동 끝 리포트 데이터 — 오늘 끝낸 운동 + 지난 120일(지난번·신기록 비교용).
 * 오늘 끝낸 운동이 없으면 null(카드를 안 그린다).
 */
export async function loadSessionReport(): Promise<{ report: SessionReport; full: boolean } | null> {
  const [recent, plan] = await Promise.all([loadRecentRecords(), resolvePlan()]);
  if (!recent) return null;
  const report = sessionReport(recent.records, recent.today, makeStimulusOf());
  return report ? { report, full: hasPlan(plan, "lite") } : null;
}
