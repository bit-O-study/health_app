import { describe, expect, it } from "vitest";

import {
  WEEKLY_SET_MAX,
  WEEKLY_SET_MIN,
  addDays,
  daysAgo,
  lastTrainedByRegion,
  primaryRegionOf,
  pushPullBalance,
  regionOfSubMuscle,
  setCountOf,
  setsByRegion,
  setsBySubMuscle,
  upperLowerBalance,
  volumeStatusFor,
  weekHeatmap,
  weekStartOf,
  type SetRecord,
} from "@/features/routine/training-volume";
import { REGION_LIST, type Region } from "@/features/routine/score";

/** 테스트용 세부근육 매핑 — 카탈로그를 안 끌고도 판정을 검사할 수 있다. */
const SUBS: Record<string, string[]> = {
  "bench-press": ["chest-mid", "chest-lower"],
  "incline-press": ["chest-upper"],
  "lat-pulldown": ["back-lats"],
  squat: ["lower-quads", "lower-glutes"],
  "lateral-raise": ["shoulder-side"],
  "barbell-curl": ["arm-biceps-long", "arm-biceps-short"],
  crunch: ["core-upper-abs"],
  unknown: [],
};
const subsOf = (id: string) => SUBS[id] ?? [];
/** 명시 매핑처럼 자리별 기여도를 준다(첫째=주동근 1.0, 둘째 0.5). */
const subWeightsOf = (id: string) =>
  (SUBS[id] ?? []).map((sub, i) => ({ id: sub, weight: [1, 0.5, 0.35][i] ?? 0.25 }));

function rec(p: Partial<SetRecord> & { forDate: string }): SetRecord {
  return { sets: 3, ...p };
}

describe("volumeStatusFor — 절대 기준(주당 직접 세트)", () => {
  it("0 세트는 '안 함'", () => {
    expect(volumeStatusFor(0)).toBe("none");
    expect(volumeStatusFor(-1)).toBe("none");
  });

  it("권장 구간 아래는 '부족', 안이면 '적정', 위면 '많음'", () => {
    expect(volumeStatusFor(WEEKLY_SET_MIN - 1)).toBe("low");
    expect(volumeStatusFor(WEEKLY_SET_MIN)).toBe("optimal");
    expect(volumeStatusFor(WEEKLY_SET_MAX)).toBe("optimal");
    expect(volumeStatusFor(WEEKLY_SET_MAX + 1)).toBe("high");
  });

  it("🔴 기준이 '내 최강 부위'가 아니라 절대값이다 — 전부 적게 해도 '적정'이 안 나온다", () => {
    // 예전 상대 기준에서는 3세트뿐이어도 최강 부위면 '균형'이었다.
    expect(volumeStatusFor(3)).toBe("low");
  });
});

describe("regionOfSubMuscle", () => {
  it("접두사로 부위를 가른다 (lower → leg)", () => {
    expect(regionOfSubMuscle("chest-upper")).toBe("chest");
    expect(regionOfSubMuscle("back-lats")).toBe("back");
    expect(regionOfSubMuscle("lower-quads")).toBe("leg");
    expect(regionOfSubMuscle("core-obliques")).toBe("core");
  });

  it("모르는 접두사는 null", () => {
    expect(regionOfSubMuscle("neck-something")).toBeNull();
    expect(regionOfSubMuscle("")).toBeNull();
  });

  it("정의된 모든 부위가 접두사로 도달 가능하다", () => {
    const reached = new Set<Region | null>([
      regionOfSubMuscle("chest-x"),
      regionOfSubMuscle("back-x"),
      regionOfSubMuscle("shoulder-x"),
      regionOfSubMuscle("arm-x"),
      regionOfSubMuscle("lower-x"),
      regionOfSubMuscle("core-x"),
    ]);
    for (const r of REGION_LIST) expect(reached.has(r)).toBe(true);
  });
});

describe("setCountOf", () => {
  it("세트별 기록이 있으면 그 길이가 진짜 세트 수", () => {
    expect(
      setCountOf({
        forDate: "2026-09-01",
        sets: 3,
        setDetails: [
          { weightKg: 60, reps: 10 },
          { weightKg: 50, reps: 10 },
          { weightKg: 40, reps: 12 },
          { weightKg: 30, reps: 15 },
        ],
      }),
    ).toBe(4);
  });

  it("없으면 sets, 그것도 없으면 1", () => {
    expect(setCountOf({ forDate: "2026-09-01", sets: 5 })).toBe(5);
    expect(setCountOf({ forDate: "2026-09-01" })).toBe(1);
    expect(setCountOf({ forDate: "2026-09-01", sets: 0 })).toBe(1);
  });
});

