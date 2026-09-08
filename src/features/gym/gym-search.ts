/**
 * 헬스장 검색 결과 합치기 — 순수 모듈(테스트 가능).
 *
 * 검색은 두 곳을 동시에 본다.
 *  1) 우리 DB(`gyms`) — 이미 회원이 있는 헬스장. `equipmentIds` 는 그 회원들의 **합집합**이다.
 *  2) 카카오 로컬 장소검색 — 아직 우리 회원이 아무도 없는 실제 헬스장.
 *
 * 같은 헬스장이 두 곳에서 다 나오면 **등록된 쪽만** 남긴다. 지도 결과를 고르면 기구
 * 정보를 못 물려받아서, 회원이 있는데도 기본값으로 시작하게 된다.
 */

import { DEFAULT_KOREAN_GYM_EQUIPMENT } from "@/features/gym/gym-equipment-catalog";
import { placeAddress, type GymPlace } from "@/features/gym/gym-places";

/** DB 에 이미 있는 헬스장(회원 합집합 포함). */
export type RegisteredGym = {
  id: string;
  name: string;
  address: string | null;
  /** 이 헬스장 회원들이 등록한 기구의 합집합. 회원이 없으면 빈 배열. */
  equipmentIds: string[];
};

/** 검색 결과 한 줄. 등록된 헬스장이면 gymId 가 있고 기구 합집합을 들고 온다. */
export type GymCandidate = {
  /** 목록 key 겸 중복 판정용 정규화 키. */
  key: string;
  /** 이미 등록된 헬스장이면 그 id, 지도에서만 찾은 곳이면 null. */
  gymId: string | null;
  name: string;
  address: string;
  /** 등록된 헬스장의 회원 합집합. 지도 결과면 빈 배열. */
  equipmentIds: string[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** 이름+주소 정규화 키. 같은 지점을 두 줄로 보여주지 않기 위한 것. */
export function gymKey(name: string, address: string | null | undefined): string {
  return `${norm(name)}|${norm(address)}`;
}

/**
 * DB 결과 + 지도 결과를 한 목록으로. 등록된 헬스장이 항상 위에 온다.
 *
 * 지도 결과는 이름+주소가 같은 등록 헬스장이 있으면 버린다. 주소가 비어 있는(직접
 * 입력으로 만들어진) 등록 헬스장은 **이름만 같아도** 같은 곳으로 본다 — 주소를 안 넣은
 * 회원과 지도에서 고른 회원이 갈라지면 합집합이 두 쪽으로 쪼개진다.
 */
export function mergeGymCandidates(
  registered: readonly RegisteredGym[],
  places: readonly GymPlace[],
): GymCandidate[] {
  const out: GymCandidate[] = [];
  const seen = new Set<string>();
  /** 주소 없이 등록된 헬스장의 이름 — 지도 결과와 이름만으로 맞춘다. */
  const namesWithoutAddress = new Set<string>();

  for (const gym of registered) {
    const key = gymKey(gym.name, gym.address);
    if (seen.has(key)) continue;
    seen.add(key);
    if (norm(gym.address).length === 0) namesWithoutAddress.add(norm(gym.name));
    out.push({
      key,
      gymId: gym.id,
      name: gym.name,
      address: gym.address ?? "",
      equipmentIds: gym.equipmentIds,
    });
  }

  for (const place of places) {
    const address = placeAddress(place);
    const key = gymKey(place.name, address);
    if (seen.has(key)) continue;
    if (namesWithoutAddress.has(norm(place.name))) continue;
    seen.add(key);
    out.push({
      key,
      gymId: null,
      name: place.name,
      address,
      equipmentIds: [],
    });
  }

  return out;
}

/**
 * 고른 헬스장의 기구 기본값.
 * 회원 합집합이 있으면 그걸 쓰고, 아무 정보도 없으면 평균 한국 헬스장 기본 보유기구.
 */
export function defaultGymEquipment(
  equipmentIds: readonly string[] | null | undefined,
): string[] {
  const union = (equipmentIds ?? []).filter((id) => id.length > 0);
  return union.length > 0
    ? Array.from(new Set(union))
    : [...DEFAULT_KOREAN_GYM_EQUIPMENT];
}

/** 직접 입력으로 만든 후보(검색에 안 나오는 헬스장). */
export function manualGymCandidate(name: string, address: string): GymCandidate {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  return {
    key: gymKey(trimmedName, trimmedAddress),
    gymId: null,
    name: trimmedName,
    address: trimmedAddress,
    equipmentIds: [],
  };
}
