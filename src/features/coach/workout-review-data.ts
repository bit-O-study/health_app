import "server-only";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { seoulYmd } from "@/features/routine/data";
import { shiftYmd, type ProgressRecord } from "@/features/routine/progress";
import { parseSetDetails } from "@/features/routine/set-details";
import { buildCoachReview, resolveReviewTargets, type CoachReview } from "./workout-review";

export async function getCoachReview(): Promise<{ review: CoachReview | null; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { review: null, error: "로그인이 필요해요." };
    const today = seoulYmd();
    const db = await createSupabaseServerClient();
    const [result, profile, routine, daily] = await Promise.all([
      db.from("exercise_completions").select("exercise_id,equipment,sets,reps,weight_kg,set_details,for_date").eq("user_id", user.id).eq("status", "done").gte("for_date", shiftYmd(today, -27)).lte("for_date", today).order("for_date", { ascending: false }).limit(1001),
      getUserProfile(),
      db.from("routine_exercises").select("exercise_id,equipment,reps,set_details").eq("user_id", user.id).limit(1001),
      db.from("daily_plan").select("exercise_id,equipment,reps,set_details").eq("user_id", user.id).eq("for_date", today).limit(101),
    ]);
    if (result.error || !result.data || routine.error || daily.error || !routine.data || !daily.data) return { review: null, error: "운동 기록을 불러오지 못했어요. 새로고침 후 다시 확인해 주세요." };
    if (result.data.length > 1000 || routine.data.length > 1000 || daily.data.length > 100) return { review: null, error: "기록이 많아 요약을 표시하지 못했어요. 주간 리포트로 점검을 요청해 주세요." };
    const records: ProgressRecord[] = result.data.map(row => ({ exerciseId: row.exercise_id, equipment: row.equipment, sets: row.sets, reps: row.reps, weightKg: row.weight_kg === null ? null : Number(row.weight_kg), setDetails: parseSetDetails(row.set_details), forDate: row.for_date, status: "done" }));
    return { review: buildCoachReview(records, today, profile?.experience ?? null, profile?.weightSteps, resolveReviewTargets(routine.data, daily.data)), error: null };
  } catch { return { review: null, error: "운동 점검을 불러오지 못했어요. 잠시 후 다시 확인해 주세요." }; }
}