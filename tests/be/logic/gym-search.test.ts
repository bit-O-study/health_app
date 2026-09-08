import { describe, expect, it } from "vitest";

import {
  defaultGymEquipment,
  gymKey,
  manualGymCandidate,
  mergeGymCandidates,
  type RegisteredGym,
} from "@/features/gym/gym-search";
import { DEFAULT_KOREAN_GYM_EQUIPMENT } from "@/features/gym/gym-equipment-catalog";
import type { GymPlace } from "@/features/gym/gym-places";

function place(
  name: string,
  roadAddress = "",
  address = "",
): GymPlace {
  return { name, address, roadAddress, category: "헬스장" };
}

function registered(
  id: string,
  name: string,
  address: string | null,
  equipmentIds: string[] = [],
): RegisteredGym {
  return { id, name, address, equipmentIds };
}

describe("gymKey", () => {
  it("대소문자·앞뒤·중복 공백을 무시한다", () => {
    expect(gymKey("  Spo Any  역삼점 ", "서울  강남구 1")).toBe(
      gymKey("spo any 역삼점", " 서울 강남구 1 "),
    );
  });

  it("주소가 없으면 빈 칸으로 둔다(이름만 다른 곳과 안 섞이게)", () => {
    expect(gymKey("헬스", null)).toBe("헬스|");
    expect(gymKey("헬스", undefined)).toBe("헬스|");
  });
});

describe("mergeGymCandidates", () => {
  it("등록된 헬스장이 먼저, 지도 결과가 뒤에 온다", () => {
    const out = mergeGymCandidates(
      [registered("g1", "등록헬스", "서울 1", ["barbell"])],
      [place("지도헬스", "서울 2")],
    );
    expect(out.map((c) => c.name)).toEqual(["등록헬스", "지도헬스"]);
    expect(out[0].gymId).toBe("g1");
    expect(out[0].equipmentIds).toEqual(["barbell"]);
    // 지도 결과는 기구 정보가 없다 → 고르면 기본 보유기구로 시작한다.
    expect(out[1].gymId).toBeNull();
    expect(out[1].equipmentIds).toEqual([]);
  });

  it("이름·주소가 같은 지도 결과는 등록된 쪽만 남긴다", () => {
    const out = mergeGymCandidates(
      [registered("g1", "스포애니 역삼점", "서울 테헤란로 1", ["barbell"])],
      [place("스포애니 역삼점", "서울 테헤란로 1")],
    );
    expect(out).toHaveLength(1);
    expect(out[0].gymId).toBe("g1");
  });

  it("주소 없이 등록된 헬스장은 이름만 같아도 지도 결과를 흡수한다", () => {
    // 주소를 안 넣은 회원과 지도에서 고른 회원이 갈라지면 합집합이 둘로 쪼개진다.
    const out = mergeGymCandidates(
      [registered("g1", "동네헬스", null, ["dumbbell"])],
      [place("동네헬스", "서울 어딘가 3")],
    );
    expect(out).toHaveLength(1);
    expect(out[0].gymId).toBe("g1");
  });

  it("같은 이름이라도 주소가 다르면 별개 지점으로 둘 다 보여준다", () => {
    const out = mergeGymCandidates(
      [registered("g1", "스포애니", "서울 강남", [])],
      [place("스포애니", "서울 노원")],
    );
    expect(out.map((c) => c.address)).toEqual(["서울 강남", "서울 노원"]);
  });

  it("지도 주소는 도로명을 우선 쓴다", () => {
    const out = mergeGymCandidates([], [place("헬스", "도로명 1", "지번 1")]);
    expect(out[0].address).toBe("도로명 1");
  });

  it("도로명이 없으면 지번 주소를 쓴다", () => {
    const out = mergeGymCandidates([], [place("헬스", "", "지번 1")]);
    expect(out[0].address).toBe("지번 1");
  });

  it("DB 안에서 중복된 행도 한 줄로 접는다", () => {
    const out = mergeGymCandidates(
      [
        registered("g1", "중복헬스", "서울 1", ["barbell"]),
        registered("g2", "중복헬스", " 서울 1 ", ["dumbbell"]),
      ],
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].gymId).toBe("g1");
  });

  it("key 는 목록 렌더 key 로 쓸 수 있게 유일하다", () => {
    const out = mergeGymCandidates(
      [registered("g1", "A", "1")],
      [place("B", "2"), place("C", "3")],
    );
    expect(new Set(out.map((c) => c.key)).size).toBe(out.length);
  });
});

describe("defaultGymEquipment", () => {
  it("회원 합집합이 있으면 그걸 기본값으로 쓴다", () => {
    expect(defaultGymEquipment(["barbell", "dumbbell"])).toEqual([
      "barbell",
      "dumbbell",
    ]);
  });

  it("정보가 없으면 평균 한국 헬스장 기본 보유기구", () => {
    const fallback = [...DEFAULT_KOREAN_GYM_EQUIPMENT];
    expect(defaultGymEquipment([])).toEqual(fallback);
    expect(defaultGymEquipment(null)).toEqual(fallback);
    expect(defaultGymEquipment(undefined)).toEqual(fallback);
  });

  it("합집합에 중복이 있어도 한 번만", () => {
    expect(defaultGymEquipment(["barbell", "barbell"])).toEqual(["barbell"]);
  });

  it("돌려준 배열을 고쳐도 기본값 상수는 안 바뀐다", () => {
    const first = defaultGymEquipment([]);
    first.push("__junk__");
    expect(defaultGymEquipment([])).not.toContain("__junk__");
  });
});

describe("manualGymCandidate", () => {
  it("직접 입력은 등록 id 도 기구 정보도 없다", () => {
    const c = manualGymCandidate("  손입력 헬스 ", "  서울 1  ");
    expect(c.gymId).toBeNull();
    expect(c.name).toBe("손입력 헬스");
    expect(c.address).toBe("서울 1");
    expect(c.equipmentIds).toEqual([]);
    // 정보가 없으니 기본 보유기구로 시작한다.
    expect(defaultGymEquipment(c.equipmentIds)).toEqual([
      ...DEFAULT_KOREAN_GYM_EQUIPMENT,
    ]);
  });
});
