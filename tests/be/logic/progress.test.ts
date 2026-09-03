import { describe, expect, it } from "vitest";

import {
  dailyVolumeSeries,
  estimate1RM,
  exerciseHistory,
  oneRMSeries,
  personalRecords,
  recentPersonalRecords,
  recordOneRM,
  recordVolume,
  setVolume,
  shiftYmd,
  topExercisesByVolume,
  trendPct,
  weekStartYmd,
  weeklyVolumeSeries,
  weightStepKg,
  type ProgressRecord,
} from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";
import { isUnilateralExercise } from "@/features/routine/unilateral-exercises";

const rec = (
  forDate: string,
  exerciseId: string,
  sets: number | null,
  reps: number | null,
  weightKg: number | null,
  setDetails: SetDetail[] | null = null,
): ProgressRecord => ({
  forDate,
  exerciseId,
  status: "done",
  sets,
  reps,
  weightKg,
  setDetails,
});

describe("progress — 1RM / 볼륨 집계", () => {
  describe("estimate1RM (Epley)", () => {
    it("weight × (1 + reps/30)", () => {
      expect(estimate1RM(100, 5)).toBeCloseTo(116.7, 1);
      expect(estimate1RM(60, 10)).toBeCloseTo(80, 1);
    });
    it("1회는 그 무게 자체", () => {
      expect(estimate1RM(120, 1)).toBe(120);
    });
    it("맨몸/0중량/0회는 0", () => {
      expect(estimate1RM(null, 10)).toBe(0);
      expect(estimate1RM(0, 10)).toBe(0);
      expect(estimate1RM(100, 0)).toBe(0);
    });
  });

  describe("setVolume", () => {
    it("sets × reps × weight", () => {
      expect(setVolume(4, 10, 60)).toBe(2400);
    });
    it("맨몸(무게 null)은 0", () => {
      expect(setVolume(3, 15, null)).toBe(0);
    });
  });

  describe("dailyVolumeSeries", () => {
    it("날짜별 합산 + 오름차순 + 맨몸(0) 제외", () => {
      const s = dailyVolumeSeries([
        rec("2026-06-02", "bench", 4, 10, 60), // 2400
        rec("2026-06-02", "squat", 5, 5, 100), // 2500
        rec("2026-06-01", "bench", 3, 10, 50), // 1500
        rec("2026-06-03", "plank", 3, 30, null), // 0 → 제외
      ]);
      expect(s).toEqual([
        { date: "2026-06-01", value: 1500 },
        { date: "2026-06-02", value: 4900 },
      ]);
    });
  });

  describe("oneRMSeries", () => {
    it("특정 종목의 날짜별 최고 추정 1RM", () => {
      const s = oneRMSeries(
        [
          rec("2026-06-01", "bench", 1, 5, 80),
          rec("2026-06-01", "bench", 1, 3, 90), // 더 높음
          rec("2026-06-01", "squat", 1, 5, 120), // 다른 종목 제외
          rec("2026-06-03", "bench", 1, 5, 85),
        ],
        "bench",
      );
      expect(s.length).toBe(2);
      expect(s[0].date).toBe("2026-06-01");
      expect(s[1].date).toBe("2026-06-03");
      expect(s[0].value).toBe(estimate1RM(90, 3));
    });
  });

  describe("topExercisesByVolume", () => {
    it("총 볼륨 순위", () => {
      const top = topExercisesByVolume([
        rec("2026-06-01", "squat", 5, 5, 100), // 2500
        rec("2026-06-01", "bench", 4, 10, 60), // 2400
        rec("2026-06-02", "squat", 5, 5, 100), // +2500 → 5000
      ]);
      expect(top[0]).toEqual({ exerciseId: "squat", volume: 5000 });
      expect(top[1]).toEqual({ exerciseId: "bench", volume: 2400 });
    });
  });

  describe("trendPct", () => {
    it("첫 값 대비 마지막 값 변화율", () => {
      expect(trendPct([{ date: "a", value: 100 }, { date: "b", value: 130 }])).toBe(30);
      expect(trendPct([{ date: "a", value: 100 }])).toBeNull();
    });
  });
});

/**
 * 집계 정확도 — 로드맵 2.1 의 "빈 기록·단측 운동·집계 정확도" 에 해당한다.
 * 아래 세 가지가 예전 집계에서 실제로 틀렸거나 빠져 있던 부분이다.
 */
