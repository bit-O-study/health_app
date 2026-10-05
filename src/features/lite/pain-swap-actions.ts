"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/supabase/server";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import {
  pinRoutineFocusesForTodayAction,
  replaceExerciseTodayOnlyAction,
} from "@/features/routine/daily-plan-actions";
import { loadFitView } from "@/features/routine/fit-data";
import { pairPainSwaps, swapCandidates } from "@/features/lite/pain-swap";
import { todayPainRows } from "@/features/lite/pain-swap-data";

export type PainSwapResult = { ok: true; swapped: number } | { ok: false; error: string };

/**
 * 아픈 부위 운동을 **오늘만** 다른 부위 운동으로(라이트 2단계 혜택 5).
 * 오늘 루틴을 오늘 계획으로 고정한 뒤 아픈 줄마다 맞춤 운동 추천 하나로 바꾼다 — 내 루틴은 그대로.
 * 화면이 보낸 짝은 믿지 않고 서버가 다시 고른다(미리보기와 같은 계산).
 */
export async function swapPainExercisesTodayAction(): Promise<PainSwapResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!hasPlan(await resolvePlan(), "lite")) return { ok: false, error: "라이트에서 쓸 수 있어요." };
  const pin = await pinRoutineFocusesForTodayAction();
  if (!pin.ok) return pin;
  const rows = await todayPainRows();
  if (rows.length === 0) return { ok: false, error: "오늘 운동에 아픈 부위 운동이 없어요." };
  const fit = await loadFitView({ n: rows.length });
  const pairs = pairPainSwaps(rows, swapCandidates(fit?.picks ?? []));
  if (pairs.length === 0) return { ok: false, error: "대신할 운동을 찾지 못했어요. 헬스장 기구 설정을 확인해 주세요." };
  let swapped = 0;
  for (const p of pairs) {
    const r = await replaceExerciseTodayOnlyAction({
      rowId: p.from.rowId,
      exerciseId: p.from.exerciseId,
      focus: p.from.focus,
      replacementExerciseId: p.to.exerciseId,
      equipment: p.to.equipment,
    });
    if (r.ok) swapped += 1;
  }
  if (swapped === 0) return { ok: false, error: "바꾸지 못했어요. 잠시 후 다시 해 주세요." };
  revalidatePath("/routine");
  return { ok: true, swapped };
}