describe("primaryRegionOf — 직접 때리는 부위 하나", () => {
  it("세부근육 매핑의 첫 항목이 주동근", () => {
    expect(primaryRegionOf(rec({ forDate: "d", exerciseId: "squat" }), subsOf)).toBe("leg");
    expect(primaryRegionOf(rec({ forDate: "d", exerciseId: "bench-press" }), subsOf)).toBe("chest");
  });

  it("매핑이 없으면 focus 로 떨어진다", () => {
    expect(
      primaryRegionOf(rec({ forDate: "d", exerciseId: "unknown", focus: "back" }), subsOf),
    ).toBe("back");
    expect(primaryRegionOf(rec({ forDate: "d", focus: "lower" }), subsOf)).toBe("leg");
  });

  it("🔴 push/pull 같은 세션 묶음은 아무 데도 안 센다", () => {
    // 어디를 직접 했는지 모르는데 찍어서 세면 그 숫자로 부족/적정을 말할 수 없다.
    for (const focus of ["push", "pull", "upper", "fullbody"]) {
      expect(primaryRegionOf(rec({ forDate: "d", focus }), subsOf)).toBeNull();
    }
  });

  it("단서가 아무것도 없으면 null", () => {
    expect(primaryRegionOf(rec({ forDate: "d" }), subsOf)).toBeNull();
  });
});

describe("setsByRegion", () => {
  const week: SetRecord[] = [
    rec({ forDate: "2026-09-07", exerciseId: "bench-press", sets: 4 }),
    rec({ forDate: "2026-09-07", exerciseId: "incline-press", sets: 3 }),
    rec({ forDate: "2026-09-09", exerciseId: "lat-pulldown", sets: 4 }),
    rec({ forDate: "2026-09-11", exerciseId: "squat", sets: 5 }),
    // 기간 밖 — 세면 안 된다.
    rec({ forDate: "2026-09-01", exerciseId: "bench-press", sets: 9 }),
  ];

  it("기간 안(양끝 포함)만 부위별로 더한다", () => {
    const s = setsByRegion(week, subsOf, "2026-09-07", "2026-09-13");
    expect(s.chest).toBe(7);
    expect(s.back).toBe(4);
    expect(s.leg).toBe(5);
    expect(s.shoulder).toBe(0);
  });

  it("🔴 한 운동이 여러 부위에 중복으로 안 들어간다 — 직접 세트만", () => {
    // 벤치프레스는 가슴 4세트다. 삼두·전면삼각근에 얹지 않는다.
    const s = setsByRegion(
      [rec({ forDate: "d", exerciseId: "bench-press", sets: 4 })],
      subsOf,
      "d",
      "d",
    );
    expect(s.chest).toBe(4);
    expect(s.arm).toBe(0);
    expect(s.shoulder).toBe(0);
    expect(REGION_LIST.reduce((a, r) => a + s[r], 0)).toBe(4);
  });

  it("빈 기록은 전부 0", () => {
    const s = setsByRegion([], subsOf, "2026-09-07", "2026-09-13");
    for (const r of REGION_LIST) expect(s[r]).toBe(0);
  });
});

describe("setsBySubMuscle", () => {
  const bench = [rec({ forDate: "d", exerciseId: "bench-press", sets: 4 })];

  it("걸리는 세부근육 전부에 같은 세트 수를 센다(배분이 아니다)", () => {
    const s = setsBySubMuscle(bench, subWeightsOf, "d", "d");
    // "이 근육을 몇 세트나 건드렸나" 라서 4를 둘로 쪼개지 않는다.
    expect(s["chest-mid"]).toBe(4);
    expect(s["chest-lower"]).toBe(4);
  });

  it("🔴 기여도 문턱을 주면 주동근만 센다 — 벤치프레스는 '하부를 노린 운동'이 아니다", () => {
    const s = setsBySubMuscle(bench, subWeightsOf, "d", "d", 0.6);
    expect(s["chest-mid"]).toBe(4);
    expect(s["chest-lower"]).toBeUndefined();
  });

  it("추론분처럼 전부 1.0 이면 문턱을 줘도 다 남는다", () => {
    const equal = () => [
      { id: "arm-triceps-long", weight: 1 },
      { id: "arm-triceps-lateral", weight: 1 },
    ];
    const s = setsBySubMuscle(
      [rec({ forDate: "d", exerciseId: "x", sets: 3 })],
      equal,
      "d",
      "d",
      0.6,
    );
    expect(s["arm-triceps-long"]).toBe(3);
    expect(s["arm-triceps-lateral"]).toBe(3);
  });

  it("한 번도 안 나온 세부근육은 키 자체가 없다 → 0세트로 읽힌다", () => {
    const s = setsBySubMuscle(
      [rec({ forDate: "d", exerciseId: "bench-press" })],
      subWeightsOf,
      "d",
      "d",
    );
    expect(s["chest-upper"]).toBeUndefined();
  });
});

