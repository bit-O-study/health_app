import { describe, it, expect } from "vitest";

import {
  petStage,
  nextStage,
  petScale,
  stageProgress,
  levelsToEvolve,
  PET_STAGES,
} from "@/features/groups/evolution";

describe("petStage", () => {
  it("레벨 구간마다 알→아기→청소년→어른→할아버지", () => {
    expect(petStage(0).id).toBe("egg");
    expect(petStage(9).id).toBe("egg");
    expect(petStage(10).id).toBe("baby");
    expect(petStage(29).id).toBe("baby");
    expect(petStage(30).id).toBe("teen");
    expect(petStage(69).id).toBe("teen");
    expect(petStage(70).id).toBe("adult");
    expect(petStage(199).id).toBe("adult");
    expect(petStage(200).id).toBe("elder");
    expect(petStage(9999).id).toBe("elder");
  });

  it("음수/NaN 은 알(egg)", () => {
    expect(petStage(-5).id).toBe("egg");
    expect(petStage(NaN).id).toBe("egg");
  });
});

describe("nextStage", () => {
  it("다음 단계를 알려주고 마지막은 null", () => {
    expect(nextStage(0)?.id).toBe("baby");
    expect(nextStage(30)?.id).toBe("adult");
    expect(nextStage(200)).toBeNull();
  });
});

describe("petScale", () => {
  it("한 단계 안에서 커지되 상한(maxScale)을 넘지 않는다", () => {
    for (const s of PET_STAGES) {
      const atMin = petScale(s.minLevel);
      const atMaxLevel = s.maxLevel ?? s.minLevel + 50;
      const atMax = petScale(atMaxLevel);
      expect(atMin).toBeCloseTo(s.minScale, 5);
      expect(atMax).toBeLessThanOrEqual(s.maxScale + 1e-9);
      expect(atMax).toBeGreaterThanOrEqual(atMin);
    }
  });

  it("레벨이 아주 높아도 상한을 넘지 않는다", () => {
    expect(petScale(100000)).toBeLessThanOrEqual(1.7 + 1e-9);
  });
});

describe("stageProgress / levelsToEvolve", () => {
  it("단계 진행도는 0~1", () => {
    expect(stageProgress(10)).toBeCloseTo(0, 5);
    expect(stageProgress(29)).toBeGreaterThan(0.9);
    expect(stageProgress(29)).toBeLessThanOrEqual(1);
  });

  it("다음 진화까지 남은 레벨, 마지막은 null", () => {
    expect(levelsToEvolve(9)).toBe(1); // 9→10 에 진화
    expect(levelsToEvolve(10)).toBe(20); // 10..29, 30에서 진화
    expect(levelsToEvolve(200)).toBeNull();
  });
});