import { describe, expect, it } from "vitest";

import { dailyTarget } from "@/features/diet/calorie-target";
import { searchFoods, getFoodItem, FOOD_ITEMS } from "@/features/diet/food-catalog";
import { wrapIndex, clampDietDate } from "@/features/diet/meal";

describe("dailyTarget — 권장 칼로리·탄단지", () => {
  it("키·몸무게 있으면 Mifflin-St Jeor 기반 TDEE", () => {
    const t = dailyTarget({ gender: "male", weightKg: 75, heightCm: 178 });
    // BMR = 10*75 + 6.25*178 - 5*30 + 5 = 1717.5 → *1.5 ≈ 2576 → 10단위 반올림
    expect(t.kcal).toBeGreaterThan(2400);
    expect(t.kcal).toBeLessThan(2700);
    // 단백질 = 체중*1.6
    expect(t.protein).toBe(120);
    // 탄단지 합이 대략 kcal 와 맞다(±50)
    const sum = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(sum - t.kcal)).toBeLessThanOrEqual(50);
  });

  it("키·몸무게 없으면 성별 기본값", () => {
    expect(dailyTarget({ gender: "male", weightKg: null, heightCm: null }).kcal).toBe(2000);
    expect(dailyTarget({ gender: "female", weightKg: null, heightCm: null }).kcal).toBe(1800);
  });

  it("여성이 남성보다 BMR 낮다(같은 체격)", () => {
    const m = dailyTarget({ gender: "male", weightKg: 70, heightCm: 170 });
    const f = dailyTarget({ gender: "female", weightKg: 70, heightCm: 170 });
    expect(f.kcal).toBeLessThan(m.kcal);
  });
});

describe("음식 카탈로그 검색", () => {
  it("이름 부분일치", () => {
    const r = searchFoods("닭");
    expect(r.some((f) => f.id === "chicken-breast")).toBe(true);
  });

  it("카테고리로도 검색", () => {
    const r = searchFoods("과일");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((f) => f.category === "과일")).toBe(true);
  });

  it("빈 검색어는 전체", () => {
    expect(searchFoods("").length).toBe(FOOD_ITEMS.length);
  });

  it("모든 항목은 kcal 0 이상 + id 유니크", () => {
    const ids = new Set(FOOD_ITEMS.map((f) => f.id));
    expect(ids.size).toBe(FOOD_ITEMS.length); // id 중복 없음
    for (const f of FOOD_ITEMS) expect(f.kcal).toBeGreaterThanOrEqual(0); // 제로콜라=0 허용
    expect(getFoodItem("rice")?.name).toBe("흰쌀밥");
  });
});

describe("wrapIndex — 사진 캐러셀 순환", () => {
  it("범위 내 인덱스는 그대로", () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(2, 3)).toBe(2);
  });

  it("초과하면 처음으로 감싼다(다음)", () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(4, 3)).toBe(1);
  });

  it("음수면 끝에서부터 감싼다(이전)", () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(-4, 3)).toBe(2);
  });

  it("사진이 없으면 0", () => {
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(5, 0)).toBe(0);
  });
});

describe("clampDietDate — 과거 날짜 이동 정규화", () => {
  const today = "2026-07-07";
  it("과거 날짜는 그대로", () => {
    expect(clampDietDate("2026-07-01", today)).toBe("2026-07-01");
    expect(clampDietDate("2025-12-31", today)).toBe("2025-12-31");
  });
  it("오늘은 그대로", () => {
    expect(clampDietDate(today, today)).toBe(today);
  });
  it("미래 날짜는 오늘로 클램프", () => {
    expect(clampDietDate("2026-07-08", today)).toBe(today);
    expect(clampDietDate("2027-01-01", today)).toBe(today);
  });
  it("형식이 틀리면 null", () => {
    expect(clampDietDate("2026-7-7", today)).toBeNull();
    expect(clampDietDate("", today)).toBeNull();
    expect(clampDietDate("어제", today)).toBeNull();
  });
});
