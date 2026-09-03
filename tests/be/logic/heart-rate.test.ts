import { describe, expect, it } from "vitest";

import { summarizeHeartRate } from "@/features/health/heart-rate";

const start = new Date("2026-09-02T01:00:00.000Z");
const end = new Date("2026-09-02T01:10:00.000Z");

describe("러닝 심박수 요약", () => {
  it("러닝 구간 표본의 평균·최대 심박을 계산하고 중복을 제거한다", () => {
    const duplicate = { time: "2026-09-02T01:05:00.000Z", beatsPerMinute: 150 };
    expect(summarizeHeartRate([
      { samples: [
        { time: "2026-09-02T01:01:00.000Z", beatsPerMinute: 120 },
        duplicate,
        { time: "2026-09-02T01:09:00.000Z", beatsPerMinute: "180" },
      ] },
      { samples: [duplicate] },
    ], start, end)).toEqual({ averageBpm: 150, maxBpm: 180, sampleCount: 3 });
  });

  it("구간 밖·30 미만·240 초과·깨진 표본을 버린다", () => {
    expect(summarizeHeartRate([{ samples: [
      { time: "2026-09-02T00:59:59.000Z", beatsPerMinute: 100 },
      { time: "2026-09-02T01:01:00.000Z", beatsPerMinute: 29 },
      { time: "2026-09-02T01:02:00.000Z", beatsPerMinute: 241 },
      { time: "broken", beatsPerMinute: 120 },
    ] }], start, end)).toBeNull();
  });
});
