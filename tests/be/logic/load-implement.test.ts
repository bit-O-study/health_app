import { describe, expect, it } from "vitest";

import { EXERCISES } from "@/features/routine/exercise-catalog";
import { EXTRA_EXERCISES } from "@/features/routine/exercise-catalog-extra";
import {
  implementInfo,
  isSingleDumbbellExercise,
  loadImplementOf,
} from "@/features/routine/load-implement";
import { implementFor } from "@/features/routine/progress";

describe("운동 도구 분석 — 무엇을 몇 개 드는가", () => {
  it("덤벨 2개(양손) — 벤치프레스·레터럴·컬·런지", () => {
    for (const id of [
      "bench-press",
      "dumbbell-bench-press",
      "lateral-raise",
      "dumbbell-biceps-curl",
      "dumbbell-lunge",
      "dumbbell-shoulder-press",
      "farmer-s-carry",
    ]) {
      expect(loadImplementOf(id, "dumbbell"), id).toBe("dumbbell-pair");
    }
  });

  it("덤벨 1개 — 원암·싱글암·고블릿·컨센트레이션·풀오버·킥백", () => {
    for (const id of [
      "one-arm-dumbbell-row",
      "single-arm-dumbbell-bench-press",
      "goblet-squat",
      "heel-elevated-goblet-squat",
      "concentration-curl",
      "dumbbell-pullover",
      "triceps-kickback",
      "overhead-triceps-extension",
      "suitcase-carry",
      "russian-twist",
      // 기본 '로우' 의 덤벨 변형은 "벤치에 한 손 지지" 원암 로우다.
      "barbell-row",
    ]) {
      expect(loadImplementOf(id, "dumbbell"), id).toBe("dumbbell-single");
    }
  });

  it("바벨·스미스·랜드마인은 봉 하나 — 바벨", () => {
    expect(loadImplementOf("squat", "barbell")).toBe("barbell");
    expect(loadImplementOf("squat", "smith")).toBe("barbell");
    expect(loadImplementOf("landmine-row", "landmine")).toBe("barbell");
    // 같은 '로우' 라도 바벨로 하면 바벨이다.
    expect(loadImplementOf("barbell-row", "barbell")).toBe("barbell");
  });

  it("원판 하나 · 머신·케이블 · 케틀벨 1개/2개", () => {
    expect(loadImplementOf("plate-front-raise", "plate")).toBe("plate");
    expect(loadImplementOf("pec-deck", "machine")).toBe("machine");
    expect(loadImplementOf("face-pull", "cable")).toBe("machine");
    expect(loadImplementOf("kettlebell-swing", "kettlebell")).toBe("kettlebell-single");
    expect(loadImplementOf("double-kettlebell-press", "kettlebell")).toBe("kettlebell-pair");
    expect(loadImplementOf("kettlebell-renegade-row", "kettlebell")).toBe("kettlebell-pair");
  });

  it("맨몸·밴드·TRX 는 무게 없음", () => {
    expect(loadImplementOf("push-up", "bodyweight")).toBe("none");
    expect(loadImplementOf("band-pull-apart", "band")).toBe("none");
    expect(implementFor("pull-up", null)).toBe("none");
    expect(implementInfo("none").stepKg).toBeNull();
  });

  it("기구를 모르면 운동 id 에 박힌 기구로 짐작한다", () => {
    expect(loadImplementOf("dumbbell-bench-press", null)).toBe("dumbbell-pair");
    expect(loadImplementOf("barbell-shrug", null)).toBe("barbell");
    expect(loadImplementOf("kettlebell-swing", null)).toBe("kettlebell-single");
    // 짐작할 단서가 없으면 미지정(원판 기준 2.5kg).
    expect(loadImplementOf("squat", null)).toBe("unknown");
    expect(implementInfo("unknown").stepKg).toBe(2.5);
  });

  it("도구별 증량 단위 — 덤벨 2개 4 · 덤벨 1개 2 · 바벨 5 · 원판 5 · 기구 5", () => {
    expect(implementInfo("dumbbell-pair").stepKg).toBe(4);
    expect(implementInfo("dumbbell-single").stepKg).toBe(2);
    expect(implementInfo("barbell").stepKg).toBe(5);
    expect(implementInfo("plate").stepKg).toBe(5);
    expect(implementInfo("machine").stepKg).toBe(5);
  });

  it("눈금은 항상 단위를 나눠 떨어지게 한다 — 단위만큼 움직여도 눈금 위에 있다", () => {
    for (const key of [
      "dumbbell-pair",
      "dumbbell-single",
      "barbell",
      "plate",
      "machine",
      "kettlebell-single",
      "kettlebell-pair",
      "medicineball",
      "sled",
      "unknown",
    ] as const) {
      const { stepKg, gridKg } = implementInfo(key);
      expect(stepKg! % gridKg!, key).toBe(0);
    }
  });
});

describe("카탈로그 전체 점검", () => {
  const all = { ...EXTRA_EXERCISES, ...EXERCISES };
  const dumbbellIds = Object.values(all)
    .filter((e) => e.equipments.some((v) => v.equipment === "dumbbell"))
    .map((e) => e.id);

  it("덤벨 종목은 전부 1개/2개 중 하나로 분류된다", () => {
    expect(dumbbellIds.length).toBeGreaterThan(100);
    for (const id of dumbbellIds) {
      expect(["dumbbell-pair", "dumbbell-single"], id).toContain(
        loadImplementOf(id, "dumbbell"),
      );
    }
  });

  it("'덤벨 1개' 로 분류한 종목은 모두 카탈로그에 덤벨 변형이 있다(오타·죽은 id 방지)", () => {
    const set = new Set(dumbbellIds);
    const singles = dumbbellIds.filter(isSingleDumbbellExercise);
    expect(singles.length).toBeGreaterThan(20);
    for (const id of singles) expect(set.has(id)).toBe(true);
  });

  it("운동법에 '덤벨 한 개' 라고 적힌 기본 종목은 1개로 분류된다", () => {
    for (const ex of Object.values(EXERCISES)) {
      const v = ex.equipments.find((x) => x.equipment === "dumbbell");
      const text = (v?.method ?? []).join(" ");
      if (/덤벨 한 ?개|한 손/.test(text)) {
        expect(loadImplementOf(ex.id, "dumbbell"), ex.id).toBe("dumbbell-single");
      }
    }
  });
});
