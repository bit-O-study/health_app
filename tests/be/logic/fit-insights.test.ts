import { describe, expect, it } from "vitest";

import {
  growthStories,
  plateauAdvice,
  plateaus,
  pushPull,
  restingParts,
  recoveryByPart,
  recoveryHours,
} from "@/features/routine/fit-insights";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import type { ProgressRecord } from "@/features/routine/progress";

const rec = (forDate: string, exerciseId: string, weightKg: number, reps: number, sets = 3): ProgressRecord => ({
  forDate, exerciseId, status: "done", sets, reps, weightKg,
});

const TODAY = "2026-10-08";

describe("A 성장 기록 — 처음 → 최근 4주 최고", () => {
  it("스쿼트 17.5kg → 140kg 처럼 늘어난 kg 큰 순, 그만둔 종목·짧은 종목은 뺀다", () => {
    const rows = [
      rec("2026-06-01", "squat", 17.5, 12), rec("2026-07-20", "squat", 80, 10), rec("2026-09-14", "squat", 130, 10), rec("2026-09-28", "squat", 140, 10),
      rec("2026-06-01", "lat-pulldown", 35, 15), rec("2026-10-05", "lat-pulldown", 50, 12),
      // 그만둔 종목(마지막이 60일 넘게 전)
      rec("2026-06-01", "ohp", 20, 10), rec("2026-07-01", "ohp", 40, 10),
      // 2주밖에 안 한 종목
      rec("2026-09-20", "leg-curl", 20, 12), rec("2026-10-04", "leg-curl", 40, 12),
    ];
    expect(growthStories(rows, TODAY)).toEqual([
      { exerciseId: "squat", fromKg: 17.5, fromDate: "2026-06-01", toKg: 140, toDate: "2026-09-28" },
      { exerciseId: "lat-pulldown", fromKg: 35, fromDate: "2026-06-01", toKg: 50, toDate: "2026-10-05" },
    ]);
  });

  it("세트별 무게가 있으면 가장 무거운 세트로 본다", () => {
    const rows: ProgressRecord[] = [
      rec("2026-08-01", "bench-press", 40, 10),
      { forDate: "2026-09-20", exerciseId: "bench-press", status: "done", sets: null, reps: null, weightKg: null, setDetails: [{ weightKg: 50, reps: 10 }, { weightKg: 60, reps: 5 }] },
    ];
    expect(growthStories(rows, TODAY)[0]).toMatchObject({ fromKg: 40, toKg: 60 });
  });
});

describe("B 정체 알림 — 4주 넘게 예상 최대가 안 오름", () => {
  it("벤치 6/29 60kg×15(예상 90kg) 이후 70kg×5·60kg×10 만 → 14주째, 다음 한 걸음", () => {
    const rows = [
      rec("2026-06-01", "bench-press", 20, 15), rec("2026-06-15", "bench-press", 40, 10), rec("2026-06-29", "bench-press", 60, 15),
      rec("2026-07-27", "bench-press", 70, 5), rec("2026-08-10", "bench-press", 50, 5), rec("2026-09-21", "bench-press", 70, 3),
      rec("2026-09-28", "bench-press", 60, 7), rec("2026-10-05", "bench-press", 60, 10),
    ];
    const [p] = plateaus(rows, TODAY);
    expect(p).toMatchObject({ exerciseId: "bench-press", sinceDate: "2026-06-29", weeks: 14, bestOneRmKg: 90, lastKg: 60, lastReps: 10 });
    expect(p.advice).toContain("12회가 되면");
  });

  it("계속 오르는 종목·최근 안 한 종목·기록 적은 종목은 정체가 아니다", () => {
    const rising = ["06-01", "06-15", "07-01", "07-15", "08-01", "08-15", "09-01", "09-28"].map((d, i) => rec(`2026-${d}`, "squat", 40 + i * 10, 10));
    const old = ["05-01", "05-08", "05-15", "05-22", "05-29", "06-05", "07-01"].map((d) => rec(`2026-${d}`, "ohp", 40, 8));
    const few = [rec("2026-08-01", "dips", 10, 10), rec("2026-10-01", "dips", 10, 10)];
    expect(plateaus([...rising, ...old, ...few], TODAY)).toEqual([]);
  });

  it("다음 한 걸음 — 8회 미만이면 반복 채우기, 12회 이상이면 무게 올리기", () => {
    expect(plateauAdvice(70, 5, 2.5)).toBe("70kg로 8회씩 3세트를 채우면 72.5kg로 올려 보세요.");
    expect(plateauAdvice(60, 12, 2.5)).toBe("62.5kg로 올려 8회부터 다시 시작해 보세요.");
    expect(plateauAdvice(60, 10, 5)).toBe("60kg로 한 세트에 1~2회씩 늘려 12회가 되면 65kg로 올려 보세요.");
  });
});

