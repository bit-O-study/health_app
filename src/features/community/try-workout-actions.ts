"use server";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DAY_BLOCKS, resolveRoutine, routineDayOffset, seoulYmd, type FocusTone } from "@/features/routine/data";
import { getUserRoutine } from "@/features/routine/data-access";
import { getPlanForDayTones } from "@/features/routine/plan";
import { addExercisesTodayOnlyAction } from "@/features/routine/daily-plan-actions";
import { readWorkoutSnapshot } from "./workout-snapshot";
import { pickedForAdd, planTryItems, type TryItem } from "./try-workout";

/**
 * '오늘 이 운동 해보기'(커뮤니티 4-1).
 * 🔴 담을 운동은 **서버가 글의 스냅샷에서 다시 계산한다** — 앱은 번호만 보낸다(남의 글 내용을 앱이 바꿔 보내도 소용없게).
 * 🔴 오늘만(daily_plan) — 영구 루틴은 그대로(원칙 2). 세트·무게는 내 추천값(addExercisesTodayOnlyAction).
 */

/** 오늘 이미 하게 돼 있는 운동 id — 오늘만 변경(daily_plan) + 오늘 루틴(아직 안 바뀐 부위). */
async function todayExerciseIds(): Promise<Set<string>> {
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

async function loadItems(postId: string): Promise<TryItem[] | null> {
  if (!/^[a-f0-9-]{36}$/i.test(postId)) return null;
  const supabase = await createSupabaseServerClient();
  // 보기 권한은 RLS — 볼 수 없는 글(범위·숨김·차단)이면 없는 글과 같다.
  const { data } = await supabase.from("community_posts").select("workout_snapshot").eq("id", postId).maybeSingle();
  const snapshot = readWorkoutSnapshot((data as { workout_snapshot?: unknown } | null)?.workout_snapshot);
  if (!snapshot) return null;
  return planTryItems(snapshot, await todayExerciseIds());
}

export async function getTryWorkoutOptionsAction(
  postId: string,
): Promise<{ ok: true; items: TryItem[] } | { ok: false; error: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요합니다." };
  const items = await loadItems(postId);
  if (!items) return { ok: false, error: "운동 기록을 볼 수 없는 글이에요." };
  return { ok: true, items };
}

export async function tryWorkoutTodayAction(
  postId: string,
  picked: number[],
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요합니다." };
  const items = await loadItems(postId);
  if (!items) return { ok: false, error: "운동 기록을 볼 수 없는 글이에요." };
  const add = pickedForAdd(items, Array.isArray(picked) ? picked.filter((n) => Number.isInteger(n)) : []);
  if (add.length === 0) return { ok: false, error: "담을 운동을 골라 주세요." };
  const r = await addExercisesTodayOnlyAction(add);
  if (!r.ok) return r;
  return { ok: true, added: add.length };
}
