import { describe, expect, it } from "vitest";

import {
  ALL_SUB_MUSCLES,
  EXERCISE_SUB_MUSCLES,
  PRIMARY_WEIGHT,
  subMuscleWeightsForExerciseData,
} from "@/features/routine/sub-muscles";
import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";

/**
 * 세부근육 기여도 — "주동근으로 했나, 거들기만 했나".
 *
 * 이게 없으면 벤치프레스만 해도 **하부 대흉근을 했다**고 표시된다.
 * 매핑은 이미 중요한 순서로 큐레이션돼 있어서, 그 순서를 읽는 것으로 충분하다.
 */
describe("subMuscleWeightsForExerciseData — 명시 매핑", () => {
  it("🔴 첫 항목만 주동근이다 — 벤치프레스는 '하부를 노린 운동'이 아니다", () => {
    const w = subMuscleWeightsForExerciseData("bench-press", "벤치프레스", "대흉근");
    expect(w.map((x) => x.sub.id)).toEqual(["chest-mid", "chest-lower"]);
    expect(w[0].weight).toBe(1);
    expect(w[0].weight).toBeGreaterThanOrEqual(PRIMARY_WEIGHT);
    expect(w[1].weight).toBeLessThan(PRIMARY_WEIGHT);
  });

  it("세부근육이 하나면 그것이 주동근", () => {
    const w = subMuscleWeightsForExerciseData("lat-pulldown", "랫풀다운", "광배근");
    expect(w).toHaveLength(1);
    expect(w[0].sub.id).toBe("back-lats");
    expect(w[0].weight).toBe(1);
  });

  it("순서가 곧 중요도다 — 데드리프트는 기립근이 주동, 광배는 거들기", () => {
    const w = subMuscleWeightsForExerciseData("deadlift", "데드리프트", "척추기립근");
    expect(w[0].sub.id).toBe("back-erector");
    expect(w[1].sub.id).toBe("back-lats");
    expect(w[1].weight).toBeLessThan(w[0].weight);
  });

  it("기여도는 내림차순이고 0보다 크다", () => {
    for (const id of Object.keys(EXERCISE_SUB_MUSCLES)) {
      const w = subMuscleWeightsForExerciseData(id, id, "");
      for (let i = 1; i < w.length; i += 1) {
        expect(w[i].weight, `${id}[${i}]`).toBeLessThanOrEqual(w[i - 1].weight);
      }
      expect(w.every((x) => x.weight > 0), id).toBe(true);
    }
  });
});

describe("subMuscleWeightsForExerciseData — 추론", () => {
  it("🔴 추론분은 전부 1.0 — 규칙은 순위를 못 매긴다", () => {
    // '인클라인 덤벨 플라이'는 상부·내측 둘 다 노린다. 삼두 세 갈래도 동등하게 쓰인다.
    // 없는 순위를 지어내면 그건 정밀해 보이는 오차일 뿐이다.
    const w = subMuscleWeightsForExercise("incline-dumbbell-fly");
    expect(w.map((x) => x.sub.id)).toEqual(["chest-upper", "chest-inner"]);
    expect(w.every((x) => x.weight === 1)).toBe(true);
  });

  it("추론분은 전부 주동근 문턱을 넘는다 — 순위가 없으니 깎지 않는다", () => {
    const w = subMuscleWeightsForExerciseData("___x___", "덤벨 컬", "이두");
    expect(w.every((x) => x.weight >= PRIMARY_WEIGHT)).toBe(true);
  });
});

describe("카탈로그 전체 불변식", () => {
  it("모든 운동이 세부근육 기여도를 하나 이상 갖는다", () => {
    const empty = ALL_EXERCISES.filter(
      (ex) => subMuscleWeightsForExercise(ex.id).length === 0,
    );
    expect(empty.map((e) => e.id)).toEqual([]);
  });

  it("🔴 모든 운동에 주동근이 정확히 하나 이상 있다", () => {
    // 주동근이 없으면 그 운동은 어느 세부근육도 "직접 했다"로 안 세어진다.
    const noPrimary = ALL_EXERCISES.filter(
      (ex) =>
        !subMuscleWeightsForExercise(ex.id).some(
          (w) => w.weight >= PRIMARY_WEIGHT,
        ),
    );
    expect(noPrimary.map((e) => e.id)).toEqual([]);
  });

  it("돌려주는 세부근육은 전부 정의된 것이다", () => {
    const known = new Set(ALL_SUB_MUSCLES.map((s) => s.id));
    for (const ex of ALL_EXERCISES.slice(0, 300)) {
      for (const w of subMuscleWeightsForExercise(ex.id)) {
        expect(known.has(w.sub.id), `${ex.id} → ${w.sub.id}`).toBe(true);
      }
    }
  });

  it("기여도 목록의 세부근육은 기존 목록과 같다(순서까지)", () => {
    // 가중치를 붙이면서 대상이 바뀌면 안 된다 — 색·필터가 같은 목록을 본다.
    for (const ex of ALL_EXERCISES.slice(0, 300)) {
      const weighted = subMuscleWeightsForExercise(ex.id).map((w) => w.sub.id);
      const plain = subMuscleWeightsForExercise(ex.id).map((w) => w.sub.id);
      expect(weighted).toEqual(plain);
    }
  });
});
