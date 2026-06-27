import { describe, expect, it } from "vitest";

import {
  defaultsFor,
  getConditioningItem,
} from "@/features/routine/conditioning-catalog";
import { ALL_FOCUSES } from "@/features/routine/exercise-catalog";

// 유산소(체온 상승) 리드인으로 쓰는 항목들
const CARDIO = new Set([
  "running",
  "stair-master",
  "cycling",
  "rowing",
  "elliptical",
  "jump-rope",
  "walking",
  "jumping-jack",
]);

describe("컨디셔닝 추천 기본값 (퀄리티·종류)", () => {
  it("모든 부위 워밍업은 4개이고 유산소 리드인으로 시작한다", () => {
    for (const f of ALL_FOCUSES) {
      const w = defaultsFor(f, "warmup");
      expect(w.length, `${f} 워밍업 개수`).toBe(4);
      expect(CARDIO.has(w[0]), `${f} 첫 워밍업=${w[0]} 유산소`).toBe(true);
    }
  });

  it("모든 부위 마무리는 4개다", () => {
    for (const f of ALL_FOCUSES) {
      expect(defaultsFor(f, "cooldown").length, `${f} 마무리 개수`).toBe(4);
    }
  });

  it("추천 항목은 모두 해당 종류(warmup/cooldown)에 유효한 카탈로그 항목", () => {
    for (const f of ALL_FOCUSES) {
      for (const kind of ["warmup", "cooldown"] as const) {
        for (const id of defaultsFor(f, kind)) {
          const item = getConditioningItem(id);
          expect(item, `${id} 카탈로그 존재`).toBeTruthy();
          expect(item!.kinds.includes(kind), `${id} ∈ ${kind}`).toBe(true);
        }
      }
    }
  });

  it("같은 부위·종류에 중복 항목이 없다", () => {
    for (const f of ALL_FOCUSES) {
      for (const kind of ["warmup", "cooldown"] as const) {
        const ids = defaultsFor(f, kind);
        expect(new Set(ids).size, `${f}/${kind} 중복`).toBe(ids.length);
      }
    }
  });
});

describe("경사(incline) 파라미터는 실제 경사가 있는 기구만", () => {
  // 경사(slope %)는 트레드밀류(런닝·걷기)와 램프가 있는 일립티컬에만. 계단 머신·실내
  // 자전거는 경사가 없고 강도를 '속도(레벨/저항)'로 조절하므로 incline 을 두면 안 된다.
  const HAS_INCLINE = ["running", "walking", "elliptical"];
  const NO_INCLINE = ["stair-master", "cycling", "rowing", "jump-rope"];

  it.each(HAS_INCLINE)("%s 는 incline 파라미터가 있다", (id) => {
    expect(getConditioningItem(id)?.params).toContain("incline");
  });

  it.each(NO_INCLINE)("%s 는 incline 파라미터가 없다", (id) => {
    expect(getConditioningItem(id)?.params ?? []).not.toContain("incline");
  });
});

describe("비유산소 컨디셔닝은 시간 대신 세트/횟수", () => {
  // 유산소(런닝·사이클·머신류·줄넘기·점프잭)는 시간 기반, 그 외 모빌리티·스트레칭은 세트/횟수.
  const CARDIO_TIME = [
    "running",
    "cycling",
    "stair-master",
    "rowing",
    "elliptical",
    "walking",
    "jump-rope",
    "jumping-jack",
  ];
  const SETS_REPS = [
    "bw-squat",
    "dynamic-lunge",
    "shoulder-circle",
    "cat-cow",
    "band-pull-apart",
    "hamstring-stretch",
    "child-pose",
    "calf-stretch",
  ];

  it.each(CARDIO_TIME)("%s 는 시간(duration) 기반, 세트/횟수 없음", (id) => {
    const p = getConditioningItem(id)?.params ?? [];
    expect(p).toContain("duration");
    expect(p).not.toContain("sets");
    expect(p).not.toContain("reps");
  });

  it.each(SETS_REPS)("%s 는 세트/횟수 기반, 시간 없음", (id) => {
    const p = getConditioningItem(id)?.params ?? [];
    expect(p).toContain("sets");
    expect(p).toContain("reps");
    expect(p).not.toContain("duration");
  });
});
