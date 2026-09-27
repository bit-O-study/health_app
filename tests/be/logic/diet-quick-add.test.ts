import { describe, expect, it } from "vitest";

import {
  copyMealLabel,
  copyMealSummary,
  lastMealOf,
  mealByHour,
  quickFoodInput,
  quickKey,
  rankQuickFoods,
  type RecentFood,
} from "@/features/diet/quick-add";

/**
 * 식단 UI 리뉴얼(2026-09-25) — "기록을 쉽게".
 *
 * 매일 같은 걸 먹는 사람에게 매번 검색을 시키지 않는다. 여기서는 화면이 기대는
 * 순수 계산(무엇을 칩으로 올릴지·어느 끼니에 담을지·무엇을 복사할지)만 본다.
 * 실제 저장은 E2E(`tests/e2e/diet-quick-add.spec.ts`)가 확인한다.
 */

function food(p: Partial<RecentFood> & { name: string; date: string }): RecentFood {
  return {
    kcal: 100,
    protein: 10,
    carbs: 5,
    fat: 2,
    amount: "1인분",
    category: null,
    meal: "lunch",
    eatenAt: null,
    ...p,
  };
}

describe("같은 음식 접기", () => {
  it("이름과 양이 같으면 한 칩으로 접고 횟수를 센다", () => {
    const out = rankQuickFoods(
      [
        food({ name: "닭가슴살", date: "2026-09-24" }),
        food({ name: "닭가슴살", date: "2026-09-23" }),
        food({ name: "사과", date: "2026-09-22" }),
      ],
      { today: "2026-09-25" },
    );
    expect(out.map((f) => f.name)).toEqual(["닭가슴살", "사과"]);
    expect(out[0].count).toBe(2);
  });

  it("🔴 양이 다르면 다른 칩이다 — 100g 과 200g 은 한 번에 담는 단위가 다르다", () => {
    const out = rankQuickFoods(
      [
        food({ name: "닭가슴살", amount: "100g", date: "2026-09-24" }),
        food({ name: "닭가슴살", amount: "200g", date: "2026-09-23" }),
      ],
      { today: "2026-09-25" },
    );
    expect(out).toHaveLength(2);
    expect(quickKey(out[0])).not.toBe(quickKey(out[1]));
  });

  it("영양값은 가장 최근 것을 쓴다 — 고쳐 담았으면 고친 값이 다시 담긴다", () => {
    const out = rankQuickFoods(
      [
        food({ name: "현미밥", kcal: 300, date: "2026-09-20" }),
        food({ name: "현미밥", kcal: 210, date: "2026-09-24" }),
      ],
      { today: "2026-09-25" },
    );
    expect(out[0].kcal).toBe(210);
    expect(out[0].count).toBe(2);
  });

  it("이름이 빈 기록은 후보에서 뺀다", () => {
    expect(
      rankQuickFoods([food({ name: "   ", date: "2026-09-24" })], {
        today: "2026-09-25",
      }),
    ).toHaveLength(0);
  });
});

describe("무엇을 위에 올릴까", () => {
  it("자주 먹은 것이 앞이다", () => {
    const recent = [
      food({ name: "사과", date: "2026-09-24" }),
      food({ name: "김치찌개", date: "2026-09-24" }),
      food({ name: "김치찌개", date: "2026-09-23" }),
      food({ name: "김치찌개", date: "2026-09-22" }),
    ];
    expect(rankQuickFoods(recent, { today: "2026-09-25" })[0].name).toBe("김치찌개");
  });

  it("🔴 끼니가 맞으면 한 번 덜 먹은 것도 앞선다 — 아침엔 아침에 먹던 걸 준다", () => {
    const recent = [
      food({ name: "김치찌개", meal: "dinner", date: "2026-09-24" }),
      food({ name: "김치찌개", meal: "dinner", date: "2026-09-23" }),
      food({ name: "시리얼", meal: "breakfast", date: "2026-09-24" }),
    ];
    const out = rankQuickFoods(recent, { meal: "breakfast", today: "2026-09-25" });
    expect(out[0].name).toBe("시리얼");
    // 끼니를 안 주면 순수하게 횟수 순이다.
    expect(rankQuickFoods(recent, { today: "2026-09-25" })[0].name).toBe("김치찌개");
  });

  it("같은 조건이면 최근 것이 앞, 그래도 같으면 이름순 — 순서가 흔들리지 않는다", () => {
    const a = rankQuickFoods(
      [
        food({ name: "바나나", date: "2026-09-20" }),
        food({ name: "고구마", date: "2026-09-24" }),
      ],
      { today: "2026-09-25" },
    );
    expect(a.map((f) => f.name)).toEqual(["고구마", "바나나"]);

    const same = [
      food({ name: "두부", date: "2026-09-24" }),
      food({ name: "계란", date: "2026-09-24" }),
    ];
    expect(rankQuickFoods(same, { today: "2026-09-25" }).map((f) => f.name)).toEqual(
      ["계란", "두부"],
    );
  });

  it("개수를 넘겨 자르고, 기록이 없으면 빈 배열", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      food({ name: `음식${i}`, date: "2026-09-24" }),
    );
    expect(rankQuickFoods(many, { today: "2026-09-25", limit: 3 })).toHaveLength(3);
    expect(rankQuickFoods([], { today: "2026-09-25" })).toEqual([]);
  });
});

