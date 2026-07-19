import { describe, expect, it } from "vitest";

import {
  buildBodySeries,
  seriesDelta,
  type BodyLogLike,
} from "@/features/profile/body-chart-data";

const log = (p: Partial<BodyLogLike>): BodyLogLike => ({
  weightKg: null,
  heightCm: null,
  bodyFatPct: null,
  muscleMassKg: null,
  createdAt: "2026-07-01T00:00:00Z",
  ...p,
});

describe("body-chart-data — 지표별 시리즈 분리", () => {
  it("빈 로그면 시리즈 없음", () => {
    expect(buildBodySeries([])).toEqual([]);
  });

  it("값 있는 지표만 시리즈로(없는 지표 제외)", () => {
    const logs = [
      log({ weightKg: 70, createdAt: "2026-07-01T00:00:00Z" }),
      log({ weightKg: 69, createdAt: "2026-07-05T00:00:00Z" }),
    ];
    const series = buildBodySeries(logs);
    expect(series).toHaveLength(1);
    expect(series[0].key).toBe("weightKg");
    expect(series[0].min).toBe(69);
    expect(series[0].max).toBe(70);
    expect(series[0].first).toBe(70);
    expect(series[0].latest).toBe(69);
  });

  it("지표마다 자기 [min,max] — 스케일 독립", () => {
    const logs = [
      log({ weightKg: 70, muscleMassKg: 30 }),
      log({ weightKg: 72, muscleMassKg: 31 }),
      log({ weightKg: 71, muscleMassKg: 33 }),
    ];
    const series = buildBodySeries(logs);
    const w = series.find((s) => s.key === "weightKg")!;
    const mm = series.find((s) => s.key === "muscleMassKg")!;
    expect(w.min).toBe(70);
    expect(w.max).toBe(72);
    expect(mm.min).toBe(30);
    expect(mm.max).toBe(33);
  });

  it("중간에 값이 비어도 x 위치(i)는 전체 로그 기준 유지", () => {
    const logs = [
      log({ weightKg: 70 }), // i=0
      log({ bodyFatPct: 20 }), // i=1 (몸무게 없음)
      log({ weightKg: 69 }), // i=2
    ];
    const w = buildBodySeries(logs).find((s) => s.key === "weightKg")!;
    expect(w.points.map((p) => p.i)).toEqual([0, 2]);
  });

  it("delta = 첫→마지막 변화(부호)", () => {
    const s = buildBodySeries([
      log({ weightKg: 72 }),
      log({ weightKg: 69.4 }),
    ])[0];
    expect(seriesDelta(s)).toBe(-2.6);
  });
});
