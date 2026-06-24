import { describe, expect, it } from "vitest";

import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
import { exerciseSummary } from "@/features/workout-timer/exercise-guides";

// 운동모드·상세에서 쓰는 '간결 요약' — 한 줄(자세/그립→타겟) + 핵심 큐 + 타겟 부위.
// 모든 운동이 (전용이든 카테고리 폴백이든) 비지 않은 요약을 가져야 한다.

describe("exerciseSummary", () => {
  it("모든 카탈로그 운동이 비지 않은 한 줄 요약·핵심·타겟을 가진다", () => {
    for (const ex of ALL_EXERCISES) {
      const s = exerciseSummary(ex.id);
      expect(s.oneLiner.trim().length, `${ex.id} oneLiner`).toBeGreaterThan(0);
      expect(s.cues.length, `${ex.id} cues`).toBeGreaterThan(0);
      expect(s.cues.length, `${ex.id} cues<=3`).toBeLessThanOrEqual(3);
      expect(s.targets.length, `${ex.id} targets`).toBeGreaterThan(0);
      for (const c of s.cues) {
        expect(c.trim().length, `${ex.id} cue text`).toBeGreaterThan(0);
      }
      for (const t of s.targets) {
        // 타겟 칩은 괄호 설명을 떼고 부위명만 남아야 한다.
        expect(t.trim().length, `${ex.id} target`).toBeGreaterThan(0);
        expect(t.includes("("), `${ex.id} target no paren`).toBe(false);
      }
    }
  });

  it("벤치프레스 한 줄 요약은 그립과 타겟(대흉근/가슴)을 담는다", () => {
    const s = exerciseSummary("bench-press");
    expect(s.oneLiner).toContain("그립");
    expect(s.oneLiner.includes("대흉근") || s.oneLiner.includes("가슴")).toBe(
      true,
    );
  });

  it("전용 요약이 없는 운동도 카테고리 폴백으로 비지 않는다", () => {
    const s = exerciseSummary("nonexistent-exercise-id");
    expect(s.oneLiner.length).toBeGreaterThan(0);
    expect(s.cues.length).toBeGreaterThan(0);
  });
});