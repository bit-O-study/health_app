import { describe, expect, it } from "vitest";

import { draftNeedsSync, draftText, parseDraft } from "@/features/commitments/number-draft";
import { overloadPlan, usualReps } from "@/features/routine/overload";
import type { ProgressRecord } from "@/features/routine/progress";
import {
  recordedSetDetails,
  SCRUB_DEAD_PX,
  SCRUB_PX_PER_STEP,
  scrubSteps,
  setValueAt,
} from "@/features/workout-timer/set-target";

const PYRAMID = [
  { weightKg: 60, reps: 12 },
  { weightKg: 70, reps: 10 },
  { weightKg: 80, reps: 8 },
];

describe("운동모드 · 지금 세트의 무게·횟수(2026-10-14)", () => {
  it("세트별 계획이 없으면 칸의 값 그대로 — 45kg 로 바꿨으면 45kg(계획의 80kg 이 아니다)", () => {
    expect(setValueAt(0, null, { w: 45, reps: 13 })).toEqual({ w: 45, reps: 13 });
    expect(setValueAt(2, [], { w: 45, reps: 13 })).toEqual({ w: 45, reps: 13 });
  });

  it("피라미드는 세트마다 다른 값 — 모든 세트가 같은 횟수로 보이지 않는다", () => {
    const flat = { w: 60, reps: 10 };
    expect([0, 1, 2].map((i) => setValueAt(i, PYRAMID, flat))).toEqual([
      { w: 60, reps: 12 },
      { w: 70, reps: 10 },
      { w: 80, reps: 8 },
    ]);
    // 세트를 계획보다 늘리면 마지막 세트의 값을 이어 쓴다.
    expect(setValueAt(4, PYRAMID, flat)).toEqual({ w: 80, reps: 8 });
  });

  it("운동모드에서 한 세트만 고치면 그 세트만 바뀌고, 기록에도 세트별로 남는다", () => {
    const bySet = { "1": { w: 65, reps: 11 } };
    expect(setValueAt(1, PYRAMID, { w: 60, reps: 10 }, bySet)).toEqual({ w: 65, reps: 11 });
    expect(recordedSetDetails(3, PYRAMID, { w: 60, reps: 10 }, bySet)).toEqual([
      { weightKg: 60, reps: 12 },
      { weightKg: 65, reps: 11 },
      { weightKg: 80, reps: 8 },
    ]);
    // 균일 세트는 세트별로 남기지 않는다(예전과 같다).
    expect(recordedSetDetails(4, null, { w: 45, reps: 12 })).toBeNull();
  });
});

describe("값 끌기 — 스친 손짓으로 무게가 튀지 않게(2026-10-14)", () => {
  it("조금 움직인 건 끌기가 아니다", () => {
    expect(scrubSteps(SCRUB_DEAD_PX - 1, 0, false)).toBe("wait");
    expect(scrubSteps(-8, 3, false)).toBe("wait");
  });

  it("위아래로 민 손짓은 값을 바꾸지 않는다", () => {
    expect(scrubSteps(6, SCRUB_DEAD_PX + 10, false)).toBe("cancel");
  });

  it("옆으로 충분히 끌면 그때부터 — 그 자리가 0이라 값이 한꺼번에 튀지 않는다", () => {
    expect(scrubSteps(SCRUB_DEAD_PX + 60, 4, false)).toBe(0);
    expect(scrubSteps(SCRUB_PX_PER_STEP * 2, 0, true)).toBe(2);
    expect(scrubSteps(-SCRUB_PX_PER_STEP * 3, 30, true)).toBe(-3);
  });
});

describe("다짐 숫자 칸 — 지운 자리에 0 이 다시 찍히지 않게(2026-10-14)", () => {
  it("빈 칸·0·글자는 값 없음, 숫자는 그대로(정수 칸은 내림)", () => {
    expect([parseDraft(""), parseDraft("0"), parseDraft("abc"), parseDraft("-3")]).toEqual([undefined, undefined, undefined, undefined]);
    expect(parseDraft("8000")).toBe(8000);
    expect(parseDraft("12.7")).toBe(12);
    expect(parseDraft("2.5", false)).toBe(2.5);
  });

  it("칸을 비운 채로는 글자를 되돌리지 않는다 — 비운 값(0)을 밖에서 받아도", () => {
    // 목표 kg: 다 지우면 밖으로 0 을 알린다. 그 0 이 돌아와도 칸은 빈 채여야 한다.
    expect(draftNeedsSync("", 0, false, 0)).toBe(false);
    // 선택 항목: 비우면 '안 정함'(undefined).
    expect(draftNeedsSync("", undefined)).toBe(false);
    // "5." 을 치는 중 — 값은 5 로 같으니 글자를 "5" 로 바꾸지 않는다.
    expect(draftNeedsSync("5.", 5, false)).toBe(false);
  });

  it("밖에서 값이 바뀌면(목표로 채우기) 글자를 그 값으로 맞춘다", () => {
    expect(draftNeedsSync("1680", 1500)).toBe(true);
    expect(draftText(1500)).toBe("1500");
    expect(draftText(undefined)).toBe("");
  });
});

describe("추천 횟수 — 경력표의 10회가 아니라 내가 평소 하는 횟수(2026-10-14)", () => {
  const rec = (date: string, kg: number, reps: number): ProgressRecord => ({
    forDate: date, exerciseId: "lat-pulldown", status: "done", sets: 4, reps, weightKg: kg, equipment: "machine",
  });

  it("3세션 이상이면 최근 세션의 가운데 값, 모자라면 모름", () => {
    const s = (reps: number) => ({ date: "", sets: 4, reps, weightKg: 40, volume: 0, oneRm: 0, equipment: null });
    expect(usualReps([s(15), s(15), s(12)])).toBe(15);
    expect(usualReps([s(15), s(20), s(8), s(15), s(14)])).toBe(15);
    expect(usualReps([s(15), s(15)])).toBeNull();
  });

  it("15회씩 하는 사람이 정체하면 디로드도 15회로 권한다(예전엔 늘 10회)", () => {
    // 4세션째 같은 기록 = 정체 → 디로드.
    const records = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"].map((d) => rec(d, 40, 15));
    const plan = overloadPlan(records, "lat-pulldown", "intermediate");
    expect(plan.action).toBe("deload");
    expect(plan.targetReps).toBe(15);
    expect(plan.suggestedReps).toBe(15);
    expect(plan.suggestedKg).toBeLessThan(40);
  });

  it("계획이 횟수를 정했으면 그 값을 따른다", () => {
    const records = ["2026-09-01", "2026-09-08", "2026-09-15"].map((d) => rec(d, 40, 15));
    expect(overloadPlan(records, "lat-pulldown", "intermediate", 8).targetReps).toBe(8);
  });
});
