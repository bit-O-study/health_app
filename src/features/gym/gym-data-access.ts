import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { ALL_GYM_EQUIPMENT_IDS } from "@/features/gym/gym-equipment-catalog";

export type Gym = {
  id: string;
  name: string;
  address: string | null;
  equipmentIds: string[];
};

type GymRow = {
  id: string;
  name: string;
  address: string | null;
  equipment_ids: string[] | null;
};

function rowToGym(r: GymRow): Gym {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    equipmentIds: (r.equipment_ids ?? []).filter((id) =>
      ALL_GYM_EQUIPMENT_IDS.has(id),
    ),
  };
}

/**
 * 현재 사용자의 헬스장 (profile.gym_id). 미설정이면 null.
 * React.cache — 한 요청 내 1회.
 */
export const getCurrentGym = cache(async (): Promise<Gym | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const gymId = (profile as { gym_id: string | null } | null)?.gym_id ?? null;
  if (!gymId) return null;
  const { data } = await supabase
    .from("gyms")
    .select("id, name, address, equipment_ids")
    .eq("id", gymId)
    .maybeSingle();
  if (!data) return null;
  return rowToGym(data as GymRow);
});
