import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DAY_BLOCKS, resolveRoutine, routineDayOffset, seoulYmd, type FocusTone } from "@/features/routine/data";
import { getUserRoutine } from "@/features/routine/data-access";
import { getPlanForDayTones } from "@/features/routine/plan";

/*
 * 커뮤니티 '오늘 이 운동 해보기'(4-1)와 AI 트레이너 탭(2026-09-30)이 같이 쓴다 —
 * 오늘 이미 할 운동을 또 담지 않기 위해. (예전엔 try-workout-actions.ts 안에 있었다.)
 */
/** 오늘 이미 하게 돼 있는 운동 id — 오늘만 변경(daily_plan) + 오늘 루틴(아직 안 바뀐 부위). */
export async function todayExerciseIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const { data: daily } = await supabase
    .from("daily_plan")
    .select("exercise_id, focus")
    .eq("user_id", user.id)
    .eq("for_date", today);
  const rows = (daily ?? []) as { exercise_id: string; focus: string }[];
  const ids = new Set(rows.map((r) => r.exercise_id));
  const overridden = new Set(rows.map((r) => r.focus));

  const routine = await getUserRoutine();
  if (!routine || routine.deferredDate === today) return ids;
  const { variant } = resolveRoutine(routine.splits, routine.variantId, routine.customWeek);
  const offset = routineDayOffset(routine.startDate, today);
  const planToday =
    routine.overrideDate === today && routine.overrideBlock !== null
      ? DAY_BLOCKS[routine.overrideBlock].day
      : variant.week[offset];
  const tones = (planToday.tones ?? [planToday.tone]).filter(
    (t): t is Exclude<FocusTone, "rest"> => t !== "rest" && !overridden.has(t),
  );
  for (const list of await getPlanForDayTones(offset, tones)) for (const p of list) ids.add(p.exerciseId);
  return ids;
}
