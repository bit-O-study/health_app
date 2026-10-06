import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import { getPainAreas } from "@/features/routine/checkin-data";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { loadFitView } from "@/features/routine/fit-data";
import { todayExerciseIds } from "@/features/routine/today-exercise-ids";
import { pairPainSwaps, swapCandidates, type PainRow, type SwapPair } from "@/features/lite/pain-swap";

export type PainSwapPreview = {
  /** 라이트 이상 — 아니면 '라이트에서 바로 바꿀 수 있어요' 한 줄만. */
  full: boolean;
  pairs: { fromId: string; fromName: string; toId: string; toName: string }[];
};

/** 오늘 운동 중 아픈 부위 운동(운동 id 기준) — 미리보기용. 적용 때는 오늘 계획 줄 id 로 다시 찾는다. */
export async function painSwapPairsById(): Promise<SwapPair[] | null> {
  const pain = await getPainAreas();
  if (pain.length === 0) return null;
  const ids = [...(await todayExerciseIds())];
  const rows: PainRow[] = ids
    .map((id) => ({ rowId: "", exerciseId: id, focus: "", part: primaryBodyPart(id) }))
    .filter((r) => pain.includes(r.part));
  if (rows.length === 0) return null;
  const fit = await loadFitView({ n: rows.length });
  return pairPainSwaps(rows, swapCandidates(fit?.picks ?? []));
}

/** 오늘 운동 › 컨디션 카드의 아픈 부위 알림 아래 미리보기. 아픈 운동이 없으면 null. */
export async function loadPainSwapPreview(): Promise<PainSwapPreview | null> {
  const [plan, pairs] = await Promise.all([resolvePlan(), painSwapPairsById()]);
  if (!pairs) return null;
  const full = hasPlan(plan, "lite");
  const name = (id: string) => getCatalogExercise(id)?.name ?? id;
  return {
    full,
    pairs: full
      ? pairs.map((p) => ({ fromId: p.from.exerciseId, fromName: name(p.from.exerciseId), toId: p.to.exerciseId, toName: name(p.to.exerciseId) }))
      : [],
  };
}

/** 오늘 계획(daily_plan) 줄 중 아픈 부위 운동 — 적용 단계에서 줄 id 를 얻는다(먼저 오늘 루틴을 고정한 뒤). */
export async function todayPainRows(): Promise<PainRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const pain = await getPainAreas();
  if (pain.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("daily_plan")
    .select("id, exercise_id, focus, position")
    .eq("user_id", user.id)
    .eq("for_date", seoulYmd())
    .order("position", { ascending: true });
  return ((data ?? []) as { id: string; exercise_id: string; focus: string }[])
    .map((r) => ({ rowId: r.id, exerciseId: r.exercise_id, focus: r.focus, part: primaryBodyPart(r.exercise_id) }))
    .filter((r) => pain.includes(r.part));
}
