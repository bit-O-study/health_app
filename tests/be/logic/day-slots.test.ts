import { describe, expect, it } from "vitest";

import {
  DAY_BLOCKS,
  firstDayIndexForFocus,
  focusToDaysMap,
  isDayBlockId,
  MUSCLE_BLOCK_GROUPS,
  routineDaySlots,
  type DayBlockId,
} from "@/features/routine/data";
import {
  exercisesForFocus,
  focusExercisesForSlot,
  getCatalogExercise,
  majorMuscleTag,
  primaryBodyPart,
  sideExercisesForSlot,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";

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

describe("focusExercisesForSlot (주 슬롯 추천 — 이두/삼두 분리)", () => {
  // 버그: 이두 블록만 추가해도 exercisesForFocus("arm") 가 이두·삼두 섞인 목록을
  // 줘서 삼두(triceps-pushdown)가 따라 들어왔다. focusExercisesForSlot 는 블록을
  // 보고 그 근육 전용 운동만 준다.
  it("이두 주(主) 블록은 이두 운동만 추천 — 삼두가 섞이지 않는다", () => {
    const ids = focusExercisesForSlot("arm", ["biceps"]).map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("triceps-pushdown");
    expect(ids).not.toContain("skull-crusher");
    for (const id of ids) {
      const subs = subMusclesForExercise(id).map((s) => s.id);
      // 이두/전완 세부근육만, 삼두 세부근육은 없어야 한다
      expect(
        subs.some((s) => s.startsWith("arm-biceps") || s === "arm-forearm"),
      ).toBe(true);
      expect(subs.some((s) => s.startsWith("arm-triceps"))).toBe(false);
    }
  });

  it("삼두 주(主) 블록은 삼두 운동만 추천 — 이두가 섞이지 않는다", () => {
    const ids = focusExercisesForSlot("arm", ["triceps"]).map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("biceps-curl");
    expect(ids).not.toContain("hammer-curl");
    for (const id of ids) {
      const subs = subMusclesForExercise(id).map((s) => s.id);
      expect(subs.some((s) => s.startsWith("arm-triceps"))).toBe(true);
      expect(subs.some((s) => s.startsWith("arm-biceps"))).toBe(false);
    }
  });

  it("세부 블록이 아닌 부위(가슴)는 부위 기본 추천을 그대로 쓴다", () => {
    expect(focusExercisesForSlot("chest", ["chest"]).map((e) => e.id)).toEqual(
      exercisesForFocus("chest").map((e) => e.id),
    );
  });

  it("blockIds 가 비면 부위 기본 추천으로 폴백", () => {
    expect(focusExercisesForSlot("arm", []).map((e) => e.id)).toEqual(
      exercisesForFocus("arm").map((e) => e.id),
    );
  });
});

describe("보조운동 세부근육 세분화 + 추천 개수 캡", () => {
  const FOCUSES: FocusKey[] = [
    "chest",
    "back",
    "shoulder",
    "arm",
    "lower",
    "core",
  ];

  it("시스템 추천 보조운동은 한 블록당 최대 2개 (수동 추가는 별개)", () => {
    for (const f of FOCUSES) {
      expect(sideExercisesForSlot(f, [f]).length).toBeLessThanOrEqual(2);
    }
  });

  it("각 부위 보조운동은 서로 다른 세부근육을 타깃한다(근육 세분화)", () => {
    for (const f of FOCUSES) {
      const picks = sideExercisesForSlot(f, [f]);
      const primarySubs = picks.map((e) => subMusclesForExercise(e.id)[0]?.id);
      // 대표(첫) 세부근육이 모두 달라야 한다 — 같은 근육에 중복 추천 금지
      expect(new Set(primarySubs).size).toBe(picks.length);
    }
  });

  it("이두+삼두 보조는 합쳐 4개이고 세부근육이 모두 다르다", () => {
    const picks = sideExercisesForSlot("arm", ["biceps", "triceps"]);
    expect(picks).toHaveLength(4);
    const subs = picks.map((e) => subMusclesForExercise(e.id)[0]?.id);
    expect(new Set(subs).size).toBe(4);
  });
});

describe("세부근육 블록 (전 부위 세분화 — 루틴 빌더)", () => {
  it("MUSCLE_BLOCK_GROUPS 의 모든 블록 id 가 유효한 DayBlockId", () => {
    for (const g of MUSCLE_BLOCK_GROUPS) {
      expect(isDayBlockId(g.whole)).toBe(true);
      for (const s of g.subs) expect(isDayBlockId(s)).toBe(true);
    }
  });

  it("가슴 상부 보조는 상부 전용 2개 (하부·삼두 안 섞임)", () => {
    expect(sideExercisesForSlot("chest", ["chest-upper"]).map((e) => e.id)).toEqual(
      ["incline-press", "incline-cable-fly"],
    );
  });

  it("세부근육 주(主) 슬롯은 그 근육 운동만 — 대퇴사두에 햄스트링 안 섞임", () => {
    const ids = focusExercisesForSlot("lower", ["lower-quads"]).map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("leg-curl");
    expect(ids).not.toContain("rdl");
  });

  it("모든 세부근육 블록의 보조 추천은 정확히 2개", () => {
    for (const g of MUSCLE_BLOCK_GROUPS) {
      for (const s of g.subs) {
        const tone = DAY_BLOCKS[s].day.tone as FocusKey;
        expect(sideExercisesForSlot(tone, [s]).length).toBe(2);
      }
    }
  });

  it("같은 일차의 '가슴 전체 + 가슴 상부'는 chest 한 슬롯으로 합쳐진다", () => {
    const week: DayBlockId[][] = [
      ["chest", "chest-upper"],
      ...(Array(6).fill(["rest"]) as DayBlockId[][]),
    ];
    const slots = routineDaySlots(0, "custom", week);
    const chest = slots.filter(
      (s) => s.dayIndex === 0 && s.focus === "chest",
    );
    expect(chest).toHaveLength(1);
    expect(chest[0].blockIds).toEqual(["chest", "chest-upper"]);
  });
});

describe("majorMuscleTag (대근육 태그 1개 — 전신 판정)", () => {
  it("벤치프레스=가슴, 바벨컬=팔 (상체만 쓰는 운동은 1차 부위)", () => {
    expect(majorMuscleTag("bench-press").label).toBe("가슴");
    expect(majorMuscleTag("biceps-curl").label).toBe("팔");
    expect(majorMuscleTag("triceps-pushdown").label).toBe("팔");
    expect(majorMuscleTag("barbell-row").label).toBe("등");
  });

  it("데드리프트=전신 (상체+하체 동시 사용)", () => {
    expect(majorMuscleTag("deadlift").label).toBe("전신");
  });

  it("스쿼트=하체, 플랭크=코어 (하체+코어만이면 전신 아님)", () => {
    expect(majorMuscleTag("squat").label).toBe("하체");
    expect(majorMuscleTag("plank").label).toBe("코어");
  });

  it("태그는 항상 1개 — label 과 tone 을 돌려준다", () => {
    const t = majorMuscleTag("bench-press");
    expect(typeof t.label).toBe("string");
    expect(t.tone.length).toBeGreaterThan(0);
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
