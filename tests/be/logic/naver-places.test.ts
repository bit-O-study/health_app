import { describe, expect, it } from "vitest";

import { parseNaverPlaces, placeAddress, stripHtml } from "@/features/gym/naver-places";

describe("네이버 지역검색 파싱", () => {
  it("title의 <b> 태그·엔티티 제거", () => {
    expect(stripHtml("스포애니 <b>강남</b>점")).toBe("스포애니 강남점");
    expect(stripHtml("바디 &amp; 핏")).toBe("바디 & 핏");
  });

  it("items 배열을 GymPlace로 매핑", () => {
    const json = {
      items: [
        {
          title: "<b>스포애니</b> 역삼점",
          category: "스포츠,오락>헬스장",
          address: "서울특별시 강남구 역삼동 123",
          roadAddress: "서울특별시 강남구 테헤란로 1",
          mapx: "1270361",
          mapy: "375013",
        },
        { title: "무제목없음", address: "", roadAddress: "" },
      ],
    };
    const places = parseNaverPlaces(json);
    expect(places.length).toBe(2);
    expect(places[0].name).toBe("스포애니 역삼점");
    expect(places[0].category).toContain("헬스장");
    expect(placeAddress(places[0])).toBe("서울특별시 강남구 테헤란로 1"); // 도로명 우선
  });

  it("도로명 없으면 지번 주소 사용", () => {
    const p = parseNaverPlaces({ items: [{ title: "헬스", address: "지번주소", roadAddress: "" }] })[0];
    expect(placeAddress(p)).toBe("지번주소");
  });

  it("형식이 아니면 빈 배열", () => {
    expect(parseNaverPlaces(null)).toEqual([]);
    expect(parseNaverPlaces({})).toEqual([]);
    expect(parseNaverPlaces({ items: "x" })).toEqual([]);
  });
});
