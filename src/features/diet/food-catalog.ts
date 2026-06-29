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

  // ── 밥·면 (추가)
  { id: "kimchi-fried-rice", name: "김치볶음밥", category: "밥·면", amount: "1그릇", kcal: 600, protein: 14, carbs: 80, fat: 22 },
  { id: "omurice", name: "오므라이스", category: "밥·면", amount: "1그릇", kcal: 650, protein: 18, carbs: 95, fat: 20 },
  { id: "donkatsu", name: "돈까스", category: "밥·면", amount: "1인분", kcal: 700, protein: 30, carbs: 55, fat: 38 },
  { id: "kalguksu", name: "칼국수", category: "밥·면", amount: "1그릇", kcal: 480, protein: 18, carbs: 75, fat: 9 },
  { id: "sujebi", name: "수제비", category: "밥·면", amount: "1그릇", kcal: 420, protein: 12, carbs: 72, fat: 8 },
  { id: "bibim-naengmyeon", name: "비빔냉면", category: "밥·면", amount: "1그릇", kcal: 540, protein: 16, carbs: 100, fat: 8 },
  { id: "soba", name: "메밀소바", category: "밥·면", amount: "1그릇", kcal: 350, protein: 13, carbs: 65, fat: 4 },
  { id: "juk", name: "죽", category: "밥·면", amount: "1그릇", kcal: 200, protein: 6, carbs: 38, fat: 3 },
  { id: "gukbap", name: "국밥", category: "밥·면", amount: "1그릇", kcal: 500, protein: 28, carbs: 55, fat: 15 },
  { id: "kongguksu", name: "콩국수", category: "밥·면", amount: "1그릇", kcal: 550, protein: 22, carbs: 75, fat: 15 },
  { id: "jjolmyeon", name: "쫄면", category: "밥·면", amount: "1그릇", kcal: 500, protein: 12, carbs: 95, fat: 8 },
  { id: "mandu", name: "만두", category: "밥·면", amount: "5개", kcal: 350, protein: 12, carbs: 40, fat: 15 },
  { id: "tteokguk", name: "떡국", category: "밥·면", amount: "1그릇", kcal: 470, protein: 16, carbs: 80, fat: 9 },
  { id: "hamburger", name: "햄버거", category: "밥·면", amount: "1개", kcal: 550, protein: 25, carbs: 45, fat: 30 },
  { id: "pizza", name: "피자", category: "밥·면", amount: "1조각", kcal: 280, protein: 12, carbs: 32, fat: 11 },
  { id: "gimbap-tuna", name: "참치김밥", category: "밥·면", amount: "1줄", kcal: 520, protein: 16, carbs: 76, fat: 16 },
  { id: "toast-egg", name: "토스트", category: "밥·면", amount: "1개", kcal: 350, protein: 12, carbs: 35, fat: 18 },
  { id: "curry-rice", name: "카레라이스", category: "밥·면", amount: "1그릇", kcal: 640, protein: 16, carbs: 100, fat: 18 },
  { id: "ramyeon-cheese", name: "치즈라면", category: "밥·면", amount: "1봉지", kcal: 580, protein: 14, carbs: 80, fat: 22 },
  { id: "gopchang-jeongol", name: "곱창전골", category: "밥·면", amount: "1인분", kcal: 600, protein: 30, carbs: 20, fat: 42 },

  // ── 국·찌개 (추가)
  { id: "yukgaejang", name: "육개장", category: "국·찌개", amount: "1그릇", kcal: 380, protein: 30, carbs: 20, fat: 18 },
  { id: "samgyetang", name: "삼계탕", category: "국·찌개", amount: "1그릇", kcal: 900, protein: 65, carbs: 40, fat: 45 },
  { id: "budae-jjigae", name: "부대찌개", category: "국·찌개", amount: "1인분", kcal: 550, protein: 30, carbs: 35, fat: 30 },
  { id: "seolleongtang", name: "설렁탕", category: "국·찌개", amount: "1그릇", kcal: 450, protein: 30, carbs: 30, fat: 22 },
  { id: "haejangguk", name: "해장국", category: "국·찌개", amount: "1그릇", kcal: 350, protein: 25, carbs: 18, fat: 16 },
  { id: "budea", name: "추어탕", category: "국·찌개", amount: "1그릇", kcal: 400, protein: 28, carbs: 22, fat: 20 },
  { id: "gomtang", name: "곰탕", category: "국·찌개", amount: "1그릇", kcal: 420, protein: 32, carbs: 18, fat: 22 },
  { id: "egg-soup", name: "계란국", category: "국·찌개", amount: "1그릇", kcal: 90, protein: 7, carbs: 4, fat: 5 },
  { id: "bean-sprout-soup", name: "콩나물국", category: "국·찌개", amount: "1그릇", kcal: 60, protein: 4, carbs: 6, fat: 2 },
  { id: "tteok-mandu-guk", name: "떡만둣국", category: "국·찌개", amount: "1그릇", kcal: 520, protein: 20, carbs: 78, fat: 14 },

  // ── 고기·계란 (추가)
  { id: "beef-steak", name: "소고기 스테이크", category: "고기·계란", amount: "200g", kcal: 440, protein: 52, carbs: 0, fat: 26 },
  { id: "pork-galbi", name: "돼지갈비", category: "고기·계란", amount: "200g", kcal: 500, protein: 34, carbs: 10, fat: 35 },
  { id: "bossam", name: "보쌈", category: "고기·계란", amount: "150g", kcal: 380, protein: 30, carbs: 3, fat: 27 },
  { id: "jokbal", name: "족발", category: "고기·계란", amount: "150g", kcal: 400, protein: 33, carbs: 2, fat: 28 },
  { id: "yangnyeom-chicken", name: "양념치킨", category: "고기·계란", amount: "3조각", kcal: 540, protein: 28, carbs: 40, fat: 30 },
  { id: "dakgalbi", name: "닭갈비", category: "고기·계란", amount: "1인분", kcal: 600, protein: 40, carbs: 30, fat: 35 },
  { id: "jeyuk", name: "제육볶음", category: "고기·계란", amount: "1인분", kcal: 550, protein: 35, carbs: 25, fat: 30 },
  { id: "sausage", name: "소시지", category: "고기·계란", amount: "1개", kcal: 180, protein: 8, carbs: 3, fat: 16 },
  { id: "spam", name: "스팸", category: "고기·계란", amount: "1조각(50g)", kcal: 170, protein: 7, carbs: 1, fat: 15 },
  { id: "bacon", name: "베이컨", category: "고기·계란", amount: "2줄", kcal: 90, protein: 6, carbs: 0, fat: 7 },
  { id: "ham", name: "햄", category: "고기·계란", amount: "1장", kcal: 60, protein: 5, carbs: 1, fat: 4 },
  { id: "duck", name: "오리고기", category: "고기·계란", amount: "100g", kcal: 330, protein: 19, carbs: 0, fat: 28 },
  { id: "egg-roll", name: "계란말이", category: "고기·계란", amount: "1인분", kcal: 200, protein: 13, carbs: 3, fat: 14 },
  { id: "egg-scrambled", name: "스크램블에그", category: "고기·계란", amount: "계란2개", kcal: 220, protein: 13, carbs: 2, fat: 17 },
  { id: "gyeran-jjim", name: "계란찜", category: "고기·계란", amount: "1인분", kcal: 130, protein: 11, carbs: 3, fat: 8 },
  { id: "lamb", name: "양고기", category: "고기·계란", amount: "100g", kcal: 290, protein: 25, carbs: 0, fat: 21 },
  { id: "beef-brisket", name: "차돌박이", category: "고기·계란", amount: "100g", kcal: 350, protein: 18, carbs: 0, fat: 31 },
  { id: "beef-rib", name: "소갈비", category: "고기·계란", amount: "100g", kcal: 290, protein: 19, carbs: 2, fat: 23 },

  // ── 생선·해산물 (추가)
  { id: "squid", name: "오징어", category: "생선·해산물", amount: "100g", kcal: 94, protein: 18, carbs: 3, fat: 1 },
  { id: "octopus", name: "문어", category: "생선·해산물", amount: "100g", kcal: 82, protein: 16, carbs: 2, fat: 1 },
  { id: "clam", name: "조개", category: "생선·해산물", amount: "100g", kcal: 86, protein: 12, carbs: 4, fat: 1 },
  { id: "mussel", name: "홍합", category: "생선·해산물", amount: "100g", kcal: 86, protein: 12, carbs: 4, fat: 2 },
  { id: "crab", name: "게", category: "생선·해산물", amount: "100g", kcal: 97, protein: 19, carbs: 0, fat: 2 },
  { id: "eel", name: "장어구이", category: "생선·해산물", amount: "100g", kcal: 230, protein: 18, carbs: 0, fat: 17 },
  { id: "hairtail", name: "갈치구이", category: "생선·해산물", amount: "1토막", kcal: 180, protein: 18, carbs: 0, fat: 12 },
  { id: "raw-fish", name: "회", category: "생선·해산물", amount: "1인분(150g)", kcal: 180, protein: 35, carbs: 0, fat: 4 },
  { id: "fish-cake", name: "어묵", category: "생선·해산물", amount: "1꼬치", kcal: 80, protein: 6, carbs: 8, fat: 3 },
  { id: "oyster", name: "굴", category: "생선·해산물", amount: "100g", kcal: 70, protein: 9, carbs: 4, fat: 2 },
  { id: "pollock-grilled", name: "동태전", category: "생선·해산물", amount: "3조각", kcal: 200, protein: 18, carbs: 8, fat: 11 },
  { id: "yellow-corvina", name: "조기구이", category: "생선·해산물", amount: "1마리", kcal: 120, protein: 22, carbs: 0, fat: 4 },

  // ── 채소·반찬 (추가)
  { id: "spinach-namul", name: "시금치나물", category: "채소·반찬", amount: "1접시", kcal: 50, protein: 3, carbs: 4, fat: 3 },
  { id: "beansprout-namul", name: "콩나물무침", category: "채소·반찬", amount: "1접시", kcal: 45, protein: 3, carbs: 3, fat: 3 },
  { id: "pickled-radish", name: "단무지", category: "채소·반찬", amount: "1접시", kcal: 20, protein: 0, carbs: 4, fat: 0 },
  { id: "braised-tofu", name: "두부조림", category: "채소·반찬", amount: "1접시", kcal: 180, protein: 14, carbs: 8, fat: 11 },
  { id: "anchovy-stir", name: "멸치볶음", category: "채소·반찬", amount: "1접시", kcal: 130, protein: 12, carbs: 8, fat: 6 },
  { id: "japchae", name: "잡채", category: "채소·반찬", amount: "1접시", kcal: 330, protein: 8, carbs: 45, fat: 12 },
  { id: "avocado", name: "아보카도", category: "채소·반찬", amount: "1/2개", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { id: "broccoli", name: "브로콜리", category: "채소·반찬", amount: "100g", kcal: 34, protein: 3, carbs: 7, fat: 0 },
  { id: "tomato", name: "토마토", category: "채소·반찬", amount: "1개", kcal: 22, protein: 1, carbs: 5, fat: 0 },
  { id: "cucumber", name: "오이", category: "채소·반찬", amount: "1개", kcal: 16, protein: 1, carbs: 4, fat: 0 },
  { id: "pumpkin", name: "단호박", category: "채소·반찬", amount: "100g", kcal: 66, protein: 2, carbs: 16, fat: 0 },
  { id: "potato", name: "감자", category: "채소·반찬", amount: "1개(150g)", kcal: 130, protein: 3, carbs: 30, fat: 0 },
  { id: "mushroom", name: "버섯", category: "채소·반찬", amount: "100g", kcal: 22, protein: 3, carbs: 3, fat: 0 },
  { id: "gim", name: "구운김", category: "채소·반찬", amount: "1봉", kcal: 30, protein: 4, carbs: 1, fat: 1 },
  { id: "radish-kimchi", name: "깍두기", category: "채소·반찬", amount: "1접시", kcal: 35, protein: 1, carbs: 6, fat: 1 },

  // ── 과일 (추가)
  { id: "watermelon", name: "수박", category: "과일", amount: "1쪽", kcal: 90, protein: 2, carbs: 22, fat: 0 },
  { id: "strawberry", name: "딸기", category: "과일", amount: "100g", kcal: 32, protein: 1, carbs: 8, fat: 0 },
  { id: "peach", name: "복숭아", category: "과일", amount: "1개", kcal: 60, protein: 1, carbs: 15, fat: 0 },
  { id: "pear", name: "배", category: "과일", amount: "1개", kcal: 100, protein: 0, carbs: 27, fat: 0 },
  { id: "kiwi", name: "키위", category: "과일", amount: "1개", kcal: 42, protein: 1, carbs: 10, fat: 0 },
  { id: "mango", name: "망고", category: "과일", amount: "1개", kcal: 200, protein: 3, carbs: 50, fat: 1 },
  { id: "pineapple", name: "파인애플", category: "과일", amount: "100g", kcal: 50, protein: 1, carbs: 13, fat: 0 },
  { id: "persimmon", name: "감", category: "과일", amount: "1개", kcal: 120, protein: 1, carbs: 31, fat: 0 },
  { id: "mandarin", name: "귤", category: "과일", amount: "1개", kcal: 40, protein: 1, carbs: 10, fat: 0 },
  { id: "cherry", name: "체리", category: "과일", amount: "100g", kcal: 63, protein: 1, carbs: 16, fat: 0 },
  { id: "plum", name: "자두", category: "과일", amount: "1개", kcal: 30, protein: 0, carbs: 8, fat: 0 },
  { id: "melon", name: "멜론", category: "과일", amount: "1쪽", kcal: 60, protein: 1, carbs: 14, fat: 0 },

  // ── 유제품 (추가)
  { id: "yogurt-drink", name: "요구르트", category: "유제품", amount: "1병", kcal: 65, protein: 1, carbs: 13, fat: 0 },
  { id: "low-fat-milk", name: "저지방우유", category: "유제품", amount: "1컵(200ml)", kcal: 90, protein: 8, carbs: 12, fat: 2 },
  { id: "soy-milk", name: "두유", category: "유제품", amount: "1팩(200ml)", kcal: 100, protein: 7, carbs: 8, fat: 4 },
  { id: "butter", name: "버터", category: "유제품", amount: "1조각(10g)", kcal: 72, protein: 0, carbs: 0, fat: 8 },
  { id: "cream-cheese", name: "크림치즈", category: "유제품", amount: "30g", kcal: 100, protein: 2, carbs: 2, fat: 10 },
  { id: "ice-cream", name: "아이스크림", category: "유제품", amount: "1개", kcal: 200, protein: 3, carbs: 24, fat: 11 },
  { id: "cottage-cheese", name: "코티지치즈", category: "유제품", amount: "100g", kcal: 98, protein: 11, carbs: 3, fat: 4 },
  { id: "mozzarella", name: "모짜렐라", category: "유제품", amount: "30g", kcal: 85, protein: 6, carbs: 1, fat: 6 },

  // ── 빵·간식 (추가)
  { id: "bagel", name: "베이글", category: "빵·간식", amount: "1개", kcal: 250, protein: 10, carbs: 48, fat: 2 },
  { id: "donut", name: "도넛", category: "빵·간식", amount: "1개", kcal: 250, protein: 3, carbs: 30, fat: 13 },
  { id: "cake", name: "케이크", category: "빵·간식", amount: "1조각", kcal: 350, protein: 4, carbs: 45, fat: 18 },
  { id: "cookie", name: "쿠키", category: "빵·간식", amount: "1개", kcal: 140, protein: 2, carbs: 18, fat: 7 },
  { id: "macaron", name: "마카롱", category: "빵·간식", amount: "1개", kcal: 90, protein: 2, carbs: 14, fat: 3 },
  { id: "muffin", name: "머핀", category: "빵·간식", amount: "1개", kcal: 380, protein: 6, carbs: 45, fat: 20 },
  { id: "waffle", name: "와플", category: "빵·간식", amount: "1개", kcal: 310, protein: 6, carbs: 40, fat: 14 },
  { id: "popcorn", name: "팝콘", category: "빵·간식", amount: "1봉", kcal: 150, protein: 3, carbs: 19, fat: 8 },
  { id: "walnut", name: "호두", category: "빵·간식", amount: "1줌(28g)", kcal: 185, protein: 4, carbs: 4, fat: 18 },
  { id: "peanut", name: "땅콩", category: "빵·간식", amount: "1줌(28g)", kcal: 161, protein: 7, carbs: 5, fat: 14 },
  { id: "nuts-mix", name: "견과류믹스", category: "빵·간식", amount: "1봉(30g)", kcal: 180, protein: 5, carbs: 8, fat: 15 },
  { id: "jelly", name: "젤리", category: "빵·간식", amount: "1봉", kcal: 130, protein: 2, carbs: 30, fat: 0 },
  { id: "hotteok", name: "호떡", category: "빵·간식", amount: "1개", kcal: 230, protein: 3, carbs: 40, fat: 7 },
  { id: "bungeoppang", name: "붕어빵", category: "빵·간식", amount: "1개", kcal: 130, protein: 3, carbs: 26, fat: 2 },
  { id: "gyeranppang", name: "계란빵", category: "빵·간식", amount: "1개", kcal: 200, protein: 7, carbs: 24, fat: 9 },
  { id: "soboro", name: "소보로빵", category: "빵·간식", amount: "1개", kcal: 290, protein: 6, carbs: 42, fat: 11 },
  { id: "red-bean-bun", name: "단팥빵", category: "빵·간식", amount: "1개", kcal: 250, protein: 6, carbs: 48, fat: 4 },
  { id: "energy-bar", name: "에너지바", category: "빵·간식", amount: "1개", kcal: 220, protein: 4, carbs: 30, fat: 9 },

  // ── 음료 (추가)
  { id: "green-tea", name: "녹차", category: "음료", amount: "1잔", kcal: 2, protein: 0, carbs: 0, fat: 0 },
  { id: "sikhye", name: "식혜", category: "음료", amount: "1캔", kcal: 130, protein: 0, carbs: 32, fat: 0 },
  { id: "sports-drink", name: "이온음료", category: "음료", amount: "1병(500ml)", kcal: 130, protein: 0, carbs: 32, fat: 0 },
  { id: "energy-drink", name: "에너지드링크", category: "음료", amount: "1캔", kcal: 120, protein: 0, carbs: 30, fat: 0 },
  { id: "smoothie", name: "스무디", category: "음료", amount: "1잔", kcal: 220, protein: 3, carbs: 45, fat: 3 },
  { id: "milk-tea", name: "밀크티", category: "음료", amount: "1잔", kcal: 230, protein: 4, carbs: 40, fat: 6 },
  { id: "cappuccino", name: "카푸치노", category: "음료", amount: "1잔", kcal: 120, protein: 6, carbs: 10, fat: 6 },
  { id: "cola-zero", name: "제로콜라", category: "음료", amount: "1캔(355ml)", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: "makgeolli", name: "막걸리", category: "음료", amount: "1사발", kcal: 130, protein: 2, carbs: 15, fat: 0 },
  { id: "wine", name: "와인", category: "음료", amount: "1잔", kcal: 125, protein: 0, carbs: 4, fat: 0 },
  { id: "highball", name: "하이볼", category: "음료", amount: "1잔", kcal: 150, protein: 0, carbs: 10, fat: 0 },
  { id: "lemonade", name: "레모네이드", category: "음료", amount: "1잔", kcal: 120, protein: 0, carbs: 30, fat: 0 },

  // ── 단백질·보충 (추가)
  { id: "protein-cookie", name: "단백질쿠키", category: "단백질·보충", amount: "1개", kcal: 180, protein: 15, carbs: 18, fat: 6 },
  { id: "mass-gainer", name: "게이너", category: "단백질·보충", amount: "1스쿱", kcal: 350, protein: 30, carbs: 50, fat: 4 },
  { id: "egg-white", name: "계란흰자", category: "단백질·보충", amount: "100g", kcal: 52, protein: 11, carbs: 1, fat: 0 },
  { id: "protein-yogurt", name: "단백질요거트", category: "단백질·보충", amount: "1개", kcal: 150, protein: 15, carbs: 12, fat: 3 },
  { id: "protein-drink", name: "단백질음료", category: "단백질·보충", amount: "1병", kcal: 160, protein: 20, carbs: 12, fat: 3 },

  // ── 밥·면 (추가 2)
  { id: "janchi-guksu", name: "잔치국수", category: "밥·면", amount: "1그릇", kcal: 400, protein: 12, carbs: 75, fat: 5 },
  { id: "bibim-guksu", name: "비빔국수", category: "밥·면", amount: "1그릇", kcal: 480, protein: 12, carbs: 90, fat: 7 },
  { id: "rabokki", name: "라볶이", category: "밥·면", amount: "1인분", kcal: 600, protein: 14, carbs: 100, fat: 16 },
  { id: "kimchi-mandu", name: "김치만두", category: "밥·면", amount: "5개", kcal: 360, protein: 12, carbs: 42, fat: 15 },
  { id: "fried-mandu", name: "군만두", category: "밥·면", amount: "5개", kcal: 420, protein: 13, carbs: 44, fat: 22 },
  { id: "pho", name: "쌀국수", category: "밥·면", amount: "1그릇", kcal: 380, protein: 18, carbs: 60, fat: 6 },
  { id: "malatang", name: "마라탕", category: "밥·면", amount: "1인분", kcal: 550, protein: 25, carbs: 40, fat: 30 },
  { id: "burrito", name: "부리토", category: "밥·면", amount: "1개", kcal: 600, protein: 22, carbs: 70, fat: 25 },
  { id: "taco", name: "타코", category: "밥·면", amount: "2개", kcal: 360, protein: 16, carbs: 30, fat: 18 },
  { id: "gyudon", name: "규동", category: "밥·면", amount: "1그릇", kcal: 650, protein: 24, carbs: 95, fat: 18 },
  { id: "tendon", name: "텐동", category: "밥·면", amount: "1그릇", kcal: 700, protein: 20, carbs: 100, fat: 24 },
  { id: "sushi", name: "초밥", category: "밥·면", amount: "8피스", kcal: 480, protein: 22, carbs: 80, fat: 6 },
  { id: "inari-sushi", name: "유부초밥", category: "밥·면", amount: "1인분", kcal: 420, protein: 10, carbs: 78, fat: 8 },
  { id: "onigiri", name: "주먹밥", category: "밥·면", amount: "1개", kcal: 200, protein: 5, carbs: 38, fat: 4 },
  { id: "nurungji", name: "누룽지", category: "밥·면", amount: "1그릇", kcal: 230, protein: 5, carbs: 48, fat: 2 },
  { id: "kongnamul-gukbap", name: "콩나물국밥", category: "밥·면", amount: "1그릇", kcal: 350, protein: 18, carbs: 50, fat: 8 },
  { id: "albap", name: "알밥", category: "밥·면", amount: "1그릇", kcal: 480, protein: 18, carbs: 70, fat: 12 },

  // ── 국·찌개 (추가 2)
  { id: "dongtae-jjigae", name: "동태찌개", category: "국·찌개", amount: "1뚝배기", kcal: 300, protein: 30, carbs: 12, fat: 14 },
  { id: "cheonggukjang", name: "청국장", category: "국·찌개", amount: "1뚝배기", kcal: 250, protein: 18, carbs: 16, fat: 12 },
  { id: "gamjatang", name: "감자탕", category: "국·찌개", amount: "1인분", kcal: 600, protein: 38, carbs: 30, fat: 36 },
  { id: "maeuntang", name: "매운탕", category: "국·찌개", amount: "1그릇", kcal: 320, protein: 30, carbs: 14, fat: 14 },
  { id: "odeng-tang", name: "어묵탕", category: "국·찌개", amount: "1그릇", kcal: 180, protein: 12, carbs: 18, fat: 6 },
  { id: "miso-soup", name: "미소된장국", category: "국·찌개", amount: "1그릇", kcal: 80, protein: 6, carbs: 8, fat: 3 },

  // ── 고기·계란 (추가 2)
  { id: "chicken-tender", name: "닭안심", category: "고기·계란", amount: "100g", kcal: 105, protein: 24, carbs: 0, fat: 1 },
  { id: "hanwoo-sirloin", name: "한우 등심", category: "고기·계란", amount: "100g", kcal: 320, protein: 18, carbs: 0, fat: 27 },
  { id: "chicken-wingstick", name: "닭봉", category: "고기·계란", amount: "3개", kcal: 240, protein: 22, carbs: 4, fat: 15 },
  { id: "chicken-feet", name: "닭발", category: "고기·계란", amount: "1인분", kcal: 280, protein: 24, carbs: 6, fat: 18 },
  { id: "gopchang", name: "곱창", category: "고기·계란", amount: "100g", kcal: 280, protein: 14, carbs: 2, fat: 24 },
  { id: "makchang", name: "막창", category: "고기·계란", amount: "100g", kcal: 300, protein: 15, carbs: 1, fat: 26 },
  { id: "ham-egg", name: "햄에그", category: "고기·계란", amount: "1인분", kcal: 250, protein: 16, carbs: 4, fat: 18 },
  { id: "quail-egg", name: "메추리알", category: "고기·계란", amount: "5개", kcal: 70, protein: 6, carbs: 1, fat: 5 },

  // ── 생선·해산물 (추가 2)
  { id: "myeongnan", name: "명란젓", category: "생선·해산물", amount: "30g", kcal: 30, protein: 4, carbs: 1, fat: 1 },
  { id: "abalone", name: "전복", category: "생선·해산물", amount: "100g", kcal: 100, protein: 17, carbs: 6, fat: 1 },
  { id: "scallop", name: "가리비", category: "생선·해산물", amount: "100g", kcal: 90, protein: 17, carbs: 5, fat: 1 },
  { id: "fried-shrimp", name: "새우튀김", category: "생선·해산물", amount: "3개", kcal: 250, protein: 12, carbs: 18, fat: 14 },
  { id: "fried-squid", name: "오징어튀김", category: "생선·해산물", amount: "1인분", kcal: 320, protein: 16, carbs: 24, fat: 18 },
  { id: "oyster-raw", name: "굴(생)", category: "생선·해산물", amount: "100g", kcal: 70, protein: 9, carbs: 4, fat: 2 },

  // ── 채소·반찬 (추가 2)
  { id: "corn-salad", name: "콘샐러드", category: "채소·반찬", amount: "1접시", kcal: 180, protein: 4, carbs: 22, fat: 9 },
  { id: "potato-salad", name: "감자샐러드", category: "채소·반찬", amount: "1접시", kcal: 220, protein: 4, carbs: 24, fat: 12 },
  { id: "musaengchae", name: "무생채", category: "채소·반찬", amount: "1접시", kcal: 30, protein: 1, carbs: 6, fat: 0 },
  { id: "oimuchim", name: "오이무침", category: "채소·반찬", amount: "1접시", kcal: 35, protein: 1, carbs: 6, fat: 1 },
  { id: "eggplant-stir", name: "가지볶음", category: "채소·반찬", amount: "1접시", kcal: 90, protein: 2, carbs: 8, fat: 6 },
  { id: "zucchini-stir", name: "애호박볶음", category: "채소·반찬", amount: "1접시", kcal: 80, protein: 2, carbs: 7, fat: 5 },
  { id: "jangjorim", name: "장조림", category: "채소·반찬", amount: "1접시", kcal: 160, protein: 22, carbs: 6, fat: 5 },
  { id: "kongjaban", name: "콩자반", category: "채소·반찬", amount: "1접시", kcal: 150, protein: 9, carbs: 18, fat: 4 },
  { id: "gimjaban", name: "김자반", category: "채소·반찬", amount: "1접시", kcal: 60, protein: 4, carbs: 4, fat: 3 },
  { id: "ueong-jorim", name: "우엉조림", category: "채소·반찬", amount: "1접시", kcal: 110, protein: 2, carbs: 22, fat: 2 },

  // ── 과일 (추가 2)
  { id: "grapefruit", name: "자몽", category: "과일", amount: "1/2개", kcal: 40, protein: 1, carbs: 10, fat: 0 },
  { id: "fig", name: "무화과", category: "과일", amount: "1개", kcal: 40, protein: 0, carbs: 10, fat: 0 },
  { id: "pomegranate", name: "석류", category: "과일", amount: "1/2개", kcal: 70, protein: 1, carbs: 17, fat: 1 },
  { id: "raspberry", name: "라즈베리", category: "과일", amount: "100g", kcal: 52, protein: 1, carbs: 12, fat: 1 },
  { id: "green-grape", name: "청포도", category: "과일", amount: "100g", kcal: 60, protein: 1, carbs: 16, fat: 0 },

  // ── 유제품 (추가 2)
  { id: "plain-yogurt", name: "플레인요거트", category: "유제품", amount: "100g", kcal: 60, protein: 5, carbs: 7, fat: 2 },
  { id: "processed-cheese", name: "가공치즈", category: "유제품", amount: "1장(18g)", kcal: 60, protein: 4, carbs: 1, fat: 5 },
  { id: "choco-milk", name: "초코우유", category: "유제품", amount: "1팩(200ml)", kcal: 160, protein: 6, carbs: 24, fat: 5 },
  { id: "strawberry-milk", name: "딸기우유", category: "유제품", amount: "1팩(200ml)", kcal: 150, protein: 6, carbs: 26, fat: 4 },

  // ── 빵·간식 (추가 2)
  { id: "castella", name: "카스텔라", category: "빵·간식", amount: "1조각", kcal: 160, protein: 4, carbs: 24, fat: 6 },
  { id: "cracker", name: "크래커", category: "빵·간식", amount: "5개", kcal: 130, protein: 2, carbs: 20, fat: 5 },
  { id: "yanggaeng", name: "양갱", category: "빵·간식", amount: "1개", kcal: 150, protein: 2, carbs: 35, fat: 0 },
  { id: "yakgwa", name: "약과", category: "빵·간식", amount: "1개", kcal: 180, protein: 1, carbs: 28, fat: 8 },
  { id: "injeolmi", name: "인절미", category: "빵·간식", amount: "3개", kcal: 180, protein: 4, carbs: 36, fat: 3 },
  { id: "corndog", name: "핫도그", category: "빵·간식", amount: "1개", kcal: 290, protein: 9, carbs: 30, fat: 15 },
  { id: "churros", name: "츄러스", category: "빵·간식", amount: "1개", kcal: 220, protein: 3, carbs: 28, fat: 11 },

  // ── 음료 (추가 2)
  { id: "hot-chocolate", name: "핫초코", category: "음료", amount: "1잔", kcal: 190, protein: 6, carbs: 30, fat: 5 },
  { id: "vanilla-latte", name: "바닐라라떼", category: "음료", amount: "1잔", kcal: 250, protein: 8, carbs: 35, fat: 8 },
  { id: "iced-tea", name: "아이스티", category: "음료", amount: "1잔", kcal: 90, protein: 0, carbs: 22, fat: 0 },
  { id: "tomato-juice", name: "토마토주스", category: "음료", amount: "1잔(200ml)", kcal: 40, protein: 2, carbs: 8, fat: 0 },
  { id: "barley-tea", name: "보리차", category: "음료", amount: "1잔", kcal: 5, protein: 0, carbs: 1, fat: 0 },
  { id: "whiskey", name: "위스키", category: "음료", amount: "1샷", kcal: 95, protein: 0, carbs: 0, fat: 0 },

  // ── 단백질·보충 (추가 2)
  { id: "oatmeal", name: "오트밀", category: "단백질·보충", amount: "1인분(40g)", kcal: 150, protein: 5, carbs: 27, fat: 3 },
  { id: "chicken-sausage", name: "닭가슴살소시지", category: "단백질·보충", amount: "1개", kcal: 90, protein: 14, carbs: 3, fat: 2 },
  { id: "chicken-ball", name: "닭가슴살볼", category: "단백질·보충", amount: "100g", kcal: 130, protein: 20, carbs: 6, fat: 3 },
  { id: "casein", name: "카제인", category: "단백질·보충", amount: "1스쿱", kcal: 120, protein: 24, carbs: 3, fat: 1 },
  { id: "egg-white-pack", name: "계란흰자(가공)", category: "단백질·보충", amount: "1팩", kcal: 80, protein: 18, carbs: 2, fat: 0 },
];

// 카테고리 순서로 정렬해 검색/둘러보기에서 같은 분류끼리 모이게 한다.
// (추가 음식이 배열 끝에만 몰려 안 보이는 문제 방지 — JS sort는 안정 정렬이라 분류 내 순서는 유지.)
const CATEGORY_ORDER: FoodCategory[] = [
  "밥·면",
  "국·찌개",
  "고기·계란",
  "생선·해산물",
  "채소·반찬",
  "과일",
  "유제품",
  "빵·간식",
  "음료",
  "단백질·보충",
];
FOOD_ITEMS.sort(
  (a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
);

/** 카테고리 목록(직접 입력 시 선택용). */
export const FOOD_CATEGORIES: FoodCategory[] = CATEGORY_ORDER;

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
