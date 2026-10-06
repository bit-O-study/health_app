import { describe, expect, it } from "vitest";

import {
  DIET_SYSTEM,
  GOAL_KCAL_ADJUST,
  buildDietUserText,
  goalKcal,
  parseDietFeedback,
  pctOf,
  readStoredDiet,
  summarizeToday,
} from "@/features/coach/diet-coach";

const BASE = { kcal: 2400, protein: 112, carbs: 280, fat: 67 };

describe("하루 목표 칼로리(운동 목표 반영)", () => {
  it("감량 −400 · 체지방 −300 · 근육 +250 · 유지 0", () => {
    expect(goalKcal(BASE, "weight_loss", "male")).toBe(2000);
    expect(goalKcal(BASE, "fat_loss", "male")).toBe(2100);
    expect(goalKcal(BASE, "muscle_gain", "male")).toBe(2650);
    expect(goalKcal(BASE, "maintain", "male")).toBe(2400);
    expect(goalKcal(BASE, null, "male")).toBe(2400);
    expect(GOAL_KCAL_ADJUST.weight_loss).toBe(-400);
  });

  it("🔴 감량이어도 최저선(남 1,500 · 여 1,200) 아래로 권하지 않는다", () => {
    expect(goalKcal({ ...BASE, kcal: 1500 }, "weight_loss", "female")).toBe(1200);
    expect(goalKcal({ ...BASE, kcal: 1700 }, "weight_loss", "male")).toBe(1500);
  });
});

describe("오늘 먹은 양", () => {
  it("합계와 끼니별 이름(아침→점심→저녁→간식 순, 중복 없이)", () => {
    const t = summarizeToday(
      [
        { name: "김밥", meal: "lunch", kcal: 480, proteinG: 12 },
        { name: "계란", meal: "breakfast", kcal: 150, proteinG: 12.4 },
        { name: "김밥", meal: "lunch", kcal: 480, proteinG: 12 },
      ],
      1200,
    );
    expect(t.kcal).toBe(1110);
    expect(t.proteinG).toBe(36);
    expect(t.waterMl).toBe(1200);
    expect(t.meals).toEqual([
      { meal: "breakfast", names: ["계란"] },
      { meal: "lunch", names: ["김밥"] },
    ]);
  });

  it("목표 대비 %", () => {
    expect(pctOf(1110, 2400)).toBe(46);
    expect(pctOf(10, 0)).toBe(0);
  });
});

describe("AI 에 보내는 글", () => {
  it("🔴 목표 숫자는 이미 정해졌다고 말한다(AI 가 새 목표를 만들지 않게)", () => {
    expect(DIET_SYSTEM).toContain("새 목표를 만들지 말고");
  });

  it("목표·지금까지·먹은 것이 들어간다", () => {
    const t = buildDietUserText(
      "muscle_gain",
      { kcal: 2650, proteinG: 112, waterMl: 2300 },
      summarizeToday([{ name: "닭가슴살", meal: "lunch", kcal: 200, proteinG: 40 }], 500),
      14,
    );
    expect(t).toContain("목표: 근육 증가");
    expect(t).toContain("하루 목표: 2650kcal · 단백질 112g · 수분 2300ml");
    expect(t).toContain("오늘 지금까지(14시): 200kcal(8%) · 단백질 40g(36%) · 수분 500ml(22%)");
    expect(t).toContain("점심: 닭가슴살");
  });
});

describe("AI 답 읽기", () => {
  it("요약·잘한 점·고칠 점·내일 메뉴", () => {
    const fb = parseDietFeedback(
      '{"summary":"단백질이 부족해요.","good":["아침을 챙겼어요"],"fix":["단백질 40g 더"],"tomorrow":["그릭요거트","연어 샐러드","두부"," "]}',
    );
    expect(fb).toEqual({
      summary: "단백질이 부족해요.",
      good: ["아침을 챙겼어요"],
      fix: ["단백질 40g 더"],
      tomorrow: ["그릭요거트", "연어 샐러드", "두부"],
    });
  });

  it("고칠 점·내일 제안이 둘 다 없으면 믿지 않는다", () => {
    expect(parseDietFeedback('{"summary":"좋아요","good":["굿"]}')).toBeNull();
    expect(parseDietFeedback("모르겠어요")).toBeNull();
  });

  it("기기 보관 값 읽기", () => {
    expect(readStoredDiet("{bad")).toBeNull();
    expect(readStoredDiet(JSON.stringify({ summary: "s", good: [], fix: ["a"], tomorrow: [] }))?.fix).toEqual(["a"]);
  });
});
