import { describe, expect, it } from "vitest";

import { bodyTrainingReport } from "@/features/lite/reports";

const MONTHS = ["2026-07", "2026-08", "2026-09", "2026-10"];

describe("몸 변화 × 운동량 — 달마다 운동한 날·볼륨·러닝·체중·골격근", () => {
  it("인바디가 두 번 이상이면 그 사이 골격근·체지방률과 운동 빈도로 한 줄", () => {
    const r = bodyTrainingReport({
      months: MONTHS,
      workouts: [
        { date: "2026-07-05", volumeKg: 5000 }, { date: "2026-07-12", volumeKg: 6000 },
        { date: "2026-08-02", volumeKg: 7000 },
        { date: "2026-09-10", volumeKg: 8000 }, { date: "2026-09-20", volumeKg: 9000 },
      ],
      runs: [{ date: "2026-09-21", distanceM: 5200 }, { date: "2026-09-20", distanceM: 3000 }],
      weights: [{ date: "2026-06-28", kg: 80 }, { date: "2026-07-30", kg: 79.2 }, { date: "2026-09-25", kg: 78.0 }],
      comps: [
        { date: "2026-07-01", muscleKg: 32.0, fatPct: 25.0 },
        { date: "2026-09-29", muscleKg: 32.6, fatPct: 23.4 },
      ],
    });
    expect(r.months.map((m) => [m.month, m.days, m.volumeKg, m.runKm, m.runs])).toEqual([
      ["2026-07", 2, 11000, 0, 0],
      ["2026-08", 1, 7000, 0, 0],
      // 9/20 은 근력·러닝 둘 다 → 하루로
      ["2026-09", 3, 17000, 8.2, 2],
      ["2026-10", 0, 0, 0, 0],
    ]);
    expect(r.months[0]).toMatchObject({ weightKg: 79.2, weightDelta: -0.8, muscleKg: 32.0, muscleDelta: null });
    expect(r.months[1]).toMatchObject({ weightKg: null, weightDelta: null });
    expect(r.months[2]).toMatchObject({ weightKg: 78, weightDelta: -1.2, muscleKg: 32.6, muscleDelta: 0.6 });
    // 7/1 ~ 9/29 사이 운동한 날: 7/5, 7/12, 8/2, 9/10, 9/20, 9/21 = 6일, 12.6주
    expect(r.headline).toBe("인바디 7/1 → 9/29: 골격근 +0.6kg · 체지방률 −1.6%p · 그 사이 운동 6일(주 0.5일)");
  });

  it("인바디가 한 번뿐이면 체중으로, 체중도 없으면 결론 없이 운동 숫자만", () => {
    const withWeight = bodyTrainingReport({
      months: MONTHS,
      workouts: [{ date: "2026-08-01", volumeKg: 1000 }],
      runs: [],
      weights: [{ date: "2026-07-03", kg: 70 }, { date: "2026-10-01", kg: 71.5 }],
      comps: [{ date: "2026-08-01", muscleKg: 30, fatPct: null }],
    });
    expect(withWeight.headline).toBe("7/3 → 10/1 체중 +1.5kg · 그 사이 운동 1일(주 0.1일)");

    const none = bodyTrainingReport({ months: MONTHS, workouts: [{ date: "2026-08-01", volumeKg: 1000 }], runs: [], weights: [], comps: [] });
    expect(none.headline).toBeNull();
    expect(none.months[1].days).toBe(1);
  });
});