describe("칩 → 담을 입력", () => {
  it("끼니와 시간은 화면이 정하고 나머지는 그대로 옮긴다", () => {
    const [chip] = rankQuickFoods(
      [food({ name: "닭가슴살", kcal: 165, amount: "100g", date: "2026-09-24" })],
      { today: "2026-09-25" },
    );
    expect(quickFoodInput(chip, "dinner", "19:30")).toEqual({
      meal: "dinner",
      name: "닭가슴살",
      kcal: 165,
      protein: 10,
      carbs: 5,
      fat: 2,
      amount: "100g",
      category: null,
      eatenAt: "19:30",
    });
    // 과거 날짜엔 시간을 붙이지 않는다(그날 몇 시였는지 모른다).
    expect(quickFoodInput(chip, "dinner").eatenAt).toBeNull();
  });
});

describe("시계가 고르는 기본 끼니", () => {
  it("밥 때에 맞춰 고른다", () => {
    expect(mealByHour("07:30")).toBe("breakfast");
    expect(mealByHour("10:29")).toBe("breakfast");
    expect(mealByHour("10:30")).toBe("lunch");
    expect(mealByHour("12:10")).toBe("lunch");
    expect(mealByHour("15:00")).toBe("dinner");
    expect(mealByHour("20:59")).toBe("dinner");
  });

  it("밤·새벽·이상한 값은 간식 — 틀려도 화면에서 한 번에 바꾼다", () => {
    expect(mealByHour("22:00")).toBe("snack");
    expect(mealByHour("02:00")).toBe("snack");
    expect(mealByHour("")).toBe("snack");
    expect(mealByHour("아침")).toBe("snack");
  });
});

describe("지난 끼니 그대로 담기", () => {
  const recent = [
    food({ name: "토스트", meal: "breakfast", date: "2026-09-24", kcal: 250 }),
    food({ name: "우유", meal: "breakfast", date: "2026-09-24", kcal: 130 }),
    food({ name: "시리얼", meal: "breakfast", date: "2026-09-20" }),
    food({ name: "국밥", meal: "lunch", date: "2026-09-23" }),
  ];

  it("그 끼니가 있는 가장 최근 날을 통째로 집는다", () => {
    const src = lastMealOf(recent, "breakfast");
    expect(src?.date).toBe("2026-09-24");
    expect(src?.items.map((i) => i.name)).toEqual(["토스트", "우유"]);
  });

  it("🔴 어제 그 끼니를 안 먹었어도 더 거슬러 찾는다 — 빈손으로 두지 않는다", () => {
    expect(lastMealOf(recent, "lunch")?.date).toBe("2026-09-23");
    expect(lastMealOf(recent, "snack")).toBeNull();
  });

  it("버튼 문구는 며칠 전인지로 말한다", () => {
    expect(copyMealLabel("breakfast", "2026-09-24", "2026-09-25")).toBe(
      "어제 아침 그대로 담기",
    );
    expect(copyMealLabel("lunch", "2026-09-23", "2026-09-25")).toBe(
      "그저께 점심 그대로 담기",
    );
    expect(copyMealLabel("dinner", "2026-09-19", "2026-09-25")).toBe(
      "6일 전 저녁 그대로 담기",
    );
  });

  it("무엇을 담는지 한 줄로 보여 준다", () => {
    const src = lastMealOf(recent, "breakfast")!;
    expect(copyMealSummary(src.items)).toBe("토스트 외 1개 · 380kcal");
    expect(copyMealSummary([food({ name: "국밥", kcal: 600, date: "2026-09-23" })])).toBe(
      "국밥 · 600kcal",
    );
    expect(copyMealSummary([])).toBeNull();
  });
});
