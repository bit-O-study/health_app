import { describe, expect, it } from "vitest";

import {
  conditioningUnion,
  shouldAdvanceStartDate,
  todayFocuses,
  type CondItem,
} from "@/features/routine/defer-carry";

const w = (itemId: string): CondItem => ({
  itemId,
  durationMin: 5,
  speed: null,
  incline: null,
  sets: null,
  reps: null,
});

describe("conditioningUnion — 오늘 전 부위 워밍업/마무리 합집합(이월용)", () => {
  it("여러 부위의 워밍업을 등장순서로 합치고 itemId 중복은 제거", () => {
    const r = conditioningUnion([
      { warmup: [w("treadmill"), w("arm-swing")], cooldown: [w("stretch")] },
      { warmup: [w("treadmill"), w("cat-cow")], cooldown: [w("stretch")] },
    ]);
    expect(r.warmup.map((i) => i.itemId)).toEqual([
      "treadmill",
      "arm-swing",
      "cat-cow",
    ]);
    expect(r.cooldown.map((i) => i.itemId)).toEqual(["stretch"]);
  });

  it("빈 입력 → 빈 합집합", () => {
    expect(conditioningUnion([])).toEqual({ warmup: [], cooldown: [] });
    expect(
      conditioningUnion([{ warmup: [], cooldown: [] }]),
    ).toEqual({ warmup: [], cooldown: [] });
  });

  it("한 부위만이면 그대로(중복 없음)", () => {
    const r = conditioningUnion([
      { warmup: [w("a"), w("b")], cooldown: [w("c")] },
    ]);
    expect(r.warmup.map((i) => i.itemId)).toEqual(["a", "b"]);
    expect(r.cooldown.map((i) => i.itemId)).toEqual(["c"]);
  });
});

describe("todayFocuses — 오늘 부위 = 루틴 ∪ daily_plan(합집합)", () => {
  it("daily override 없으면 루틴 부위 그대로", () => {
    expect(todayFocuses(["chest", "back"], [])).toEqual(["chest", "back"]);
  });

  it("부위 추가: 루틴 부위 + 추가 부위 (원래 부위 안 사라짐)", () => {
    // '부위 추가' 로 shoulder 를 더함 — 루틴(chest, back)이 유지돼야 한다.
    expect(todayFocuses(["chest", "back"], ["shoulder"])).toEqual([
      "chest",
      "back",
      "shoulder",
    ]);
  });

  it("pin 이 원래 부위를 일부만 옮겨도(back 누락) 루틴 쪽에서 살아남는다", () => {
    // daily_plan 엔 chest(핀됨)+shoulder(추가)만 있고 back 은 핀 실패로 빠진 상황.
    // 예전 '대체' 로직이면 back 이 사라졌지만, 합집합이면 유지된다. ← 이 버그 재현/회귀.
    expect(todayFocuses(["chest", "back"], ["chest", "shoulder"])).toEqual([
      "chest",
      "back",
      "shoulder",
    ]);
  });

  it("전체 바꾸기(replace): 오늘 defer 로 routineFocuses=[] → 선택 부위만", () => {
    expect(todayFocuses([], ["legs"])).toEqual(["legs"]);
  });

  it('"rest" 는 양쪽 모두에서 제외', () => {
    expect(todayFocuses(["chest", "rest"], ["rest", "arm"])).toEqual([
      "chest",
      "arm",
    ]);
  });

  it("중복 부위는 한 번만(등장 순서 유지)", () => {
    expect(todayFocuses(["chest", "back"], ["back", "chest"])).toEqual([
      "chest",
      "back",
    ]);
  });
});

describe("shouldAdvanceStartDate — 오늘만 변경 시 루틴 하루 밀기 가드", () => {
  it("오늘 아직 안 밀렸으면 +1 한다(true)", () => {
    expect(shouldAdvanceStartDate(null, "2026-07-13")).toBe(true);
    expect(shouldAdvanceStartDate("2026-07-12", "2026-07-13")).toBe(true);
  });

  it("오늘 이미 밀렸으면 다시 안 민다(false) — 같은 날 재호출 이중 밀기 방지", () => {
    expect(shouldAdvanceStartDate("2026-07-13", "2026-07-13")).toBe(false);
  });
});