describe("progress — 집계 정확도", () => {
  describe("세트별 기록(드롭세트·피라미드)", () => {
    // 이 앱은 세트마다 다른 무게를 set_details 에 저장하는데, 예전 집계는 그걸 안 읽고
    // 균일 세트(sets×reps@weight)로만 계산했다 → 실제와 다른 값이 그려졌다.
    const drop: SetDetail[] = [
      { weightKg: 60, reps: 10 }, // 600
      { weightKg: 50, reps: 10 }, // 500
      { weightKg: 40, reps: 12 }, // 480
    ];

    it("볼륨은 세트별 값을 더한다", () => {
      expect(recordVolume(rec("2026-06-01", "bench", 3, 10, 60, drop))).toBe(1580);
    });

    it("균일 세트로 계산하면 나오는 값과 실제로 다르다(회귀 가드)", () => {
      expect(setVolume(3, 10, 60)).toBe(1800);
      expect(recordVolume(rec("2026-06-01", "bench", 3, 10, 60, drop))).not.toBe(1800);
    });

    it("1RM 은 세트 중 최고치 — 마지막(가벼운) 세트를 쓰면 힘이 낮게 잡힌다", () => {
      expect(recordOneRM(rec("2026-06-01", "bench", 3, 10, 60, drop))).toBe(
        estimate1RM(60, 10),
      );
    });

    it("세트별 기록이 비었거나 없으면 균일 세트로 되돌린다", () => {
      expect(recordVolume(rec("2026-06-01", "bench", 4, 10, 60, []))).toBe(2400);
      expect(recordVolume(rec("2026-06-01", "bench", 4, 10, 60, null))).toBe(2400);
    });

    it("날짜별·종목별 집계도 세트별 값을 반영한다", () => {
      const one = rec("2026-06-01", "bench", 3, 10, 60, drop);
      expect(dailyVolumeSeries([one])).toEqual([
        { date: "2026-06-01", value: 1580 },
      ]);
      expect(topExercisesByVolume([one])[0].volume).toBe(1580);
    });
  });

  describe("단측(한쪽씩) 운동", () => {
    it("볼륨은 양쪽 합 — 한쪽 기준으로 적은 값을 그대로 세면 절반이 된다", () => {
      expect(isUnilateralExercise("one-arm-dumbbell-row")).toBe(true);
      expect(
        recordVolume(rec("2026-06-01", "one-arm-dumbbell-row", 4, 10, 20)),
      ).toBe(1600);
    });

    it("추정 1RM 은 두 배로 하지 않는다 — 한쪽이 든 무게가 그 팔의 능력이다", () => {
      expect(
        recordOneRM(rec("2026-06-01", "one-arm-dumbbell-row", 4, 10, 20)),
      ).toBe(estimate1RM(20, 10));
    });

    it("양측 운동은 그대로", () => {
      expect(recordVolume(rec("2026-06-01", "bench-press", 4, 10, 20))).toBe(800);
    });
  });

  describe("빈 기록", () => {
    it("기록이 없으면 모든 집계가 비어 있다(터지지 않는다)", () => {
      expect(dailyVolumeSeries([])).toEqual([]);
      expect(weeklyVolumeSeries([])).toEqual([]);
      expect(exerciseHistory([], "bench")).toEqual([]);
      expect(personalRecords([]).size).toBe(0);
      expect(recentPersonalRecords([], "2026-09-01")).toEqual([]);
    });

    it("넘긴(skipped) 기록은 어디에도 안 들어간다", () => {
      const skipped: ProgressRecord = {
        ...rec("2026-06-01", "bench", 4, 10, 60),
        status: "skipped",
      };
      expect(dailyVolumeSeries([skipped])).toEqual([]);
      expect(exerciseHistory([skipped], "bench")).toEqual([]);
    });

    it("맨몸(무게 0)은 볼륨에 안 들어간다 — 볼륨은 '든 무게의 총합'이다", () => {
      expect(dailyVolumeSeries([rec("2026-06-01", "push-up", 3, 20, null)])).toEqual(
        [],
      );
    });
  });
});

