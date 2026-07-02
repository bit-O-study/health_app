import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import {
  BODY_PART_LABEL,
  primaryBodyPart,
  type BodyPart,
} from "@/features/routine/exercise-catalog";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 최근 30일 운동 요약(부위별 세션 수·운동일수)을 사람이 읽는 한국어 텍스트로. */
export async function buildWorkoutSummary(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "운동 기록 없음";
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from = addDaysYmd(today, -30);

  const { data } = await supabase
    .from("exercise_completions")
    .select("exercise_id, for_date")
    .eq("user_id", user.id)
    .eq("status", "done")
    .gte("for_date", from)
    .lte("for_date", today);

  const rows = (data ?? []) as { exercise_id: string | null; for_date: string }[];
  if (rows.length === 0) return "최근 30일 운동 기록 없음";

  const byPart = new Map<BodyPart, number>();
  const days = new Set<string>();
  for (const r of rows) {
    days.add(r.for_date);
    if (!r.exercise_id) continue;
    const part = primaryBodyPart(r.exercise_id);
    byPart.set(part, (byPart.get(part) ?? 0) + 1);
  }
  const partStr = (["chest", "back", "shoulder", "arm", "lower", "core"] as BodyPart[])
    .map((p) => `${BODY_PART_LABEL[p]} ${byPart.get(p) ?? 0}회`)
    .join(", ");

  return [
    `최근 30일: 총 ${rows.length}세션, 운동한 날 ${days.size}일.`,
    `부위별 세션 수 — ${partStr}.`,
  ].join(" ");
}

/** 최근 14일 식단 요약(하루 평균 kcal·끼니 분포·자주 먹은 음식). */
export async function buildDietSummary(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "식단 기록 없음";
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from = addDaysYmd(today, -14);

  const { data } = await supabase
    .from("food_logs")
    .select("for_date, kcal, meal, name")
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", today);

  const rows = (data ?? []) as {
    for_date: string;
    kcal: number | string;
    meal: string;
    name: string;
  }[];
  if (rows.length === 0) return "최근 14일 식단 기록 없음";

  const byDay = new Map<string, number>();
  const byMeal = new Map<string, number>();
  const foodFreq = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.for_date, (byDay.get(r.for_date) ?? 0) + num(r.kcal));
    byMeal.set(r.meal, (byMeal.get(r.meal) ?? 0) + 1);
    if (r.name) foodFreq.set(r.name, (foodFreq.get(r.name) ?? 0) + 1);
  }
  const avg = Math.round(
    [...byDay.values()].reduce((s, v) => s + v, 0) / Math.max(1, byDay.size),
  );
  const mealLabel: Record<string, string> = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
    snack: "간식",
  };
  const mealStr = ["breakfast", "lunch", "dinner", "snack"]
    .map((m) => `${mealLabel[m]} ${byMeal.get(m) ?? 0}건`)
    .join(", ");
  const topFoods = [...foodFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n)
    .join(", ");

  return [
    `최근 14일: 기록한 날 ${byDay.size}일, 하루 평균 섭취 약 ${avg}kcal.`,
    `끼니 분포 — ${mealStr}.`,
    topFoods ? `자주 먹은 음식 — ${topFoods}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
