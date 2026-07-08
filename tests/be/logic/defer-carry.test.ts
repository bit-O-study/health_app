import { describe, expect, it } from "vitest";

import { conditioningUnion, type CondItem } from "@/features/routine/defer-carry";

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
