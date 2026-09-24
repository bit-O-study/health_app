import { describe, expect, it } from "vitest";

import {
  DEFAULTS,
  GROUP_LABELS,
  SET_SCHEMES,
  SET_SCHEME_LABELS,
  expandSets,
  groupKindFor,
  isSetScheme,
  plannedVolumeKg,
  roundToPlate,
  toSetScheme,
  type PlannedSet,
} from "@/features/routine/set-scheme";

/**
 * 세트 방식(드롭·피라미드·탑세트/백오프 등) 펼치기.
 * 루틴 한 줄(세트·횟수·무게 + 스킴)이 **실제 수행할 세트 목록**으로 어떻게 풀리는지.
 */

const weights = (sets: PlannedSet[]) => sets.map((s) => s.weightKg);
const reps = (sets: PlannedSet[]) => sets.map((s) => s.reps);

describe("roundToPlate", () => {
  it("원판 단위로 맞춘다", () => {
    expect(roundToPlate(60.9, 2.5)).toBe(60);
    expect(roundToPlate(61.9, 2.5)).toBe(62.5);
    expect(roundToPlate(47, 5)).toBe(45);
  });

  it("단위 아래로는 내려가지 않는다(0kg·음수 제안 방지)", () => {
    expect(roundToPlate(0.4, 2.5)).toBe(2.5);
    expect(roundToPlate(-10, 2.5)).toBe(2.5);
  });

  it("부동소수 찌꺼기를 남기지 않는다", () => {
    expect(roundToPlate(80 * 0.8, 2.5)).toBe(65);
    expect(roundToPlate(30 * 0.9, 1)).toBe(27);
  });
});

describe("expandSets — 일반·AMRAP", () => {
  it("일반은 같은 무게로 N세트, 마지막 뒤엔 쉬지 않는다", () => {
    const sets = expandSets({ scheme: "straight", sets: 3, reps: 10, weightKg: 60 });
    expect(sets).toHaveLength(3);
    expect(weights(sets)).toEqual([60, 60, 60]);
    expect(reps(sets)).toEqual([10, 10, 10]);
    expect(sets.map((s) => s.restSec)).toEqual([DEFAULTS.restSec, DEFAULTS.restSec, 0]);
    expect(sets.map((s) => s.index)).toEqual([1, 2, 3]);
  });

  it("맨몸은 무게 없이 횟수만", () => {
    const sets = expandSets({ scheme: "straight", sets: 2, reps: 15, weightKg: null });
    expect(weights(sets)).toEqual([null, null]);
  });

  it("AMRAP 은 마지막 세트만 '가능한 만큼'", () => {
    const sets = expandSets({ scheme: "amrap", sets: 3, reps: 8, weightKg: 40 });
    expect(sets).toHaveLength(3);
    expect(sets.slice(0, 2).every((s) => !s.amrap)).toBe(true);
    expect(sets[2].amrap).toBe(true);
    expect(sets[2].reps).toBeNull();
  });
});

describe("expandSets — 드롭세트", () => {
  it("작업 세트 뒤에 무게를 낮춘 드롭이 붙는다", () => {
    const sets = expandSets({
      scheme: "drop",
      sets: 2,
      reps: 10,
      weightKg: 100,
      params: { dropCount: 2, dropPct: 20 },
    });
    // 작업 2세트 + 드롭 2
    expect(sets).toHaveLength(4);
    expect(weights(sets)).toEqual([100, 100, 80, 65]); // 100 → 80 → 64 → 원판 65
    expect(sets[2].kind).toBe("drop");
  });

  it("드롭 사이에는 쉬지 않는다 — 그게 드롭세트의 전부다", () => {
    const sets = expandSets({ scheme: "drop", sets: 1, reps: 10, weightKg: 50 });
    expect(sets.every((s) => s.restSec === 0)).toBe(true);
  });
});

describe("expandSets — 피라미드", () => {
  it("피라미드는 무게가 오르고 횟수가 준다", () => {
    const sets = expandSets({
      scheme: "pyramid",
      sets: 3,
      reps: 12,
      weightKg: 50,
      params: { stepPct: 10, stepReps: 2 },
    });
    expect(weights(sets)).toEqual([50, 55, 60]);
    expect(reps(sets)).toEqual([12, 10, 8]);
  });

  it("역피라미드는 첫 세트가 가장 무겁고 횟수가 는다", () => {
    const sets = expandSets({
      scheme: "reverse_pyramid",
      sets: 3,
      reps: 6,
      weightKg: 100,
      params: { stepPct: 10, stepReps: 2 },
    });
    expect(weights(sets)).toEqual([100, 90, 80]);
    expect(reps(sets)).toEqual([6, 8, 10]);
  });

  it("횟수는 1 밑으로 내려가지 않는다", () => {
    const sets = expandSets({
      scheme: "pyramid",
      sets: 5,
      reps: 5,
      weightKg: 40,
      params: { stepReps: 3 },
    });
    expect(Math.min(...sets.map((s) => s.reps ?? 0))).toBeGreaterThanOrEqual(1);
  });
});

