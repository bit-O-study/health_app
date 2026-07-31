import { describe, expect, it } from "vitest";

import {
  buildBodyLogRows,
  buildBodySeries,
  fullDateLabel,
  pickChartPoints,
  seriesDelta,
  shortDateLabel,
  spacedTickIndexes,
  timeLabel,
  type BodyLogLike,
  type BodySeriesPoint,
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

describe("날짜 라벨 — 서울(Asia/Seoul) 고정", () => {
  it("UTC 저장값을 서울 날짜로 (M/D)", () => {
    expect(shortDateLabel("2026-07-31T01:00:00Z")).toBe("7/31");
  });

  it("UTC 밤 = 서울 다음날 — 하루 밀리지 않는다", () => {
    // 07-31 15:30Z = 서울 08-01 00:30 → 8/1 로 보여야 한다.
    expect(shortDateLabel("2026-07-31T15:30:00Z")).toBe("8/1");
    expect(fullDateLabel("2026-07-31T15:30:00Z")).toBe("2026. 8. 1.");
  });

  it("시각도 서울 기준 24시간제", () => {
    expect(timeLabel("2026-07-31T05:20:00Z")).toBe("14:20");
    expect(timeLabel("2026-07-31T15:30:00Z")).toBe("00:30");
  });

  it("잘못된 값이면 빈 문자열(화면이 깨지지 않게)", () => {
    expect(shortDateLabel("nope")).toBe("");
    expect(fullDateLabel("")).toBe("");
    expect(timeLabel("nope")).toBe("");
  });
});

describe("pickChartPoints — 기록 많을 때 대표 6개만", () => {
  const pts = (vals: number[]): BodySeriesPoint[] =>
    vals.map((v, i) => ({ i, v, createdAt: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z` }));

  it("6개 이하면 그대로(솎아내지 않는다)", () => {
    const p = pts([70, 71, 72, 73, 74, 75]);
    expect(pickChartPoints(p)).toEqual(p);
  });

  it("첫 기록 · 최대 · 최소 · 현재 · 직전 · 직직전", () => {
    //          i=0  1   2   3   4   5   6
    const p = pts([70, 80, 60, 71, 72, 73, 74]);
    const got = pickChartPoints(p).map((x) => x.i);
    expect(got).toEqual([0, 1, 2, 4, 5, 6]); // 첫0 · 최대1 · 최소2 · 직직전4 · 직전5 · 현재6
  });

  it("시간순으로 정렬돼 있다(선이 지그재그로 꼬이지 않게)", () => {
    const got = pickChartPoints(pts([70, 80, 60, 71, 72, 73, 74])).map((x) => x.i);
    expect([...got].sort((a, b) => a - b)).toEqual(got);
  });

  it("최대=현재, 최소=첫 기록처럼 겹치면 더 이전 기록으로 6개를 채운다", () => {
    // 계속 증가 → 최소=첫(i0), 최대=현재(i7). 겹쳐서 4개뿐 → 직직직전·직직직직전 보충.
    const got = pickChartPoints(pts([70, 71, 72, 73, 74, 75, 76, 77])).map((x) => x.i);
    expect(got).toEqual([0, 3, 4, 5, 6, 7]);
    expect(got).toHaveLength(6);
  });

  it("기록이 아주 많아도 정확히 6개 + 최대·최소는 반드시 포함", () => {
    const vals = Array.from({ length: 50 }, (_, i) => 70 + (i % 7));
    vals[20] = 99; // 최대
    vals[35] = 41; // 최소
    const got = pickChartPoints(pts(vals));
    expect(got).toHaveLength(6);
    expect(got.map((x) => x.i)).toContain(20);
    expect(got.map((x) => x.i)).toContain(35);
    expect(got[0].i).toBe(0);
    expect(got[got.length - 1].i).toBe(49);
  });
});

describe("spacedTickIndexes — 겹치는 날짜 라벨 건너뛰기", () => {
  it("빈 배열/한 점", () => {
    expect(spacedTickIndexes([], 40)).toEqual([]);
    expect(spacedTickIndexes([10], 40)).toEqual([0]);
  });

  it("충분히 떨어져 있으면 전부 표시", () => {
    expect(spacedTickIndexes([10, 100, 200, 300], 40)).toEqual([0, 1, 2, 3]);
  });

  it("오른쪽에 몰린 점들(현재·직전·직직전)은 마지막만 남는다", () => {
    // 첫 기록 뒤로 세 점이 붙어 있는 상황.
    expect(spacedTickIndexes([10, 280, 295, 310], 40)).toEqual([0, 3]);
  });

  it("첫·마지막은 가까워도 항상 남긴다", () => {
    expect(spacedTickIndexes([10, 20], 40)).toEqual([0, 1]);
  });
});

describe("buildBodyLogRows — 기록 리스트(날짜 + 값)", () => {
  it("최신순으로, 값 있는 지표만 담는다", () => {
    const rows = buildBodyLogRows([
      log({ weightKg: 72, createdAt: "2026-07-01T00:00:00Z" }),
      log({ weightKg: 70, muscleMassKg: 32, createdAt: "2026-07-08T00:00:00Z" }),
    ]);
    expect(rows.map((r) => r.createdAt)).toEqual([
      "2026-07-08T00:00:00Z",
      "2026-07-01T00:00:00Z",
    ]);
    expect(rows[0].metrics.map((m) => m.key)).toEqual([
      "weightKg",
      "muscleMassKg",
    ]);
    expect(rows[0].metrics[0].value).toBe(70);
    expect(rows[1].metrics).toHaveLength(1);
  });

  it("값이 하나도 없는 로그는 줄을 만들지 않는다", () => {
    expect(buildBodyLogRows([log({})])).toEqual([]);
  });
});
