/** 카카오 로컬(키워드) 장소검색 결과 파싱 — 순수 모듈(테스트 가능). */

export type GymPlace = {
  /** 상호명. */
  name: string;
  /** 지번 주소. */
  address: string;
  /** 도로명 주소(있으면 우선 사용). */
  roadAddress: string;
  /** 업종 카테고리. */
  category: string;
};

/** 카카오 keyword.json 응답 → GymPlace[]. 형식이 아니면 빈 배열. */
export function parseKakaoPlaces(json: unknown): GymPlace[] {
  const docs = (json as { documents?: unknown })?.documents;
  if (!Array.isArray(docs)) return [];
  return docs
    .map((raw) => {
      const d = raw as Record<string, unknown>;
      return {
        name: String(d.place_name ?? "").trim(),
        address: String(d.address_name ?? "").trim(),
        roadAddress: String(d.road_address_name ?? "").trim(),
        category: String(d.category_name ?? "").trim(),
      };
    })
    .filter((p) => p.name.length > 0);
}

/** 표시·저장용 주소(도로명 우선). */
export function placeAddress(p: GymPlace): string {
  return p.roadAddress || p.address;
}
