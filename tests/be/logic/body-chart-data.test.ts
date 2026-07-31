import { describe, expect, it } from "vitest";

import {
  buildBodyLogRows,
  buildBodySeries,
  dateTickIndexes,
  fullDateLabel,
  seriesDelta,
  shortDateLabel,
  timeLabel,
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

describe("dateTickIndexes — x축 날짜 눈금 위치", () => {
  it("점이 없으면 눈금도 없음", () => {
    expect(dateTickIndexes(0)).toEqual([]);
  });

  it("점이 적으면 전부 표시", () => {
    expect(dateTickIndexes(1)).toEqual([0]);
    expect(dateTickIndexes(3)).toEqual([0, 1, 2]);
    expect(dateTickIndexes(4)).toEqual([0, 1, 2, 3]);
  });

  it("점이 많으면 최대 개수만, 첫·마지막 포함해 균등 배치", () => {
    expect(dateTickIndexes(10)).toEqual([0, 3, 6, 9]);
    const t = dateTickIndexes(120);
    expect(t).toHaveLength(4);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBe(119);
  });

  it("max 를 줄이면 그만큼만", () => {
    expect(dateTickIndexes(9, 2)).toEqual([0, 8]);
    expect(dateTickIndexes(9, 1)).toEqual([0]);
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
