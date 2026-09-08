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
import {
  mergeGymCandidates,
  type GymCandidate,
  type RegisteredGym,
} from "@/features/gym/gym-search";

/**
 * 카카오 로컬(키워드) 장소검색으로 실제 헬스장 찾기.
 * 무료(developers.kakao.com, REST API 키). 키(KAKAO_REST_API_KEY)가 없으면 빈 배열을
 * 돌려줘 검색은 우리 DB 결과만으로 동작한다(그래도 직접 입력은 항상 열려 있다).
 */
async function searchGymPlaces(query: string): Promise<GymPlace[]> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return [];
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
      query,
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

/** 이름·주소로 우리 DB(gyms) 검색. equipment_ids 는 그 헬스장 회원들의 합집합이다. */
async function searchRegisteredGyms(query: string): Promise<RegisteredGym[]> {
  const supabase = await createSupabaseServerClient();
  // ilike 로 부분 일치 검색 — 이름 또는 주소
  const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
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
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    equipmentIds: (r.equipment_ids ?? []).filter((id) =>
      ALL_GYM_EQUIPMENT_IDS.has(id),
    ),
  }));
}

/**
 * 헬스장 검색 — 우리 DB 와 지도를 **한 번에** 훑어 한 목록으로 돌려준다.
 * 화면은 이 결과에서 하나를 고르기만 하면 이름·주소·기구 기본값이 전부 정해진다.
 * (두 번 왕복하면 목록이 따로 뜨고, 지도 결과를 골랐을 때 회원 합집합을 놓친다.)
 */
export async function searchGymCandidatesAction(
  query: string,
): Promise<GymCandidate[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [registered, places] = await Promise.all([
    searchRegisteredGyms(q),
    searchGymPlaces(q),
  ]);
  return mergeGymCandidates(registered, places);
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
