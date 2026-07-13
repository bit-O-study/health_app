"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
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
import type { SupabaseClient } from "@supabase/supabase-js";

const toInput = (r: ConditioningRow): ConditioningInput => ({
  itemId: r.itemId,
  durationMin: r.durationMin,
  speed: r.speed,
  incline: r.incline,
  sets: r.sets ?? null,
  reps: r.reps ?? null,
});

/** 오늘 누적 운동 시간을 deltaSec 만큼 가감(음수 가능, 0 미만은 0). */
async function adjustWorkoutSeconds(
  supabase: SupabaseClient,
  userId: string,
  forDate: string,
  deltaSec: number,
): Promise<void> {
  const delta = Math.round(deltaSec);
  if (delta === 0) return;
  const { data } = await supabase
    .from("workout_sessions")
    .select("duration_sec")
    .eq("user_id", userId)
    .eq("for_date", forDate)
    .maybeSingle();
  const total = Math.max(0, Number(data?.duration_sec ?? 0) + delta);
  await supabase.from("workout_sessions").upsert(
    {
      user_id: userId,
      for_date: forDate,
      duration_sec: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
}

/**
 * 런닝(실내/야외) 종료 → 오늘 '마무리 운동'에 러닝을 완료로 기록한다.
 *
 * ⚠ 하루에 여러 번 달려도 러닝 행은 **1개만** 유지하고 시간을 누적한다(예전엔 매번 새 행이
 * 쌓여 삭제가 번거롭고 목록이 지저분했다). 기존 오늘 마무리(오버라이드/루틴 기본)는 보존.
 */
export async function recordRunAsCooldownAction(input: {
  durationMin: number;
  /** 실제 런닝 초 — 오늘 운동 시간(누적)에 더한다. 없으면 durationMin*60. */
  durationSec?: number;
  distanceKm?: number | null;
  avgKmh?: number | null;
  incline?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const today = seoulYmd();
  const durationMin = Math.max(1, Math.round(input.durationMin || 1));
  const durationSec = Math.max(
    0,
    Math.round(input.durationSec ?? durationMin * 60),
  );
  const speed =
    input.avgKmh != null && input.avgKmh > 0
      ? Math.round(input.avgKmh * 10) / 10
      : null;
  const incline =
    input.incline != null && input.incline >= 0 ? Math.round(input.incline) : null;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 오늘 운동 시간(누적)에 런닝 시간 더하기(삭제 시 removeTodayRunAction 이 뺀다).
  if (durationSec > 0) await adjustWorkoutSeconds(supabase, user.id, today, durationSec);

  const override = (await getDailyConditioning(today)).cooldown;
  const existingRun = override.find((r) => r.itemId === "running");

  // 이미 오늘 러닝 행이 있으면 시간 누적(행 추가 X, id 유지).
  if (existingRun) {
    const newDur = (existingRun.durationMin ?? 0) + durationMin;
    const upd = await supabase
      .from("daily_conditioning")
      .update({ duration_min: newDur, speed, incline })
      .eq("user_id", user.id)
      .eq("id", existingRun.id);
    if (upd.error) return { ok: false, error: upd.error.message };
    await setConditioningStatusAction("cooldown", existingRun.id, "running", "done", {
      durationMin: newDur,
      speed,
      incline,
    });
    revalidatePath("/routine");
    return { ok: true };
  }

  // 첫 러닝 — 기존 오늘 마무리(오버라이드 or 루틴 기본)를 보존하며 러닝을 얹는다.
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
    { itemId: "running", durationMin, speed, incline, sets: null, reps: null },
  ];
  const saved = await saveDailyConditioningAction(today, "cooldown", nextList);
  if (!saved.ok) return { ok: false, error: saved.error };

  const after = (await getDailyConditioning(today)).cooldown;
  const runRow = [...after].reverse().find((r) => r.itemId === "running");
  if (runRow) {
    await setConditioningStatusAction("cooldown", runRow.id, "running", "done", {
      durationMin,
      speed,
      incline,
    });
  }
  revalidatePath("/routine");
  return { ok: true };
}

/**
 * 오늘 러닝 기록 삭제 — 마무리 러닝 행 + 완료기록을 지우고, 그 시간을 오늘 운동 시간에서 뺀다.
 * (런닝 항목을 '완료취소/삭제' 할 때 호출.)
 */
export async function removeTodayRunAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const today = seoulYmd();
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const runRow = (await getDailyConditioning(today)).cooldown.find(
    (r) => r.itemId === "running",
  );
  if (!runRow) {
    revalidatePath("/routine");
    return { ok: true };
  }

  // 오늘 운동 시간에서 러닝 시간만큼 빼기.
  const sec = Math.round((runRow.durationMin ?? 0) * 60);
  if (sec > 0) await adjustWorkoutSeconds(supabase, user.id, today, -sec);

  // 완료기록 + 마무리 러닝 행 삭제.
  await supabase
    .from("conditioning_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("source_row_id", runRow.id);
  await supabase
    .from("daily_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("id", runRow.id);

  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  return { ok: true };
}