describe("progress — 주간 집계", () => {
  it("주 경계는 월요일", () => {
    expect(weekStartYmd("2026-09-01")).toBe("2026-08-31"); // 화 → 월
    expect(weekStartYmd("2026-08-31")).toBe("2026-08-31"); // 월 → 그대로
    expect(weekStartYmd("2026-09-06")).toBe("2026-08-31"); // 일 → 그 주 월요일
  });

  it("주별로 합치고 오름차순", () => {
    const s = weeklyVolumeSeries([
      rec("2026-08-31", "bench", 4, 10, 60), // 2400
      rec("2026-09-02", "bench", 4, 10, 60), // 같은 주 +2400
      rec("2026-09-07", "bench", 4, 10, 50), // 다음 주 2000
    ]);
    expect(s).toEqual([
      { date: "2026-08-31", value: 4800 },
      { date: "2026-09-07", value: 2000 },
    ]);
  });

  it("shiftYmd 는 달·해를 넘긴다", () => {
    expect(shiftYmd("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftYmd("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("progress — 종목별 이력", () => {
  it("최신순으로 날짜별 한 줄", () => {
    const h = exerciseHistory(
      [
        rec("2026-06-01", "bench", 4, 10, 50),
        rec("2026-06-05", "bench", 4, 8, 60),
      ],
      "bench",
    );
    expect(h.map((x) => x.date)).toEqual(["2026-06-05", "2026-06-01"]);
    expect(h[0]).toMatchObject({ sets: 4, reps: 8, weightKg: 60 });
  });

  it("같은 날 두 번 하면 세트는 더하고 무게는 최고치", () => {
    const h = exerciseHistory(
      [
        rec("2026-06-01", "bench", 3, 10, 50),
        rec("2026-06-01", "bench", 2, 5, 70),
      ],
      "bench",
    );
    expect(h).toHaveLength(1);
    expect(h[0].sets).toBe(5);
    expect(h[0].weightKg).toBe(70);
    expect(h[0].volume).toBe(3 * 10 * 50 + 2 * 5 * 70);
  });

  it("세트별 기록이면 대표값은 가장 무거운 세트", () => {
    const h = exerciseHistory(
      [
        rec("2026-06-01", "bench", 3, 10, 60, [
          { weightKg: 40, reps: 12 },
          { weightKg: 70, reps: 5 },
          { weightKg: 50, reps: 10 },
        ]),
      ],
      "bench",
    );
    expect(h[0]).toMatchObject({ sets: 3, reps: 5, weightKg: 70 });
  });
});

describe("progress — 개인 기록(PR)", () => {
  const history = [
    rec("2026-06-01", "bench", 4, 10, 50),
    rec("2026-06-08", "bench", 4, 10, 60),
    rec("2026-06-15", "bench", 4, 10, 60), // 같은 값 — 갱신 아님
  ];

  it("같은 값이 반복되면 처음 달성한 날을 남긴다", () => {
    const pr = personalRecords(history).get("bench")!;
    expect(pr.bestWeightKg).toBe(60);
    expect(pr.bestWeightDate).toBe("2026-06-08");
    expect(pr.bestOneRmDate).toBe("2026-06-08");
  });

  it("하루 최고 볼륨도 따로 센다", () => {
    const pr = personalRecords([
      rec("2026-06-01", "bench", 10, 10, 50), // 5000
      rec("2026-06-08", "bench", 4, 10, 60), // 2400 (무게는 더 높다)
    ]).get("bench")!;
    expect(pr.bestVolume).toBe(5000);
    expect(pr.bestVolumeDate).toBe("2026-06-01");
    expect(pr.bestWeightDate).toBe("2026-06-08");
  });

  it("최근 기록만 '새 기록'으로 뽑는다", () => {
    const fresh = recentPersonalRecords(history, "2026-06-20", 30);
    expect(fresh.map((p) => p.kind)).toEqual(["oneRm"]);
    expect(recentPersonalRecords(history, "2026-09-01", 30)).toEqual([]);
  });

  it("1RM 과 최고 중량이 같은 날이면 하나만 내보낸다(같은 사건)", () => {
    expect(recentPersonalRecords(history, "2026-06-20", 30)).toHaveLength(1);
  });
});

describe("progress — 증량 단위", () => {
  it("종목 등급을 따른다(맨몸은 없음)", () => {
    // 올릴지 말지는 overload.ts 가 정하고, 여기서는 '한 단계'가 얼마인지만 정한다.
    expect(weightStepKg("squat")).toBe(5);
    expect(weightStepKg("lateral-raise")).toBe(1.25);
    expect(weightStepKg("push-up")).toBeNull();
  });
});
