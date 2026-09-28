"use server";
import { revalidatePath } from "next/cache";
import { intervalSummary, intervalTotalSec, validIntervalPlan, type IntervalPlan } from "./interval-plan";
import { recordRunSessionAction } from "./run-record-actions";
export async function saveIntervalRunAction(input: { clientSessionId: string; startedAt: string; endedAt: string; elapsedSec: number; plan: IntervalPlan }): Promise<{ ok: boolean; error?: string }> {
  if (!validIntervalPlan(input.plan) || !Number.isFinite(input.elapsedSec) || input.elapsedSec < 60 || input.elapsedSec > intervalTotalSec(input.plan)) {
    return { ok: false, error: "운동 기록을 확인해 주세요. 1분 이상 진행한 운동부터 저장할 수 있어요." };
  }
  const summary = intervalSummary(input.plan, input.elapsedSec);
  const result = await recordRunSessionAction({
    clientSessionId: input.clientSessionId, mode: "indoor",
    startedAt: input.startedAt, endedAt: input.endedAt,
    activeDurationSec: input.elapsedSec, distanceM: summary.distanceM,
    avgKmh: summary.avgKmh, incline: summary.incline,
  });
  if (result.ok) revalidatePath("/routine/running-records");
  return result.ok ? { ok: true } : { ok: false, error: "기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
}
