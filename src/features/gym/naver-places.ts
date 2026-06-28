/** 네이버 지역(local) 검색 결과 파싱 — 순수 모듈(테스트 가능). */

export type GymPlace = {
  /** 상호명(HTML 태그 제거). */
  name: string;
  /** 지번 주소. */
  address: string;
  /** 도로명 주소(있으면 우선 사용). */
  roadAddress: string;
  /** 업종 카테고리. */
  category: string;
};

/** <b>태그·HTML 엔티티 제거. */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** 네이버 local.json 응답 → GymPlace[]. 형식이 아니면 빈 배열. */
export function parseNaverPlaces(json: unknown): GymPlace[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const it = raw as Record<string, unknown>;
      return {
        name: stripHtml(String(it.title ?? "")),
        address: String(it.address ?? "").trim(),
        roadAddress: String(it.roadAddress ?? "").trim(),
        category: String(it.category ?? "").trim(),
      };
    })
    .filter((p) => p.name.length > 0);
}

/** 표시·저장용 주소(도로명 우선). */
export function placeAddress(p: GymPlace): string {
  return p.roadAddress || p.address;
}
