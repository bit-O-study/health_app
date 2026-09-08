import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { EXERCISES } from "@/features/routine/exercise-catalog";
import {
  focusExercisesForSlot,
  recommendedExercisesForFocus,
  sideExercisesForSlot,
} from "@/features/routine/recommend";
import {
  isExerciseAvailable,
  keepAvailableExercises,
  pickAvailableEquipment,
} from "@/features/gym/gym-equipment-mapping";

/** 프리웨이트만 있는 헬스장 — 케이블·머신이 하나도 없다. */
const FREE_WEIGHT_GYM: ReadonlySet<string> = new Set([
  "barbell",
  "dumbbell",
  "bench_flat",
  "bench_incline",
  "squat_rack",
  "pullup_bar",
]);

const FOCUSES = ["chest", "back", "shoulder", "lower", "arm"] as const;

describe("헬스장 기구를 반영한 운동 추천", () => {
  it("미설정(null)이면 예전과 똑같이 추천한다", () => {
    for (const focus of FOCUSES) {
      expect(focusExercisesForSlot(focus, [], "male", null).map((e) => e.id)).toEqual(
        focusExercisesForSlot(focus, [], "male").map((e) => e.id),
      );
    }
  });

  it("추천된 운동은 전부 그 헬스장에서 할 수 있다", () => {
    for (const focus of FOCUSES) {
      const list = focusExercisesForSlot(focus, [], "male", FREE_WEIGHT_GYM);
      expect(list.length).toBeGreaterThan(0);
      for (const ex of list) {
        expect(isExerciseAvailable(ex, FREE_WEIGHT_GYM)).toBe(true);
      }
    }
  });

  it("케이블 전용 운동은 프리웨이트 헬스장 추천에서 빠진다", () => {
    // face-pull 은 기구 옵션이 케이블 하나뿐이다.
    expect(EXERCISES["face-pull"].equipments.map((q) => q.equipment)).toEqual([
      "cable",
    ]);
    const all = focusExercisesForSlot("shoulder", [], "male").map((e) => e.id);
    const free = focusExercisesForSlot("shoulder", [], "male", FREE_WEIGHT_GYM).map(
      (e) => e.id,
    );
    expect(all).toContain("face-pull");
    expect(free).not.toContain("face-pull");
  });

  it("빠진 자리는 다른 운동이 메운다 — 추천 개수가 줄지 않는다", () => {
    // 머신 전용(leg-press·hip-adduction)이 빠져도 하체 추천은 그대로 4개.
    const all = focusExercisesForSlot("lower", [], "male");
    const free = focusExercisesForSlot("lower", [], "male", FREE_WEIGHT_GYM);
    expect(free.map((e) => e.id)).not.toContain("leg-press");
    expect(free.length).toBe(all.length);
  });

  it("세부근육 블록은 블록별로 걸러 균형을 지킨다", () => {
    // 이두+삼두를 같이 고르면, 기구가 부족해도 한쪽이 슬롯을 독식하면 안 된다.
    const ids = focusExercisesForSlot(
      "arm",
      ["biceps", "triceps"],
      "male",
      FREE_WEIGHT_GYM,
    ).map((e) => e.id);
    const biceps = ids.filter((id) => id.includes("curl"));
    const triceps = ids.filter((id) => id.includes("triceps") || id.includes("skull"));
    expect(biceps.length).toBeGreaterThan(0);
    expect(triceps.length).toBeGreaterThan(0);
  });

  it("보조(사이드) 슬롯도 헬스장을 본다", () => {
    for (const focus of FOCUSES) {
      for (const ex of sideExercisesForSlot(focus, [], "male", FREE_WEIGHT_GYM)) {
        expect(isExerciseAvailable(ex, FREE_WEIGHT_GYM)).toBe(true);
      }
    }
  });

  it("부위만으로 하는 추천(오늘만 부위 바꾸기)도 헬스장을 본다", () => {
    // 기구를 하나도 안 고른 헬스장에는 맨몸 운동만 남는다.
    const none = recommendedExercisesForFocus("chest", "male", new Set());
    expect(none.length).toBeGreaterThan(0);
    for (const ex of none) {
      expect(ex.equipments.some((q) => q.equipment === "bodyweight")).toBe(true);
    }
  });
});

describe("keepAvailableExercises / pickAvailableEquipment", () => {
  it("전부 걸러지면 원본을 그대로 쓴다 — 빈 추천을 만들지 않는다", () => {
    const machineOnly = [EXERCISES["leg-press"], EXERCISES["hip-adduction"]];
    expect(machineOnly.every((ex) => ex.equipments.every((q) => q.equipment === "machine"))).toBe(
      true,
    );
    expect(keepAvailableExercises(machineOnly, new Set()).map((e) => e.id)).toEqual(
      machineOnly.map((e) => e.id),
    );
  });

  it("미설정(null)이면 목록을 그대로 돌려준다", () => {
    const list = [EXERCISES["bench-press"], EXERCISES["face-pull"]];
    expect(keepAvailableExercises(list, null).map((e) => e.id)).toEqual([
      "bench-press",
      "face-pull",
    ]);
  });

  it("기구는 헬스장에 있는 첫 옵션으로 고른다", () => {
    const fly = EXERCISES["chest-fly"]; // [dumbbell, cable, machine]
    expect(pickAvailableEquipment(fly, null)).toBe("dumbbell");
    expect(pickAvailableEquipment(fly, new Set(["cable_dual"]))).toBe("cable");
    expect(pickAvailableEquipment(fly, new Set(["leg_press"]))).toBe("machine");
    // 하나도 없으면 카탈로그 기본값(첫 번째) — 화면이 빈칸이 되지 않게.
    expect(pickAvailableEquipment(fly, new Set())).toBe("dumbbell");
  });

  it("기구 옵션이 하나라도 되면 할 수 있는 운동이다", () => {
    const bench = EXERCISES["bench-press"]; // [barbell, dumbbell, machine]
    expect(isExerciseAvailable(bench, new Set(["dumbbell"]))).toBe(true);
    expect(isExerciseAvailable(bench, new Set(["treadmill"]))).toBe(false);
    expect(isExerciseAvailable(bench, null)).toBe(true);
  });
});

/**
 * 🔴 추천 경로가 여러 개다. 한 곳만 고치면 그 문으로 들어온 사용자에겐 헬스장이
 * 반영되지 않는데, 화면은 멀쩡해 보여서 아무도 모른다.
 */
describe("추천 호출부는 전부 헬스장을 넘긴다", () => {
  const CALLERS = [
    "src/features/routine/actions.ts",
    "src/features/routine/plan-actions.ts",
    "src/features/routine/slot-exercise-actions.ts",
  ];

  it.each(CALLERS)("%s", (file) => {
    const text = readFileSync(file, "utf8");
    // import 문은 `(` 가 없어 매치되지 않는다 — 실제 호출만 남는다.
    const calls = [
      ...text.matchAll(
        /(focusExercisesForSlot|sideExercisesForSlot|recommendedExercisesForFocus)\(([^)]*)\)/g,
      ),
    ];
    expect(calls.length).toBeGreaterThan(0);
    for (const [, fn, args] of calls) {
      expect(
        /gym/i.test(args),
        `${file} 의 ${fn}(${args.replace(/\s+/g, " ").trim()}) 가 헬스장을 안 넘긴다`,
      ).toBe(true);
    }
  });
});
