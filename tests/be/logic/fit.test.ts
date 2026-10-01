import { describe, expect, it } from "vitest";

import { EXERCISE_STIMULUS, hasCuratedStimulus, stimulusFor } from "@/features/routine/exercise-stimulus";
import { BODY_TARGETS, defaultStyle, sumTargets, weeklyTargets } from "@/features/routine/body-targets";
import {
  balanceRows,
  mostLacking,
  partRows,
  pickExercises,
  recoveringSubs,
  subRows,
  subStatus,
  weeklyStimulus,
  type FitCandidate,
} from "@/features/routine/fit";
import { ALL_SUB_MUSCLES } from "@/features/routine/sub-muscles";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";

const SUB_IDS = new Set(ALL_SUB_MUSCLES.map((s) => s.id));
const stimOf = (id: string) => stimulusFor(id);

describe("운동별 세부 점수표", () => {
  it("🔴 손으로 적은 운동은 카탈로그에 있고, 세부 근육 id 가 맞고, 0~100, 주동근 100 이 하나 이상", () => {
    for (const [ex, s] of Object.entries(EXERCISE_STIMULUS)) {
      expect(getCatalogExercise(ex), `${ex} 카탈로그에 없음`).toBeTruthy();
      const vals = Object.entries(s);
      expect(vals.length, ex).toBeGreaterThan(0);
      for (const [sub, v] of vals) {
        expect(SUB_IDS.has(sub), `${ex}: ${sub}`).toBe(true);
        expect(v, `${ex}: ${sub}`).toBeGreaterThanOrEqual(0);
        expect(v, `${ex}: ${sub}`).toBeLessThanOrEqual(100);
      }
      expect(vals.some(([, v]) => v === 100), `${ex}: 주동근 100 없음`).toBe(true);
    }
  });

  it("벤치프레스는 보조근(삼두·전면 어깨)까지 센다 — 예전엔 '삼두 안 함'으로 나왔다", () => {
    const b = stimulusFor("bench-press");
    expect(b["chest-mid"]).toBe(100);
    expect(b["shoulder-front"]).toBe(55);
    expect(b["arm-triceps-lateral"]).toBe(45);
  });

  it("변형 id 는 기본 운동 점수를 쓴다", () => {
    expect(stimulusFor("hammer-curl-2")).toEqual(stimulusFor("hammer-curl"));
    expect(hasCuratedStimulus("rope-triceps-pushdown")).toBe(true);
  });

  it("손 점수가 없으면 기존 가중치 ×100 + 보조근 규칙", () => {
    const s = stimulusFor("some-chest-press", [{ id: "chest-mid", weight: 1 }]);
    expect(s["chest-mid"]).toBe(100);
    expect(s["shoulder-front"]).toBe(50);
    expect(s["arm-triceps-lateral"]).toBe(40);
    const row = stimulusFor("some-row", [{ id: "back-rhomboids", weight: 1 }, { id: "back-lats", weight: 0.5 }]);
    expect(row["back-lats"]).toBe(50);
    expect(row["arm-biceps-long"]).toBe(35);
    expect(stimulusFor("unknown")).toEqual({});
  });
});

describe("목표 비율", () => {
  it("남성 77 · 여성 66 (중급), 남성 삼두 8 : 이두 4.5 · 여성 둔근 8 · 하체 22", () => {
    expect(sumTargets(BODY_TARGETS.male)).toBe(77);
    expect(sumTargets(BODY_TARGETS.female)).toBe(66);
    expect(sumTargets(BODY_TARGETS.male, "arm-triceps")).toBe(8);
    expect(sumTargets(BODY_TARGETS.male, "arm-biceps")).toBe(4.5);
    expect(BODY_TARGETS.female["lower-glutes"]).toBe(8);
    expect(sumTargets(BODY_TARGETS.female, "lower-")).toBe(22);
  });

  it("목표 표의 세부 근육은 실제 세부 근육과 정확히 같다(25개)", () => {
    for (const style of ["male", "female", "balanced"] as const) {
      expect(new Set(Object.keys(BODY_TARGETS[style]))).toEqual(SUB_IDS);
    }
    expect(SUB_IDS.size).toBe(25);
  });

  it("경력 배율 — 입문 남성 삼두 장두 4 × 0.6 = 2.4", () => {
    expect(weeklyTargets("male", "beginner")["arm-triceps-long"]).toBe(2.4);
    expect(weeklyTargets("male", "advanced")["shoulder-side"]).toBe(7.5);
    expect(weeklyTargets("female", null)["lower-glutes"]).toBe(8);
  });

  it("기본 스타일은 성별", () => {
    expect(defaultStyle("female")).toBe("female");
    expect(defaultStyle("male")).toBe("male");
    expect(defaultStyle(null)).toBe("male");
  });
});

