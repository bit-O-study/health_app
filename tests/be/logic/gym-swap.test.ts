import { describe, expect, it } from "vitest";

import { euro, gymSwapFor, iGa, muscleOverlap } from "@/features/routine-share/gym-swap";
import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { stimulusFor } from "@/features/routine/exercise-stimulus";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";

const stimOf = (id: string) => stimulusFor(id, subMuscleWeightsForExercise(id).map((w) => ({ id: w.sub.id, weight: w.weight })));
const swap = (id: string, eq: string, gym: string[] | null) => gymSwapFor(id, eq, gym ? new Set(gym) : null, ALL_EXERCISES, primaryBodyPart, stimOf);

describe("남의 루틴 — 내 헬스장에 없는 기구는 무엇으로(2026-10-08)", () => {
  it("헬스장을 등록하지 않았거나 그 기구가 있으면 말하지 않는다", () => {
    expect(swap("bench-press", "barbell", null)).toEqual({ kind: "ok" });
    expect(swap("bench-press", "barbell", ["barbell", "dumbbell"])).toEqual({ kind: "ok" });
  });

  it("같은 운동을 다른 기구로 할 수 있으면 그게 먼저 — 바벨 없는 헬스장의 벤치프레스는 덤벨로", () => {
    const s = swap("bench-press", "barbell", ["dumbbell", "cable"]);
    expect(s.kind).toBe("other-equipment");
  });

  it("그 운동 자체를 못 하면 같은 부위·같은 근육을 많이 쓰는 운동 — 헬스장 기구로만(랫풀다운 → 풀업 · 원암 덤벨 로우)", () => {
    const s = swap("lat-pulldown", "machine", ["dumbbell"]);
    if (s.kind !== "replace") throw new Error(`expected replace, got ${s.kind}`);
    expect(s.options.length).toBeGreaterThan(0);
    for (const o of s.options) {
      expect(primaryBodyPart(o.exerciseId)).toBe("back");
      expect(["dumbbell", "bodyweight"]).toContain(o.equipment); // 맨몸(풀업 등)은 기구가 필요 없어 늘 가능
      expect(o.overlapPct).toBeGreaterThanOrEqual(40);
    }
  });

  it("겹침 — 같은 근육 몫이 겹치는 비율", () => {
    expect(muscleOverlap({ a: 0.5, b: 0.5 }, { a: 0.5, c: 0.5 })).toBe(0.5);
    expect(muscleOverlap({}, { a: 1 })).toBe(0);
  });

  it("조사 — 바벨이·머신이 · 덤벨로·머신으로·케이블로", () => {
    expect([iGa("바벨"), iGa("머신"), iGa("덤벨")]).toEqual(["이", "이", "이"]);
    expect([iGa("케이블"), iGa("스미스")]).toEqual(["이", "가"]);
    expect([euro("덤벨"), euro("머신"), euro("케이블"), euro("스미스")]).toEqual(["로", "으로", "로", "로"]);
  });
});
