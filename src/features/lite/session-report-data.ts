import "server-only";

import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import { makeStimulusOf } from "@/features/routine/fit-data";
import { getTodayCheckin } from "@/features/routine/checkin-data";
import { recoveryByPart, recoveryInputs } from "@/features/routine/fit-insights";
import type { PartId } from "@/features/routine/fit";
import { sessionReport, type SessionReport } from "@/features/lite/session-report";
import { loadRecentRecords } from "@/features/lite/recent-records";

/** 오늘 한 부위가 다 회복되는 때 — "다음 가슴은 10/10 저녁부터". */
export type ReadyAt = { part: PartId; at: string };

/**
 * 운동 끝 리포트 데이터 — 오늘 끝낸 운동 + 지난 120일(지난번·신기록 비교용) + 오늘 한 부위가 언제 풀리는지.
 * 오늘 끝낸 운동이 없으면 null(카드를 안 그린다).
 */
export async function loadSessionReport(): Promise<{ report: SessionReport; full: boolean; ready: ReadyAt[] } | null> {
  const [recent, plan, checkin] = await Promise.all([loadRecentRecords(), resolvePlan(), getTodayCheckin().catch(() => null)]);
  if (!recent) return null;
  const stimulusOf = makeStimulusOf();
  const report = sessionReport(recent.records, recent.today, stimulusOf);
  if (!report) return null;
  const now = new Date();
  // 오늘 한 부위(오늘 끝낸 운동이 회복을 붙잡고 있는 부위)만 — 며칠 전 운동은 이 카드의 일이 아니다.
  const recovery = recoveryByPart(recoveryInputs(recent.records, now), stimulusOf, now, checkin);
  const ready = recovery
    .filter((r) => r.hoursLeft > 0 && r.lastAt && new Date(Date.parse(r.lastAt) + 9 * 3_600_000).toISOString().slice(0, 10) === recent.today)
    .map((r) => ({ part: r.part, at: new Date(now.getTime() + r.hoursLeft * 3_600_000).toISOString() }))
    .sort((a, b) => b.at.localeCompare(a.at));
  return { report, full: hasPlan(plan, "lite"), ready };
}