describe("expandSets — 탑세트 + 백오프", () => {
  it("탑세트 한 번 뒤에 가벼운 백오프가 이어진다", () => {
    const sets = expandSets({
      scheme: "top_backoff",
      sets: 3,
      reps: 5,
      weightKg: 120,
      params: { backoffSets: 2, dropPct: 10, stepReps: 3 },
    });
    expect(sets.map((s) => s.kind)).toEqual(["top", "backoff", "backoff"]);
    expect(weights(sets)).toEqual([120, 107.5, 107.5]);
    // 무게를 낮췄으니 횟수는 늘려 잡는다.
    expect(reps(sets)).toEqual([5, 8, 8]);
  });

  it("탑세트 무게를 따로 정하면 그걸 쓴다", () => {
    const sets = expandSets({
      scheme: "top_backoff",
      sets: 2,
      reps: 3,
      weightKg: 100,
      params: { topWeightKg: 140, backoffSets: 1, dropPct: 20 },
    });
    expect(sets[0].weightKg).toBe(140);
    expect(sets[1].weightKg).toBe(112.5);
  });
});

describe("expandSets — 클러스터·레스트포즈", () => {
  it("클러스터는 한 세트를 덩어리로 쪼개고 사이엔 짧게 쉰다", () => {
    const sets = expandSets({
      scheme: "cluster",
      sets: 2,
      reps: 6,
      weightKg: 80,
      params: { clusterReps: 3, shortRestSec: 20 },
    });
    // 세트당 2덩어리 × 2세트
    expect(sets).toHaveLength(4);
    expect(reps(sets)).toEqual([3, 3, 3, 3]);
    expect(sets[0].restSec).toBe(20); // 덩어리 사이 = 짧게
    expect(sets[1].restSec).toBe(DEFAULTS.restSec); // 세트 사이 = 정상
    expect(sets[3].restSec).toBe(0); // 마지막
  });

  it("나누어떨어지지 않으면 마지막 덩어리가 짧다", () => {
    const sets = expandSets({
      scheme: "cluster",
      sets: 1,
      reps: 7,
      weightKg: 60,
      params: { clusterReps: 3 },
    });
    expect(reps(sets)).toEqual([3, 3, 1]);
  });

  it("레스트-포즈는 작업 세트 뒤에 '가능한 만큼'을 붙인다", () => {
    const sets = expandSets({
      scheme: "rest_pause",
      sets: 1,
      reps: 10,
      weightKg: 40,
      params: { pauseCount: 2 },
    });
    expect(sets).toHaveLength(3);
    expect(sets.slice(1).every((s) => s.amrap)).toBe(true);
    expect(sets[1].kind).toBe("rest_pause");
  });
});

describe("plannedVolumeKg", () => {
  it("세트별 무게×횟수를 더한다 — 드롭세트도 볼륨에 들어간다", () => {
    const sets = expandSets({
      scheme: "drop",
      sets: 1,
      reps: 10,
      weightKg: 100,
      params: { dropCount: 1, dropPct: 20 },
    });
    // 100×10 + 80×10
    expect(plannedVolumeKg(sets)).toBe(1800);
  });

  it("맨몸·AMRAP 은 0으로 센다(실제 기록으로 다시 계산)", () => {
    expect(
      plannedVolumeKg(expandSets({ scheme: "straight", sets: 3, reps: 10, weightKg: null })),
    ).toBe(0);
  });
});

describe("스킴 이름 방어 · 묶음", () => {
  it("모든 스킴에 이름과 설명이 있다", () => {
    for (const s of SET_SCHEMES) {
      expect(SET_SCHEME_LABELS[s].name.length).toBeGreaterThan(0);
      expect(SET_SCHEME_LABELS[s].hint.length).toBeGreaterThan(0);
    }
  });

  it("모르는 값은 일반 세트로 떨어진다 — 옛 데이터는 전부 스트레이트였다", () => {
    expect(isSetScheme("drop")).toBe(true);
    expect(isSetScheme("nope")).toBe(false);
    expect(toSetScheme(null)).toBe("straight");
    expect(toSetScheme("pyramid")).toBe("pyramid");
  });

  it("묶음 종류는 운동 수로 정해진다", () => {
    expect(groupKindFor(1)).toBeNull();
    expect(groupKindFor(2)).toBe("superset");
    expect(groupKindFor(3)).toBe("triset");
    expect(groupKindFor(5)).toBe("giant");
    expect(GROUP_LABELS.superset).toBe("슈퍼세트");
  });
});
