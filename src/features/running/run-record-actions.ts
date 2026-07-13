"use server";

import { getUserRoutine } from "@/features/routine/data-access";
import {
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
} from "@/features/routine/data";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import { saveDailyConditioningAction } from "@/features/routine/daily-conditioning-actions";
import type { ConditioningInput } from "@/features/routine/conditioning-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import type { ConditioningRow } from "@/features/routine/conditioning";

const toInput = (r: ConditioningRow): ConditioningInput => ({
  itemId: r.itemId,
  durationMin: r.durationMin,
  speed: r.speed,
  incline: r.incline,
  sets: r.sets ?? null,
  reps: r.reps ?? null,
});

/**
 * 런닝(실내/야외) 종료 → 오늘 '마무리 운동'에 러닝 1개를 더해 완료로 기록한다.
 * 기존 오늘 마무리(오버라이드 또는 루틴 기본)를 보존하고 그 위에 러닝을 얹는다.
 */
export async function recordRunAsCooldownAction(input: {
  durationMin: number;
  distanceKm?: number | null;
  avgKmh?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const today = seoulYmd();
  const durationMin = Math.max(1, Math.round(input.durationMin || 1));
  const speed =
    input.avgKmh != null && input.avgKmh > 0
      ? Math.round(input.avgKmh * 10) / 10
      : null;

  // 오늘 마무리 기준 목록: 오버라이드가 있으면 그것, 없으면 오늘 부위 루틴 기본.
  const override = (await getDailyConditioning(today)).cooldown;
  let base = override;
  if (base.length === 0) {
    const routine = await getUserRoutine();
    let focus = "chest";
    if (routine) {
      const { variant } = resolveRoutine(
        routine.splits,
        routine.variantId,
        routine.customWeek,
      );
      const day = variant.week[routineDayOffset(routine.startDate, today)];
      const tone = (day.tones ?? [day.tone]).find((t) => t !== "rest");
      if (tone) focus = tone;
    }
    base = (await getConditioningForFocus(focus)).cooldown;
  }

  const nextList: ConditioningInput[] = [
    ...base.map(toInput),
    { itemId: "running", durationMin, speed, incline: null, sets: null, reps: null },
  ];

  const saved = await saveDailyConditioningAction(today, "cooldown", nextList);
  if (!saved.ok) return { ok: false, error: saved.error };

  // 방금 추가한 러닝 행(마지막 running)을 완료 처리.
  const after = (await getDailyConditioning(today)).cooldown;
  const runRow = [...after].reverse().find((r) => r.itemId === "running");
  if (runRow) {
    await setConditioningStatusAction("cooldown", runRow.id, "running", "done", {
      durationMin,
      speed,
      incline: null,
    });
  }
  return { ok: true };
}
