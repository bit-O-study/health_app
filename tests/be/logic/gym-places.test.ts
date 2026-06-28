import { describe, expect, it } from "vitest";

import { parseKakaoPlaces, placeAddress } from "@/features/gym/gym-places";

describe("카카오 장소검색 파싱", () => {
  it("documents 배열을 GymPlace로 매핑(도로명 우선)", () => {
    const json = {
      documents: [
        {
          place_name: "스포애니 역삼점",
          category_name: "스포츠,오락 > 스포츠시설 > 헬스장",
          address_name: "서울 강남구 역삼동 123",
          road_address_name: "서울 강남구 테헤란로 1",
          x: "127.03",
          y: "37.50",
        },
        { place_name: "", address_name: "", road_address_name: "" },
      ],
    };
    const places = parseKakaoPlaces(json);
    expect(places.length).toBe(1); // 이름 없는 항목 제외
    expect(places[0].name).toBe("스포애니 역삼점");
    expect(places[0].category).toContain("헬스장");
    expect(placeAddress(places[0])).toBe("서울 강남구 테헤란로 1");
  });

  it("도로명 없으면 지번 주소 사용", () => {
    const p = parseKakaoPlaces({
      documents: [{ place_name: "헬스", address_name: "지번주소", road_address_name: "" }],
    })[0];
    expect(placeAddress(p)).toBe("지번주소");
  });

  it("형식이 아니면 빈 배열", () => {
    expect(parseKakaoPlaces(null)).toEqual([]);
    expect(parseKakaoPlaces({})).toEqual([]);
    expect(parseKakaoPlaces({ documents: "x" })).toEqual([]);
  });
});
