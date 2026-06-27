/**
 * 음식 칼로리 카탈로그 — 한국에서 흔한 음식의 1인분(또는 표기 단위) 기준 영양값.
 * 검색해서 식단에 추가할 때 기본값으로 채운다. 사용자가 추가 후 수정 가능.
 *
 * 값은 일반적인 1회 제공량 근사치(식약처/관용값 기반). 정밀 영양분석용이 아니라
 * 빠른 기록·대략적인 칼로리 관리용.
 */

export type FoodCategory =
  | "밥·면"
  | "국·찌개"
  | "고기·계란"
  | "생선·해산물"
  | "채소·반찬"
  | "과일"
  | "유제품"
  | "빵·간식"
  | "음료"
  | "단백질·보충";

export type FoodItem = {
  id: string;
  name: string;
  category: FoodCategory;
  /** 1회 제공량 표기 (예: "1공기", "200g", "1개") */
  amount: string;
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

export const FOOD_ITEMS: FoodItem[] = [
  // ── 밥·면
  { id: "rice", name: "흰쌀밥", category: "밥·면", amount: "1공기(210g)", kcal: 310, protein: 6, carbs: 69, fat: 1 },
  { id: "brown-rice", name: "현미밥", category: "밥·면", amount: "1공기(210g)", kcal: 300, protein: 7, carbs: 64, fat: 2 },
  { id: "kimbap", name: "김밥", category: "밥·면", amount: "1줄", kcal: 480, protein: 11, carbs: 78, fat: 12 },
  { id: "bibimbap", name: "비빔밥", category: "밥·면", amount: "1그릇", kcal: 560, protein: 17, carbs: 90, fat: 13 },
  { id: "fried-rice", name: "볶음밥", category: "밥·면", amount: "1그릇", kcal: 600, protein: 14, carbs: 85, fat: 20 },
  { id: "ramen", name: "라면", category: "밥·면", amount: "1봉지", kcal: 500, protein: 10, carbs: 79, fat: 16 },
  { id: "jjajang", name: "짜장면", category: "밥·면", amount: "1그릇", kcal: 700, protein: 15, carbs: 110, fat: 20 },
  { id: "jjamppong", name: "짬뽕", category: "밥·면", amount: "1그릇", kcal: 540, protein: 22, carbs: 80, fat: 12 },
  { id: "naengmyeon", name: "냉면", category: "밥·면", amount: "1그릇", kcal: 540, protein: 16, carbs: 100, fat: 7 },
  { id: "udon", name: "우동", category: "밥·면", amount: "1그릇", kcal: 430, protein: 12, carbs: 78, fat: 7 },
  { id: "pasta", name: "파스타", category: "밥·면", amount: "1접시", kcal: 600, protein: 18, carbs: 80, fat: 22 },
  { id: "tteokbokki", name: "떡볶이", category: "밥·면", amount: "1인분", kcal: 480, protein: 9, carbs: 95, fat: 8 },
  { id: "sandwich", name: "샌드위치", category: "밥·면", amount: "1개", kcal: 350, protein: 14, carbs: 40, fat: 14 },
  { id: "salad", name: "샐러드", category: "채소·반찬", amount: "1접시", kcal: 150, protein: 5, carbs: 12, fat: 9 },

  // ── 국·찌개
  { id: "kimchi-stew", name: "김치찌개", category: "국·찌개", amount: "1뚝배기", kcal: 280, protein: 18, carbs: 12, fat: 16 },
  { id: "doenjang-stew", name: "된장찌개", category: "국·찌개", amount: "1뚝배기", kcal: 200, protein: 14, carbs: 14, fat: 9 },
  { id: "sundubu", name: "순두부찌개", category: "국·찌개", amount: "1뚝배기", kcal: 260, protein: 17, carbs: 12, fat: 15 },
  { id: "seaweed-soup", name: "미역국", category: "국·찌개", amount: "1그릇", kcal: 120, protein: 9, carbs: 6, fat: 6 },
  { id: "galbitang", name: "갈비탕", category: "국·찌개", amount: "1그릇", kcal: 430, protein: 32, carbs: 14, fat: 26 },

  // ── 고기·계란
  { id: "chicken-breast", name: "닭가슴살", category: "고기·계란", amount: "100g", kcal: 110, protein: 23, carbs: 0, fat: 2 },
  { id: "chicken-thigh", name: "닭다리살", category: "고기·계란", amount: "100g", kcal: 180, protein: 19, carbs: 0, fat: 11 },
  { id: "fried-chicken", name: "후라이드 치킨", category: "고기·계란", amount: "3조각", kcal: 480, protein: 30, carbs: 22, fat: 30 },
  { id: "pork-belly", name: "삼겹살", category: "고기·계란", amount: "100g(구운)", kcal: 330, protein: 17, carbs: 0, fat: 29 },
  { id: "pork-jowl", name: "목살", category: "고기·계란", amount: "100g", kcal: 220, protein: 20, carbs: 0, fat: 15 },
  { id: "beef-bulgogi", name: "소불고기", category: "고기·계란", amount: "100g", kcal: 210, protein: 18, carbs: 6, fat: 12 },
  { id: "egg-boiled", name: "삶은 계란", category: "고기·계란", amount: "1개", kcal: 78, protein: 6, carbs: 1, fat: 5 },
  { id: "egg-fried", name: "계란후라이", category: "고기·계란", amount: "1개", kcal: 110, protein: 6, carbs: 1, fat: 9 },
  { id: "tofu", name: "두부", category: "고기·계란", amount: "1/2모(150g)", kcal: 120, protein: 13, carbs: 4, fat: 7 },

  // ── 생선·해산물
  { id: "grilled-mackerel", name: "고등어구이", category: "생선·해산물", amount: "1토막", kcal: 250, protein: 21, carbs: 0, fat: 18 },
  { id: "salmon", name: "연어", category: "생선·해산물", amount: "100g", kcal: 200, protein: 20, carbs: 0, fat: 13 },
  { id: "tuna-can", name: "참치캔", category: "생선·해산물", amount: "1캔(100g)", kcal: 190, protein: 26, carbs: 0, fat: 10 },
  { id: "shrimp", name: "새우", category: "생선·해산물", amount: "100g", kcal: 99, protein: 24, carbs: 0, fat: 0 },

  // ── 채소·반찬
  { id: "kimchi", name: "김치", category: "채소·반찬", amount: "1접시", kcal: 30, protein: 2, carbs: 5, fat: 1 },
  { id: "namul", name: "나물무침", category: "채소·반찬", amount: "1접시", kcal: 70, protein: 3, carbs: 6, fat: 4 },
  { id: "sweet-potato", name: "고구마", category: "채소·반찬", amount: "1개(150g)", kcal: 190, protein: 2, carbs: 45, fat: 0 },
  { id: "corn", name: "옥수수", category: "채소·반찬", amount: "1개", kcal: 150, protein: 5, carbs: 32, fat: 2 },

  // ── 과일
  { id: "banana", name: "바나나", category: "과일", amount: "1개", kcal: 93, protein: 1, carbs: 24, fat: 0 },
  { id: "apple", name: "사과", category: "과일", amount: "1개", kcal: 95, protein: 0, carbs: 25, fat: 0 },
  { id: "orange", name: "오렌지", category: "과일", amount: "1개", kcal: 62, protein: 1, carbs: 15, fat: 0 },
  { id: "grape", name: "포도", category: "과일", amount: "1송이(100g)", kcal: 60, protein: 1, carbs: 16, fat: 0 },
  { id: "blueberry", name: "블루베리", category: "과일", amount: "100g", kcal: 57, protein: 1, carbs: 14, fat: 0 },

  // ── 유제품
  { id: "milk", name: "우유", category: "유제품", amount: "1컵(200ml)", kcal: 130, protein: 7, carbs: 10, fat: 7 },
  { id: "greek-yogurt", name: "그릭요거트", category: "유제품", amount: "100g", kcal: 97, protein: 9, carbs: 4, fat: 5 },
  { id: "cheese", name: "치즈", category: "유제품", amount: "1장(20g)", kcal: 70, protein: 4, carbs: 1, fat: 5 },

  // ── 빵·간식
  { id: "bread", name: "식빵", category: "빵·간식", amount: "1쪽", kcal: 80, protein: 3, carbs: 14, fat: 1 },
  { id: "croissant", name: "크루아상", category: "빵·간식", amount: "1개", kcal: 270, protein: 5, carbs: 26, fat: 16 },
  { id: "chocolate", name: "초콜릿", category: "빵·간식", amount: "1줄(30g)", kcal: 160, protein: 2, carbs: 17, fat: 9 },
  { id: "potato-chips", name: "감자칩", category: "빵·간식", amount: "1봉(60g)", kcal: 330, protein: 4, carbs: 33, fat: 21 },
  { id: "almond", name: "아몬드", category: "빵·간식", amount: "1줌(28g)", kcal: 164, protein: 6, carbs: 6, fat: 14 },
  { id: "rice-cake", name: "떡", category: "빵·간식", amount: "1개", kcal: 130, protein: 3, carbs: 28, fat: 0 },

  // ── 음료
  { id: "americano", name: "아메리카노", category: "음료", amount: "1잔", kcal: 10, protein: 0, carbs: 2, fat: 0 },
  { id: "latte", name: "카페라떼", category: "음료", amount: "1잔", kcal: 180, protein: 9, carbs: 16, fat: 9 },
  { id: "cola", name: "콜라", category: "음료", amount: "1캔(355ml)", kcal: 150, protein: 0, carbs: 39, fat: 0 },
  { id: "beer", name: "맥주", category: "음료", amount: "1캔(355ml)", kcal: 150, protein: 1, carbs: 13, fat: 0 },
  { id: "soju", name: "소주", category: "음료", amount: "1병", kcal: 408, protein: 0, carbs: 0, fat: 0 },
  { id: "orange-juice", name: "오렌지주스", category: "음료", amount: "1잔(200ml)", kcal: 90, protein: 1, carbs: 21, fat: 0 },

  // ── 단백질·보충
  { id: "protein-shake", name: "단백질 보충제", category: "단백질·보충", amount: "1스쿱", kcal: 120, protein: 24, carbs: 3, fat: 1 },
  { id: "protein-bar", name: "단백질 바", category: "단백질·보충", amount: "1개", kcal: 200, protein: 20, carbs: 20, fat: 7 },
];

const BY_ID: Record<string, FoodItem> = Object.fromEntries(
  FOOD_ITEMS.map((f) => [f.id, f]),
);

export function getFoodItem(id: string): FoodItem | undefined {
  return BY_ID[id];
}

/** 이름·카테고리로 검색(공백 무시, 부분일치). 빈 검색어면 전체. */
export function searchFoods(query: string): FoodItem[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return FOOD_ITEMS;
  return FOOD_ITEMS.filter(
    (f) =>
      f.name.toLowerCase().replace(/\s+/g, "").includes(q) ||
      f.category.toLowerCase().replace(/\s+/g, "").includes(q),
  );
}
