import { describe, expect, it } from "vitest";

import { runHealthRecords } from "@/features/health/run-write";

const base = {
  startedAt: "2026-09-02T01:00:00.000Z",
  endedAt: "2026-09-02T01:30:00.000Z",
  distanceM: 5_012.4,
  caloriesKcal: 321.6,
};

describe("Health Connect 러닝 기록", () => {
  it("같은 시간 구간의 거리와 총소모칼로리를 만든다", () => {
    expect(runHealthRecords(base)).toEqual([
      {
        type: "Distance",
        startTime: new Date(base.startedAt),
        endTime: new Date(base.endedAt),
        distance: { unit: "meter", value: 5_012 },
      },
      {
        type: "TotalCaloriesBurned",
        startTime: new Date(base.startedAt),
        endTime: new Date(base.endedAt),
        energy: { unit: "kcal", value: 322 },
      },
    ]);
  });

  it("거리가 0이면 없는 거리 대신 칼로리만 기록한다", () => {
    expect(runHealthRecords({ ...base, distanceM: 0 }).map((r) => r.type)).toEqual([
      "TotalCaloriesBurned",
    ]);
  });

  it("짧거나 역전된 시간·범위 밖 거리와 칼로리는 거부한다", () => {
    expect(runHealthRecords({ ...base, endedAt: "2026-09-02T01:00:59.000Z" })).toEqual([]);
    expect(runHealthRecords({ ...base, endedAt: "2026-09-02T00:59:00.000Z" })).toEqual([]);
    expect(runHealthRecords({ ...base, distanceM: 200_001 })).toEqual([]);
    expect(runHealthRecords({ ...base, caloriesKcal: 20_001 })).toEqual([]);
  });
});
