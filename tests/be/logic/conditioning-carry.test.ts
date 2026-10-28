import { describe, expect, it } from "vitest";

import { buildCarryIndex, carryConditioning, isUsableRecord, type CondRecord } from "@/features/routine/conditioning-carry";

const rec = (o: Partial<CondRecord>): CondRecord => ({
  forDate: "2026-10-21", kind: "cooldown", itemId: "running", sourceRowId: "row-a",
  durationMin: 25, speed: 9.5, incline: 2, ...o,
});
const row = { id: "row-a", kind: "cooldown", itemId: "running", durationMin: 5, speed: 8, incline: 1 };
const RUN = ["duration", "speed", "incline"];

describe("conditioning-carry (런닝 이어하기)", () => {
  it("같은 루틴 행의 지난번 값을 그대로", () => {
    const idx = buildCarryIndex([rec({})]);
    expect(carryConditioning(row, RUN, idx)).toEqual({ durationMin: 25, speed: 9.5, incline: 2, carriedFrom: "2026-10-21" });
  });

  it("같은 행이 여러 번이면 가장 최근", () => {
    const idx = buildCarryIndex([rec({ forDate: "2026-10-14", durationMin: 20 }), rec({ forDate: "2026-10-21", durationMin: 30 })]);
    expect(carryConditioning(row, RUN, idx).durationMin).toBe(30);
  });

  it("같은 행 기록이 없으면 같은 종류·항목(런닝 모드 기록 포함)의 마지막", () => {
    const idx = buildCarryIndex([rec({ sourceRowId: "run-mode-record", forDate: "2026-10-25", speed: 10, incline: null })]);
    const out = carryConditioning(row, RUN, idx);
    expect(out.speed).toBe(10);
    expect(out.incline).toBe(1); // 기록에 없는 값은 행 값 유지
    expect(out.carriedFrom).toBe("2026-10-25");
  });

  it("같은 행 기록이 다른 항목 기록보다 우선(더 오래됐어도)", () => {
    const idx = buildCarryIndex([rec({ forDate: "2026-10-14", speed: 9 }), rec({ sourceRowId: "other", forDate: "2026-10-25", speed: 11 })]);
    expect(carryConditioning(row, RUN, idx).speed).toBe(9);
  });

  it("워밍업 런닝 기록은 마무리 런닝에 섞이지 않는다", () => {
    const idx = buildCarryIndex([rec({ kind: "warmup", sourceRowId: "warm-row", durationMin: 5 })]);
    expect(carryConditioning(row, RUN, idx).carriedFrom).toBeNull();
  });

  it("1분 미만·속도 0 기록은 건너뛴다", () => {
    expect(isUsableRecord(rec({ durationMin: 0 }))).toBe(false);
    expect(isUsableRecord(rec({ speed: 0 }))).toBe(false);
    expect(isUsableRecord(rec({ durationMin: null, speed: null, incline: null }))).toBe(false);
    const idx = buildCarryIndex([rec({ forDate: "2026-10-25", durationMin: 0 }), rec({ forDate: "2026-10-21", durationMin: 22 })]);
    expect(carryConditioning(row, RUN, idx).durationMin).toBe(22);
  });

  it("항목이 쓰지 않는 값(속도 없는 항목)은 건드리지 않는다", () => {
    const idx = buildCarryIndex([rec({ itemId: "stretch", sourceRowId: "s", durationMin: 8, speed: 3 })]);
    const out = carryConditioning({ id: "s", kind: "cooldown", itemId: "stretch", durationMin: 5, speed: null, incline: null }, ["duration"], idx);
    expect(out).toEqual({ durationMin: 8, speed: null, incline: null, carriedFrom: "2026-10-21" });
  });

  it("기록이 없으면 그대로", () => {
    expect(carryConditioning(row, RUN, buildCarryIndex([]))).toEqual({ durationMin: 5, speed: 8, incline: 1, carriedFrom: null });
  });
});