describe("lastTrainedByRegion / daysAgo", () => {
  it("부위별 가장 최근 날", () => {
    const last = lastTrainedByRegion(
      [
        rec({ forDate: "2026-09-01", exerciseId: "bench-press" }),
        rec({ forDate: "2026-09-10", exerciseId: "bench-press" }),
        rec({ forDate: "2026-09-05", exerciseId: "lat-pulldown" }),
      ],
      subsOf,
    );
    expect(last.chest).toBe("2026-09-10");
    expect(last.back).toBe("2026-09-05");
    expect(last.leg).toBeNull();
  });

  it("며칠 전인지 — 기록이 없으면 null", () => {
    expect(daysAgo("2026-09-01", "2026-09-12")).toBe(11);
    expect(daysAgo("2026-09-12", "2026-09-12")).toBe(0);
    expect(daysAgo(null, "2026-09-12")).toBeNull();
  });

  it("미래 날짜라도 음수로 안 간다", () => {
    expect(daysAgo("2026-09-20", "2026-09-12")).toBe(0);
  });
});

describe("pushPullBalance / upperLowerBalance", () => {
  const s = (p: Partial<Record<Region, number>>) =>
    ({ chest: 0, back: 0, shoulder: 0, arm: 0, leg: 0, core: 0, ...p }) as Record<
      Region,
      number
    >;

  it("밀기(가슴+어깨) ↔ 당기기(등)", () => {
    const b = pushPullBalance(s({ chest: 12, shoulder: 6, back: 12 }));
    expect(b.a).toBe(18);
    expect(b.b).toBe(12);
    expect(b.ratio).toBeCloseTo(1.5, 5);
    expect(b.skewed).toBe(false); // 딱 1.5 는 아직 기운 게 아니다
  });

  it("1.5배를 넘으면 기운 것", () => {
    expect(pushPullBalance(s({ chest: 20, back: 10 })).skewed).toBe(true);
    expect(pushPullBalance(s({ chest: 10, back: 20 })).skewed).toBe(true);
  });

  it("🔴 팔은 어느 쪽에도 안 넣는다 — 이두는 당기기, 삼두는 밀기라 나눌 수 없다", () => {
    const b = pushPullBalance(s({ chest: 10, back: 10, arm: 30 }));
    expect(b.a).toBe(10);
    expect(b.b).toBe(10);
    expect(b.skewed).toBe(false);
  });

  it("당기기가 0이면 비율은 null 이지만 기운 건 맞다", () => {
    const b = pushPullBalance(s({ chest: 10 }));
    expect(b.ratio).toBeNull();
    expect(b.skewed).toBe(true);
  });

  it("둘 다 0이면 기울었다고 하지 않는다 — 아직 아무것도 안 한 것", () => {
    const b = pushPullBalance(s({}));
    expect(b.skewed).toBe(false);
    expect(b.ratio).toBeNull();
  });

  it("상체 ↔ 하체", () => {
    const b = upperLowerBalance(s({ chest: 10, back: 10, shoulder: 5, arm: 5, leg: 10 }));
    expect(b.a).toBe(30);
    expect(b.b).toBe(10);
    expect(b.skewed).toBe(true);
  });
});

describe("weekStartOf / addDays", () => {
  it("그 주의 월요일", () => {
    // 2026-09-12 는 토요일 → 월요일은 09-07
    expect(weekStartOf("2026-09-12")).toBe("2026-09-07");
    expect(weekStartOf("2026-09-07")).toBe("2026-09-07");
  });

  it("🔴 일요일은 다음 주가 아니라 그 주의 끝이다", () => {
    // 2026-09-13 은 일요일 → 같은 주(09-07 시작)
    expect(weekStartOf("2026-09-13")).toBe("2026-09-07");
  });

  it("달·해를 넘겨도 맞는다", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("weekHeatmap", () => {
  it("월~일 7칸이 빠짐없이 나온다 (운동 안 한 날도 0으로)", () => {
    const days = weekHeatmap(
      [
        rec({ forDate: "2026-09-07", exerciseId: "bench-press", sets: 4 }),
        rec({ forDate: "2026-09-11", exerciseId: "squat", sets: 5 }),
      ],
      subsOf,
      "2026-09-07",
    );
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(days[0].ymd).toBe("2026-09-07");
    expect(days[6].ymd).toBe("2026-09-13");

    expect(days[0].byRegion.chest).toBe(4);
    expect(days[0].total).toBe(4);
    expect(days[1].total).toBe(0); // 쉰 날도 칸이 있어야 "어디를 안 했는지"가 보인다
    expect(days[4].byRegion.leg).toBe(5);
  });

  it("주 밖의 기록은 안 샌다", () => {
    const days = weekHeatmap(
      [rec({ forDate: "2026-09-06", exerciseId: "squat", sets: 5 })],
      subsOf,
      "2026-09-07",
    );
    expect(days.every((d) => d.total === 0)).toBe(true);
  });
});
