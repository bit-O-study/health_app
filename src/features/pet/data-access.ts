import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  petLevel,
  POINTS_PER_WORKOUT,
  type PetLevel,
} from "@/features/pet/level";

export type PetView = {
  name: string;
  points: number;
  owned: string[];
  equipped: Record<string, string>;
  totalWorkouts: number;
  level: PetLevel;
};

type PetRow = {
  name: string | null;
  points: number | null;
  synced_workouts: number | null;
  owned: unknown;
  equipped: unknown;
};

/**
 * 내 펫 상태 + 진행. 총 완료 운동 수를 세어 레벨을 계산하고, 아직 포인트로 환산되지
 * 않은 새 운동만큼 포인트를 '읽는 시점에' 지급한다(중복 방지: synced_workouts).
 */
export async function getPet(): Promise<PetView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const [{ count: exC }, { count: condC }, { data: petRow }] = await Promise.all([
    supabase
      .from("exercise_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done"),
    supabase
      .from("pets")
      .select("name, points, synced_workouts, owned, equipped")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const totalWorkouts = (exC ?? 0) + (condC ?? 0);
  const row = petRow as PetRow | null;

  const name = row?.name ?? "";
  let points = row?.points ?? 0;
  let synced = row?.synced_workouts ?? 0;
  const owned = Array.isArray(row?.owned) ? (row!.owned as string[]) : [];
  const equipped =
    row?.equipped && typeof row.equipped === "object"
      ? (row.equipped as Record<string, string>)
      : {};

  // 신규이거나 새 운동이 생겼으면 포인트 지급 + row 반영.
  if (!row || totalWorkouts > synced) {
    points += Math.max(0, totalWorkouts - synced) * POINTS_PER_WORKOUT;
    synced = totalWorkouts;
    await supabase.from("pets").upsert(
      {
        user_id: user.id,
        name,
        points,
        synced_workouts: synced,
        owned,
        equipped,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return { name, points, owned, equipped, totalWorkouts, level: petLevel(totalWorkouts) };
}