describe("C 밀기 : 당기기", () => {
  it("밀기만 많으면 push 쏠림, 비슷하면 null, 당기기만 많으면 pull", () => {
    expect(pushPull({ "chest-mid": 30, "shoulder-front": 10, "back-lats": 10, "arm-biceps-long": 5 })).toEqual({ push: 40, pull: 15, ratio: 2.7, lean: "push" });
    expect(pushPull({ "chest-mid": 12, "back-lats": 10 }).lean).toBeNull();
    expect(pushPull({ "chest-mid": 4, "back-lats": 10 }).lean).toBe("pull");
    expect(pushPull({ "chest-mid": 4 })).toEqual({ push: 4, pull: 0, ratio: null, lean: "push" });
    expect(pushPull({}).lean).toBeNull();
  });
});

describe("D 쉬는 부위", () => {
  it("주 부위로 마지막 한 날부터 며칠 — 7일 넘은 부위만, 기록 없으면 '오래'. 스쿼트는 '등'이 아니다", () => {
    const rows = [
      rec("2026-09-28", "squat", 140, 10, 4),
      rec("2026-10-07", "bench-press", 60, 10, 5),
      rec("2026-10-05", "lat-pulldown", 50, 12, 5),
      rec("2026-10-07", "lateral-raise", 8, 15, 4),
      rec("2026-10-07", "skull-crusher", 20, 12, 4),
    ];
    const out = restingParts(rows, primaryBodyPart, TODAY);
    expect(out.map((r) => r.part)).toEqual(["core", "lower"]);
    expect(out[0]).toEqual({ part: "core", days: null, lastDate: null });
    expect(out[1]).toEqual({ part: "lower", days: 10, lastDate: "2026-09-28" });
  });
});

describe("부위별 회복(2026-10-08)", () => {
  // 세부 근육 점수 — 실제 표 대신 단순하게(가슴 운동 = 가슴 100점, 스쿼트 = 하체 100점).
  const stim = (id: string): Record<string, number> => (id === "bench" ? { "chest-mid": 100 } : id === "squat" ? { "lower-quads": 100 } : {});
  const at = (iso: string) => new Date(iso);

  it("세트가 많을수록 오래 — 4세트 미만 24 · 10세트 미만 48 · 그 이상 72시간", () => {
    expect([recoveryHours(3), recoveryHours(6), recoveryHours(12)]).toEqual([24, 48, 72]);
  });

  it("어제 저녁 가슴 12세트 → 남은 시간·퍼센트, 안 한 부위는 회복됨", () => {
    const rows = recoveryByPart(
      [
        { exerciseId: "bench", sets: 6, doneAt: "2026-10-07T11:00:00Z" },
        { exerciseId: "bench", sets: 6, doneAt: "2026-10-07T12:00:00Z" }, // 같은 날 = 한 번의 가슴 운동(12세트, 72시간)
      ],
      stim,
      at("2026-10-08T12:00:00Z"), // 마지막으로 끝낸 뒤 24시간
    );
    expect(rows.find((r) => r.part === "chest")).toEqual({ part: "chest", pct: 33, hoursLeft: 48, lastAt: "2026-10-07T12:00:00.000Z", sets: 12 });
    expect(rows.find((r) => r.part === "lower")).toEqual({ part: "lower", pct: 100, hoursLeft: 0, lastAt: null, sets: 0 });
  });

  it("시간이 다 지나면 회복됨, 가벼운 운동은 하루면 풀린다", () => {
    const rows = recoveryByPart([{ exerciseId: "squat", sets: 3, doneAt: "2026-10-07T00:00:00Z" }], stim, at("2026-10-08T01:00:00Z"));
    expect(rows.find((r) => r.part === "lower")?.pct).toBe(100);
  });
});
