"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  ALL_GYM_EQUIPMENT_IDS,
  DEFAULT_KOREAN_GYM_EQUIPMENT,
} from "@/features/gym/gym-equipment-catalog";
import { parseKakaoPlaces, type GymPlace } from "@/features/gym/gym-places";

/**
 * 카카오 로컬(키워드) 장소검색으로 실제 헬스장 찾기 — 이름 자동완성용.
 * 무료(developers.kakao.com, REST API 키). 키(KAKAO_REST_API_KEY)가 없으면
 * 빈 배열을 돌려줘 앱은 그대로 수기 입력으로 동작한다.
 */
export async function searchGymPlacesAction(query: string): Promise<GymPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return [];
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
      q,
    )}&size=8`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseKakaoPlaces(await res.json());
  } catch {
    return [];
  }
}

export type GymSearchHit = {
  id: string;
  name: string;
  address: string | null;
  equipmentCount: number;
  equipmentIds: string[];
};

/** 이름·주소로 헬스장 검색 — 신규 등록 시 중복 방지용 typeahead */
export async function searchGymsAction(
  query: string,
): Promise<GymSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createSupabaseServerClient();
  // ilike 로 부분 일치 검색 — 이름 또는 주소
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;
  const { data } = await supabase
    .from("gyms")
    .select("id, name, address, equipment_ids")
    .or(`name.ilike.${pattern},address.ilike.${pattern}`)
    .limit(8);
  return ((data ?? []) as {
    id: string;
    name: string;
    address: string | null;
    equipment_ids: string[] | null;
  }[]).map((r) => {
    const equipmentIds = (r.equipment_ids ?? []).filter((id) =>
      ALL_GYM_EQUIPMENT_IDS.has(id),
    );
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      equipmentCount: equipmentIds.length,
      equipmentIds,
    };
  });
}

/**
 * 다른 사용자가 등록한 헬스장을 내 프로필에 연결.
 * gym 자체는 수정하지 않음 (RLS 가 등록자만 update 허용).
 */
export async function linkExistingGymAction(
  gymId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { data: gym } = await supabase
    .from("gyms")
    .select("equipment_ids")
    .eq("id", gymId)
    .maybeSingle();
  if (!gym) return { ok: false, error: "헬스장을 찾지 못했습니다." };
  const shared = ((gym as { equipment_ids: string[] | null }).equipment_ids ?? [])
    .filter((id) => ALL_GYM_EQUIPMENT_IDS.has(id));
  const equipmentIds =
    shared.length > 0 ? shared : [...DEFAULT_KOREAN_GYM_EQUIPMENT];
  const { error } = await supabase
    .from("profiles")
    .update({
      gym_id: gymId,
      gym_equipment_ids: equipmentIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/settings/gym");
  return { ok: true };
}

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
    // 같은 이름·주소로 이미 등록된 헬스장은 재사용한다. 카카오 장소를 고른 회원들이
    // 같은 지점을 중복 생성하면 합집합이 갈라지므로 정확히 일치하는 행만 합친다.
    const { data: sameName } = await supabase
      .from("gyms")
      .select("id, address")
      .ilike("name", name.replace(/[%_]/g, (m) => `\\${m}`))
      .limit(20);
    const existing = ((sameName ?? []) as { id: string; address: string | null }[])
      .find((gym) => (gym.address ?? "").trim() === address);
    if (existing) gymId = existing.id;
  }

  if (gymId === null) {
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
    // 공용 이름·주소는 등록자만 수정한다. 다른 회원은 자기 기구 보고만 저장한다.
    const { data: gym } = await supabase
      .from("gyms")
      .select("created_by")
      .eq("id", gymId)
      .maybeSingle();
    if (!gym) return { ok: false, error: "헬스장을 찾지 못했습니다." };
    if ((gym as { created_by: string | null }).created_by === user.id) {
      const { error } = await supabase
        .from("gyms")
        .update({ name, address: address || null, updated_at: nowIso })
        .eq("id", gymId);
      if (error) return { ok: false, error: error.message };
    }
  }

  // 사용자 프로필에 연결
  const { error: linkErr } = await supabase
    .from("profiles")
    .update({
      gym_id: gymId,
      gym_equipment_ids: equipmentIds,
      updated_at: nowIso,
    })
    .eq("user_id", user.id);
  if (linkErr) return { ok: false, error: linkErr.message };

  revalidatePath("/settings");
  revalidatePath("/settings/gym");
  return { ok: true, gymId };
}
