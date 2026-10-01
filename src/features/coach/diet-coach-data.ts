import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { dailyTarget } from "@/features/diet/calorie-target";
import { dailyWaterTargetMl } from "@/features/diet/water";
import { isGoal, type Goal } from "@/features/profile/goal";
import { ageOf, isAgeGroup } from "@/features/profile/survey-extra";
import {
  goalKcal,
  summarizeToday,
  type DietTargets,
  type TodayIntake,
} from "@/features/coach/diet-coach";

export type DietContext = { goal: Goal | null; targets: DietTargets; today: TodayIntake };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * 오늘 식단 — 목표(규칙)와 오늘 먹은 양. AI 없이 계산해서 AI 트레이너 탭에 늘 보여 주고,
 * [오늘 식단 봐 줘]를 누르면 이 값 그대로 AI 에 보낸다. 실패하면 null.
 */
export async function loadDietContext(): Promise<DietContext | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createSupabaseServerClient();
    const today = seoulYmd();
    const [profile, food, water] = await Promise.all([
      supabase.from("profiles").select("gender, weight_kg, height_cm, goal, age_group").eq("user_id", user.id).maybeSingle(),
      supabase.from("food_logs").select("name, meal, kcal, protein_g").eq("user_id", user.id).eq("for_date", today),
      supabase.from("water_logs").select("ml").eq("user_id", user.id).eq("for_date", today).maybeSingle(),
    ]);
    const p = (profile.data ?? {}) as Record<string, unknown>;
    const gender = p.gender === "female" ? "female" : "male";
    const weightKg = n(p.weight_kg) || null;
    const goal = isGoal(p.goal) ? p.goal : null;
    const age = ageOf(isAgeGroup(p.age_group) ? p.age_group : null);
    const base = dailyTarget({ gender, weightKg, heightCm: n(p.height_cm) || null, age });
    const targets: DietTargets = {
      kcal: goalKcal(base, goal, gender),
      proteinG: base.protein,
      waterMl: dailyWaterTargetMl(weightKg),
    };
    const logs = ((food.data ?? []) as Record<string, unknown>[]).map((r) => ({
      name: String(r.name ?? ""),
      meal: String(r.meal ?? "snack"),
      kcal: n(r.kcal),
      proteinG: n(r.protein_g),
    }));
    return { goal, targets, today: summarizeToday(logs, n((water.data as { ml?: unknown } | null)?.ml)) };
  } catch {
    return null;
  }
}
