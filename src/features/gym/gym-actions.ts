"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { ALL_GYM_EQUIPMENT_IDS } from "@/features/gym/gym-equipment-catalog";

export type UpsertGymInput = {
  /** 수정이면 기존 id, 새로 등록이면 null */
  id: string | null;
  name: string;
  address: string;
  equipmentIds: string[];
};

/**
 * 헬스장 신규 등록 또는 수정. 등록 시 profile.gym_id 도 자동 연결.
 * 수정은 본인이 등록자인 경우에만 (RLS).
 */
export async function upsertGymAction(
  input: UpsertGymInput,
): Promise<{ ok: true; gymId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  const address = input.address.trim();
  if (name.length === 0) {
    return { ok: false, error: "헬스장 이름을 입력해주세요." };
  }
  if (name.length > 100) {
    return { ok: false, error: "헬스장 이름이 너무 깁니다." };
  }
  if (address.length > 200) {
    return { ok: false, error: "주소가 너무 깁니다." };
  }

  // 알 수 없는 id 제거 + 중복 제거
  const equipmentIds = Array.from(
    new Set(input.equipmentIds.filter((id) => ALL_GYM_EQUIPMENT_IDS.has(id))),
  );

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();

  let gymId = input.id;
  const nowIso = new Date().toISOString();

  if (gymId === null) {
    // 신규
    const { data, error } = await supabase
      .from("gyms")
      .insert({
        name,
        address: address || null,
        equipment_ids: equipmentIds,
        created_by: user.id,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    gymId = (data as { id: string }).id;
  } else {
    // 수정 — RLS 가 created_by = auth.uid() 검증
    const { error } = await supabase
      .from("gyms")
      .update({
        name,
        address: address || null,
        equipment_ids: equipmentIds,
        updated_at: nowIso,
      })
      .eq("id", gymId);
    if (error) return { ok: false, error: error.message };
  }

  // 사용자 프로필에 연결
  const { error: linkErr } = await supabase
    .from("profiles")
    .update({ gym_id: gymId, updated_at: nowIso })
    .eq("user_id", user.id);
  if (linkErr) return { ok: false, error: linkErr.message };

  revalidatePath("/settings");
  revalidatePath("/settings/gym");
  return { ok: true, gymId };
}