describe("이번 주 자극", () => {
  it("벤치프레스 4세트 → 가슴 중부 4.0 · 전면 어깨 2.2 · 삼두 외측두 1.8", () => {
    const s = weeklyStimulus([{ exerciseId: "bench-press", forDate: "2026-10-01", sets: 4 }], stimOf);
    expect(s["chest-mid"]).toBe(4);
    expect(s["shoulder-front"]).toBe(2.2);
    expect(s["arm-triceps-lateral"]).toBe(1.8);
  });

  it("상태: 안 함 · 부족(<50%) · 조금(<80%) · 적정(≤150%) · 많음", () => {
    expect(subStatus(0, 4)).toBe("none");
    expect(subStatus(1.6, 4)).toBe("low");
    expect(subStatus(3, 4)).toBe("some");
    expect(subStatus(4, 4)).toBe("ok");
    expect(subStatus(7, 4)).toBe("high");
  });

  it("가장 모자란 곳 — % 낮은 순", () => {
    const t = weeklyTargets("male", "intermediate");
    const s = weeklyStimulus(
      [
        { exerciseId: "bench-press", forDate: "2026-10-01", sets: 6 },
        { exerciseId: "triceps-pushdown", forDate: "2026-10-01", sets: 3 },
        { exerciseId: "lat-pulldown", forDate: "2026-10-01", sets: 6 },
      ],
      stimOf,
    );
    const lack = mostLacking(subRows(t, s), 3).map((r) => r.sub);
    // 하체·어깨 옆을 전혀 안 했으니 0% 인 곳 중 목표가 가장 큰(6) 둘이 먼저.
    expect(lack.slice(0, 2).sort()).toEqual(["lower-quads", "shoulder-side"]);
  });

  it("부위 6개 요약", () => {
    const t = weeklyTargets("male", "intermediate");
    const p = partRows(t, { "chest-mid": 4 });
    expect(p.find((r) => r.part === "chest")).toMatchObject({ stim: 4, target: 12, pct: 33, status: "low" });
  });
});

describe("모자란 곳을 채우는 운동 고르기", () => {
  const CANDS: FitCandidate[] = [
    { exerciseId: "lateral-raise", name: "사이드 레터럴", equipment: "dumbbell" },
    { exerciseId: "overhead-triceps-extension", name: "오버헤드 익스텐션", equipment: "dumbbell" },
    { exerciseId: "bench-press", name: "벤치프레스", equipment: "barbell" },
    { exerciseId: "face-pull", name: "페이스 풀", equipment: "cable" },
  ];

  it("🔴 가슴은 이미 많이 하고 어깨 옆·뒤·삼두 장두가 비면 → 그걸 채우는 운동, 벤치는 안 고른다", () => {
    const t = weeklyTargets("male", "intermediate");
    const s = weeklyStimulus(
      [
        // 벤치도 삼두 장두에 25점씩 들어간다 — 12세트면 장두가 이미 찬다. 6세트 + 푸시다운 2세트면 모자란다.
        { exerciseId: "bench-press", forDate: "2026-09-28", sets: 6 },
        { exerciseId: "triceps-pushdown", forDate: "2026-09-28", sets: 2 },
      ],
      stimOf,
    );
    const picks = pickExercises(CANDS, t, s, stimOf, { n: 3 });
    const ids = picks.map((p) => p.exerciseId);
    // 페이스 풀은 후면 어깨·능형·승모를 한꺼번에 채워 모자란 양을 가장 많이 메운다.
    expect(ids).toEqual(expect.arrayContaining(["face-pull", "lateral-raise", "overhead-triceps-extension"]));
    expect(ids).not.toContain("bench-press");
    expect(picks.find((p) => p.exerciseId === "lateral-raise")!.fills[0]).toEqual({ sub: "shoulder-side", add: 3 });
  });

  it("오늘 이미 할 운동은 빼고, 회복 중인 곳은 뒤로", () => {
    const t = weeklyTargets("male", "intermediate");
    const picks = pickExercises(CANDS, t, {}, stimOf, { n: 4, exclude: new Set(["lateral-raise"]) });
    expect(picks.map((p) => p.exerciseId)).not.toContain("lateral-raise");
    const rec = recoveringSubs(
      [{ exerciseId: "face-pull", forDate: "2026-10-01", sets: 3 }],
      stimOf,
      "2026-10-01",
      "2026-09-30",
    );
    expect(rec.has("shoulder-rear")).toBe(true);
  });

  it("다 채웠으면 아무것도 안 고른다", () => {
    const t = { "shoulder-side": 3 };
    expect(pickExercises(CANDS, t, { "shoulder-side": 3 }, stimOf)).toEqual([]);
  });
});

describe("균형", () => {
  it("밀기만 했으면 당기기 쪽이 모자라다고 말한다", () => {
    const t = weeklyTargets("male", "intermediate");
    const s = weeklyStimulus([{ exerciseId: "bench-press", forDate: "2026-10-01", sets: 10 }], stimOf);
    const pp = balanceRows(t, s).find((b) => b.id === "push-pull")!;
    expect(pp.parts[0].now).toBe(100);
    expect(pp.hint).toContain("당기기");
  });

  it("기록이 없으면 안내 없음", () => {
    const rows = balanceRows(weeklyTargets("female", "beginner"), {});
    expect(rows.every((r) => r.hint === "")).toBe(true);
  });
});
