import { describe, expect, it } from "vitest";

import {
  firstDayIndexForFocus,
  focusToDaysMap,
  routineDaySlots,
  type DayBlockId,
} from "@/features/routine/data";
import {
  getCatalogExercise,
  primaryBodyPart,
  sideExercisesForSlot,
} from "@/features/routine/exercise-catalog";

describe("routineDaySlots (일차별 부위 슬롯)", () => {
  it("PPL×2 프리셋은 같은 부위를 두 일차에 독립 슬롯으로 둔다", () => {
    // ppl-6: [PUSH, PULL, LEG, PUSH, PULL, LEG, REST]
    const slots = routineDaySlots(6, "ppl-6", null);
    const map = focusToDaysMap(slots);
    expect(map.get("push")).toEqual([0, 3]);
    expect(map.get("pull")).toEqual([1, 4]);
    expect(map.get("lower")).toEqual([2, 5]);
    // 단일 블록 일자는 모두 주(主) — 보조 아님
    expect(slots.every((s) => s.isSide === false)).toBe(true);
  });

  it("firstDayIndexForFocus 는 그 부위를 처음 쓰는 일차", () => {
    const slots = routineDaySlots(6, "ppl-6", null);
    expect(firstDayIndexForFocus(slots, "push")).toBe(0);
    expect(firstDayIndexForFocus(slots, "lower")).toBe(2);
    expect(firstDayIndexForFocus(slots, "chest")).toBeNull();
  });

  it("멀티블록 커스텀: 첫 블록=주, 나머지=보조", () => {
    const week: DayBlockId[][] = [
      ["chest", "triceps"],
      ["back", "biceps"],
      ["rest"],
      ["lower"],
      ["rest"],
      ["rest"],
      ["rest"],
    ];
    const slots = routineDaySlots(0, "custom", week);
    const day0 = slots.filter((s) => s.dayIndex === 0);
    expect(day0).toHaveLength(2);
    expect(day0[0]).toMatchObject({ focus: "chest", isSide: false });
    // 삼두 블록은 arm 톤으로 저장되지만 blockIds 로 구분 유지
    expect(day0[1]).toMatchObject({
      focus: "arm",
      isSide: true,
      blockIds: ["triceps"],
    });
    const day1 = slots.filter((s) => s.dayIndex === 1);
    expect(day1[1]).toMatchObject({ focus: "arm", blockIds: ["biceps"] });
  });

  it("같은 일차의 이두+삼두는 arm 한 슬롯으로 합쳐진다", () => {
    const week: DayBlockId[][] = [
      ["chest", "biceps", "triceps"],
      ...(Array(6).fill(["rest"]) as DayBlockId[][]),
    ];
    const slots = routineDaySlots(0, "custom", week);
    const armSlot = slots.find((s) => s.dayIndex === 0 && s.focus === "arm");
    expect(armSlot?.blockIds).toEqual(["biceps", "triceps"]);
  });
});

describe("sideExercisesForSlot (보조 볼륨)", () => {
  it("이두/삼두 블록은 각자 맞는 2개를 고른다", () => {
    const bi = sideExercisesForSlot("arm", ["biceps"]).map((e) => e.id);
    expect(bi).toEqual(["biceps-curl", "hammer-curl"]);
    const tri = sideExercisesForSlot("arm", ["triceps"]).map((e) => e.id);
    expect(tri).toEqual(["triceps-pushdown", "skull-crusher"]);
  });

  it("이두+삼두 합쳐지면 4개", () => {
    const both = sideExercisesForSlot("arm", ["biceps", "triceps"]);
    expect(both).toHaveLength(4);
  });

  it("일반 부위 사이드는 2개", () => {
    expect(sideExercisesForSlot("chest", ["chest"])).toHaveLength(2);
    expect(sideExercisesForSlot("back", ["back"])).toHaveLength(2);
  });
});

describe("카탈로그 신규 운동 (헬스장 단골)", () => {
  it("롱풀·체스트서포티드로우·어시스티드풀업은 등 운동", () => {
    expect(getCatalogExercise("low-row-machine")?.name).toBe("롱풀");
    expect(primaryBodyPart("low-row-machine")).toBe("back");
    expect(primaryBodyPart("chest-supported-row")).toBe("back");
    expect(primaryBodyPart("assisted-pull-up")).toBe("back");
  });

  it("스탠딩 케이블 컬=팔, 케이블 풀스루=하체", () => {
    expect(primaryBodyPart("standing-cable-curl")).toBe("arm");
    expect(primaryBodyPart("cable-pull-through")).toBe("lower");
  });

  it("이너타이/아웃타이가 헬스장 명칭으로 노출된다", () => {
    expect(getCatalogExercise("hip-adduction")?.name).toContain("이너타이");
    expect(getCatalogExercise("hip-abduction")?.name).toContain("아웃타이");
    expect(primaryBodyPart("hip-abduction")).toBe("lower");
  });
});
