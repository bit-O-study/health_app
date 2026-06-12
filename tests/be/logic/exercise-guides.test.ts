import { describe, expect, it } from "vitest";

import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
import { guideFor } from "@/features/workout-timer/exercise-guides";

// 운동 모드(가이드)에서 보여주는 상세 가이드 — 자세 잡기 / 자극 부위 / 핵심 포인트 /
// 초보 팁. 모든 운동이 (전용이든 카테고리 폴백이든) 비지 않은 가이드를 가져야 한다.

describe("guideFor", () => {
  it("모든 카탈로그 운동이 비지 않은 상세 가이드를 가진다", () => {
    for (const ex of ALL_EXERCISES) {
      const g = guideFor(ex.id);
      expect(g, ex.id).toBeTruthy();
      expect(g.setup.trim().length, `${ex.id} setup`).toBeGreaterThan(0);
      expect(g.targets.length, `${ex.id} targets`).toBeGreaterThan(0);
      expect(g.cues.length, `${ex.id} cues`).toBeGreaterThan(0);
      expect(g.beginnerTips.length, `${ex.id} tips`).toBeGreaterThan(0);
      // 자극 부위는 이름 + 느낌이 모두 있어야 카드에 의미가 있다.
      for (const t of g.targets) {
        expect(t.name.trim().length, `${ex.id} target name`).toBeGreaterThan(0);
        expect(t.feel.trim().length, `${ex.id} target feel`).toBeGreaterThan(0);
      }
    }
  });

  it("스쿼트는 전용 가이드 — 엉덩이부터 빼는 핵심 큐가 있다", () => {
    const g = guideFor("squat");
    expect(g.targets.some((t) => t.name.includes("대퇴사두"))).toBe(true);
    expect(g.cues.some((c) => c.includes("엉덩이"))).toBe(true);
    expect(g.beginnerTips.length).toBeGreaterThanOrEqual(2);
  });

  it("매핑 안 된(전용 가이드 없는) 운동도 카테고리 폴백으로 채워진다", () => {
    // 존재하지 않는 id 라도 motionCategory 폴백으로 빈 값이 아니어야 한다.
    const g = guideFor("nonexistent-exercise-id");
    expect(g.setup.length).toBeGreaterThan(0);
    expect(g.cues.length).toBeGreaterThan(0);
  });

  it("하체 고립은 스쿼트 폴백이 아니라 자기 부위 안내가 나온다", () => {
    // 예전엔 squat 카테고리로 묶여 '바는 승모근 위' 같은 엉뚱한 안내가 나갔다.
    const legCurl = guideFor("leg-curl");
    expect(legCurl.targets.some((t) => t.name.includes("햄스트링"))).toBe(true);
    expect(legCurl.setup.includes("승모근")).toBe(false);

    const legExt = guideFor("leg-extension");
    expect(legExt.targets.some((t) => t.name.includes("대퇴사두"))).toBe(true);

    const calf = guideFor("standing-calf-raise");
    expect(calf.targets.some((t) => t.name.includes("비복근"))).toBe(true);

    const adduction = guideFor("hip-adduction");
    expect(adduction.targets.some((t) => t.name.includes("내전근"))).toBe(true);
  });
});
