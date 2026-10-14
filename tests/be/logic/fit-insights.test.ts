import { describe, expect, it } from "vitest";

import { buildRecoveryProfile, defaultRecoveryProfile, muscleFactor, setHardness } from "@/features/routine/recovery-load";

import {
  growthStories,
  plateauAdvice,
  plateaus,
  pushPull,
  restingParts,
  recoveryByPart,
  recoveryHours,
  doneAtOf,
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
    expect(p).toMatchObject({ kind: "flat", sessions: 5, recentOneRmKg: 80 });
  });

  it("🔴 최근 3번이 연달아 떨어지고 최고의 92% 아래면 '하락' — 무게를 10% 낮춰 쉬어 가기(먼저 보여 준다)", () => {
    const decline = [
      rec("2026-06-01", "squat", 60, 10), rec("2026-07-01", "squat", 100, 8), rec("2026-08-01", "squat", 100, 8),
      rec("2026-09-10", "squat", 95, 8), rec("2026-09-24", "squat", 90, 7), rec("2026-10-06", "squat", 85, 6),
    ];
    const flat = ["06-01", "06-15", "06-29", "07-27", "08-10", "09-21", "10-05"].map((d) => rec(`2026-${d}`, "bench-press", 60, 8));
    const [first, second] = plateaus([...flat, ...decline], TODAY);
    expect(first).toMatchObject({ exerciseId: "squat", kind: "decline", bestOneRmKg: 127, recentOneRmKg: 102 });
    expect(first.advice).toContain("이번 주는 77.5kg로 가볍게");
    expect(second.kind).toBe("flat");
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
    // 밀기 40 : 당기기 15 → 1.5:1 이 되려면 당기기 27 — 12세트 더.
    expect(pushPull({ "chest-mid": 30, "shoulder-front": 10, "back-lats": 10, "arm-biceps-long": 5 })).toEqual({ push: 40, pull: 15, ratio: 2.7, lean: "push", needSets: 12 });
    expect(pushPull({ "chest-mid": 12, "back-lats": 10 }).lean).toBeNull();
    expect(pushPull({ "chest-mid": 4, "back-lats": 10 }).lean).toBe("pull");
    expect(pushPull({ "chest-mid": 4 })).toEqual({ push: 4, pull: 0, ratio: null, lean: "push", needSets: 3 });
    expect(pushPull({ "chest-mid": 12, "back-lats": 10 }).needSets).toBe(0);
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

describe("부위별 회복 — 근육 크기 · 내 소화량에 견준 부하 · 강도 · 쌓인 피로 · 체크인", () => {
  // 내 몸 기준 — 부위마다 한 번에 힘든 세트 6개를 소화한다. 무게를 안 넘긴 세트는 힘든 정도 0.6.
  // → 10회 12세트 = 7.2 힘든 세트 = 부하 1.2, 6세트 = 0.6, 3세트 = 0.3.
  const P = { ...defaultRecoveryProfile(), capacity: { chest: 6, back: 6, shoulder: 6, arm: 6, lower: 6, core: 6 } };
  // 세부 근육 점수 — 실제 표 대신 단순하게(운동 하나 = 한 부위 100점).
  const stim = (id: string): Record<string, number> =>
    ({ bench: { "chest-mid": 100 }, squat: { "lower-quads": 100 }, curl: { "arm-biceps-long": 100 } } as Record<string, Record<string, number>>)[id] ?? {};
  const reps = (n: number, r: number) => Array.from({ length: n }, () => r);
  const NOW = new Date("2026-10-08T12:00:00Z");
  const row = (rows: ReturnType<typeof recoveryByPart>, part: string) => rows.find((r) => r.part === part)!;

  it("작은 근육은 빨리, 하체는 오래 — 같은 세트여도", () => {
    expect([recoveryHours("arm", 1), recoveryHours("chest", 1), recoveryHours("lower", 1)]).toEqual([48, 72, 84]);
    // 평소의 절반만 하면 시간도 절반, 4분의 1이 안 되면 회복이 필요 없다. 넘겨 해도 1.3배에서 멈춘다.
    expect([recoveryHours("chest", 0.5), recoveryHours("chest", 0.24), recoveryHours("chest", 0.2), recoveryHours("chest", 3)]).toEqual([36, 0, 0, 94]);
  });

  it("무거운 무게(5회 이하)는 1.2배, 가벼운 펌핑(15회 이상)은 0.85배", () => {
    expect(recoveryHours("chest", 1, "heavy")).toBe(86);
    expect(recoveryHours("chest", 1, "light")).toBe(61);
  });

  it("어제 같은 시각 가슴 12세트(10회)와 팔 6세트 — 평소보다 20% 더 한 가슴은 62시간, 절반쯤 한 팔은 5시간 남음", () => {
    const rows = recoveryByPart(
      [
        { exerciseId: "bench", reps: reps(6, 10), doneAt: "2026-10-07T11:00:00Z" },
        { exerciseId: "bench", reps: reps(6, 10), doneAt: "2026-10-07T12:00:00Z" }, // 같은 날 = 한 번(12세트)
        { exerciseId: "curl", reps: reps(6, 10), doneAt: "2026-10-07T12:00:00Z" },
      ],
      stim,
      NOW,
      null,
      P,
    );
    // 가슴: 72시간 × 1.2 = 86시간 필요, 24시간 지남. 팔: 48시간 × 0.6 = 29시간 필요.
    expect(row(rows, "chest")).toMatchObject({ pct: 28, hoursLeft: 62, sets: 12, loadPct: 120, intensity: "normal", stacked: false, lastAt: "2026-10-07T12:00:00.000Z" });
    expect(row(rows, "arm")).toMatchObject({ pct: 83, hoursLeft: 5, loadPct: 60 });
    expect(row(rows, "lower")).toMatchObject({ pct: 100, hoursLeft: 0, lastAt: null, easy: null });
  });

  it("무거운 무게로 하면 같은 세트도 더 오래 걸린다", () => {
    const normal = row(recoveryByPart([{ exerciseId: "bench", reps: reps(12, 10), doneAt: "2026-10-07T12:00:00Z" }], stim, NOW, null, P), "chest");
    const heavy = row(recoveryByPart([{ exerciseId: "bench", reps: reps(12, 4), doneAt: "2026-10-07T12:00:00Z" }], stim, NOW, null, P), "chest");
    expect(heavy.intensity).toBe("heavy");
    expect(heavy.hoursLeft).toBeGreaterThan(normal.hoursLeft);
  });

  it("다 안 풀린 채 또 하면 피로가 쌓인다(남은 시간 절반을 얹는다)", () => {
    // 10/6 12시 하체 12세트(84 × 1.2 = 101시간) · 10/7 12시 또 하체 6세트(84 × 0.6 = 50시간 + 남은 77시간의 절반)
    const rows = recoveryByPart(
      [
        { exerciseId: "squat", reps: reps(12, 8), doneAt: "2026-10-06T12:00:00Z" },
        { exerciseId: "squat", reps: reps(6, 8), doneAt: "2026-10-07T12:00:00Z" },
      ],
      stim,
      NOW,
      null,
      P,
    );
    expect(row(rows, "lower")).toMatchObject({ stacked: true, sets: 6, hoursLeft: 65 }); // 50 + 38.5 - 24
  });

  it("오늘 근육통 '심해요'·잠 '못 잤어요'면 남은 시간이 길어지고, 다 풀린 부위엔 영향 없다", () => {
    const recs = [{ exerciseId: "bench", reps: reps(12, 10), doneAt: "2026-10-07T12:00:00Z" }];
    const base = row(recoveryByPart(recs, stim, NOW, null, P), "chest");
    const sore = row(recoveryByPart(recs, stim, NOW, { soreness: 1, sleep: 1 }, P), "chest");
    expect(sore.hoursLeft).toBe(Math.ceil((86 - 24) * 1.25 * 1.1));
    expect(sore.condition).toEqual(["soreness", "sleep"]);
    expect(sore.pct).toBeLessThan(base.pct);
    expect(row(recoveryByPart(recs, stim, NOW, { soreness: 1, sleep: 1 }, P), "lower")).toMatchObject({ pct: 100, condition: [] });
  });

  it("시간이 다 지나면 회복됨", () => {
    const rows = recoveryByPart([{ exerciseId: "curl", reps: reps(3, 10), doneAt: "2026-10-07T12:00:00Z" }], stim, NOW, null, P);
    expect(row(rows, "arm").pct).toBe(100); // 작은 근육 · 부하 0.3 = 14시간
  });

  it("내가 100kg 드는데 20kg 으로 깔짝 한 날은 회복이 필요 없다 — 같은 세트를 80kg 으로 하면 회복한다(2026-10-14)", () => {
    const mine = { ...P, oneRmOf: () => 100 };
    const at = "2026-10-08T10:00:00Z"; // 2시간 전
    const light = row(recoveryByPart([{ exerciseId: "bench", reps: reps(4, 10), weights: reps(4, 20), doneAt: at }], stim, NOW, null, mine), "chest");
    expect(light).toMatchObject({ pct: 100, hoursLeft: 0, lastAt: null });
    expect(light.easy).toMatchObject({ at: "2026-10-08T10:00:00.000Z" });
    expect(light.easy!.loadPct).toBeLessThan(5);
    // 80kg 6회 = 그 무게로 할 수 있는 7.5회 중 6회 → 세트마다 0.72, 4세트 = 2.9 힘든 세트 = 내 소화량의 48%.
    const hard = row(recoveryByPart([{ exerciseId: "bench", reps: reps(4, 6), weights: reps(4, 80), doneAt: at }], stim, NOW, null, mine), "chest");
    expect(hard).toMatchObject({ loadPct: 48, easy: null });
    expect(hard.hoursLeft).toBe(32); // 72 × 0.48 = 34시간 − 2시간
  });

  it("같은 운동도 소화량이 큰 사람은 덜 쉰다", () => {
    const recs = [{ exerciseId: "bench", reps: reps(8, 10), doneAt: "2026-10-08T10:00:00Z" }];
    const small = row(recoveryByPart(recs, stim, NOW, null, P), "chest");
    const big = row(recoveryByPart(recs, stim, NOW, null, { ...P, capacity: { ...P.capacity, chest: 12 } }), "chest");
    expect(big.hoursLeft).toBeLessThan(small.hoursLeft);
    expect([small.loadPct, big.loadPct]).toEqual([80, 40]);
  });
});

describe("끝낸 시각 — 나중에 채운 기록은 그날 저녁으로", () => {
  it("저장 시각이 그날(서울)이면 그대로, 다른 날이면 그날 19시, 없으면 19시", () => {
    expect(doneAtOf("2026-10-07T11:30:00Z", "2026-10-07")).toBe("2026-10-07T11:30:00.000Z"); // 10/7 20:30 서울
    expect(doneAtOf("2026-10-08T03:00:00Z", "2026-09-28")).toBe("2026-09-28T10:00:00Z"); // 9/28 운동을 10/8 에 채움
    expect(doneAtOf(null, "2026-10-01")).toBe("2026-10-01T10:00:00Z");
  });
});

describe("내 몸 기준 — 예상 최대 · 소화량 · 골격근량(2026-10-14)", () => {
  const stim = (id: string): Record<string, number> => (id === "bench" ? { "chest-mid": 100 } : {});
  const NOW = new Date("2026-10-08T12:00:00Z");
  const rec = (date: string, kg: number, reps: number, sets: number) => ({
    forDate: date, exerciseId: "bench", status: "done" as const, sets, reps, weightKg: kg, setDetails: null, doneAt: `${date}T10:00:00Z`,
  });

  it("세트의 힘든 정도 — 그 무게로 할 수 있는 횟수 중 몇 회를 했나", () => {
    expect(setHardness({ reps: 10, weightKg: 20 }, 100)).toBeLessThan(0.03); // 120회 중 10회
    expect(setHardness({ reps: 6, weightKg: 80 }, 100)).toBeCloseTo(0.716, 2); // 7.5회 중 6회
    expect(setHardness({ reps: 8, weightKg: 80 }, 100)).toBe(1); // 한계까지
    expect(setHardness({ reps: 5, weightKg: null }, null, 20)).toBeCloseTo(0.125, 3); // 맨몸 — 최고 20회 중 5회
    expect(setHardness({ reps: 10, weightKg: 40 }, null)).toBe(0.6); // 모르면 보통 세트
  });

  it("예상 최대는 내 기록에서, 소화량은 최근 며칠을 뺀 6주 동안 평소 한 양에서 나온다", () => {
    // 9월에 80kg 8회(1RM 101.3) 10세트씩 4번 — 세트마다 한계 → 하루 10 힘든 세트.
    const history = ["2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"].map((d) => rec(d, 80, 8, 10));
    const p = buildRecoveryProfile([...history, rec("2026-10-08", 20, 10, 4)], stim, NOW, { experience: "beginner" });
    expect(p.oneRmOf("bench")).toBe(101.3);
    expect(p.capacity.chest).toBe(10); // 초급 바닥값(4.5)보다 내 기록이 크다
    expect(p.capacity.lower).toBe(4.5); // 기록이 없는 부위는 경력 바닥값
  });

  it("기록이 없는 종목은 몸으로 어림한 최대를 쓴다 — 처음 가볍게 해 본 날을 한계로 보지 않는다", () => {
    const p = buildRecoveryProfile([rec("2026-10-08", 20, 10, 4)], stim, NOW, {}, () => 60);
    expect(p.oneRmOf("bench")).toBe(60); // 오늘 20kg 10회(1RM 26.7)보다 몸으로 어림한 60
    expect(buildRecoveryProfile([], stim, NOW, {}).oneRmOf("bench")).toBeNull();
  });

  it("골격근량이 많으면 소화량도 크다(체중 대비, 성별 평균에 견줘 0.8~1.25배)", () => {
    expect(muscleFactor({ gender: "male", weightKg: 80, skeletalMuscleKg: 40 })).toBeCloseTo(1.136, 2);
    expect(muscleFactor({ gender: "female", weightKg: 60, skeletalMuscleKg: 20 })).toBeCloseTo(0.877, 2);
    expect(muscleFactor({ gender: "male", weightKg: 80, skeletalMuscleKg: 60 })).toBe(1.25);
    expect(muscleFactor({ weightKg: 80 })).toBe(1);
    expect(defaultRecoveryProfile({ experience: "advanced", gender: "male", weightKg: 80, skeletalMuscleKg: 40 }).capacity.chest).toBe(10.8);
  });
});
