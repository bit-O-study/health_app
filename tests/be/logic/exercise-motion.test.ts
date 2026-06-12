import { describe, expect, it } from "vitest";

import { motionCategoryFor } from "@/features/workout-timer/exercise-motion";

// 모션 카테고리는 폴백 가이드를 고른다. 잘못 분류되면 레그컬에 스쿼트 안내가 나가므로
// 교정 사항을 가드한다.

describe("motionCategoryFor", () => {
  it("static 으로 잘못 빠지던 운동들이 실제 패턴으로 교정됐다", () => {
    expect(motionCategoryFor("low-row-machine")).toBe("row");
    expect(motionCategoryFor("chest-supported-row")).toBe("row");
    expect(motionCategoryFor("assisted-pull-up")).toBe("pulldown");
    expect(motionCategoryFor("standing-cable-curl")).toBe("curl");
    expect(motionCategoryFor("cable-pull-through")).toBe("hinge");
  });

  it("대표 운동들은 그대로", () => {
    expect(motionCategoryFor("squat")).toBe("squat");
    expect(motionCategoryFor("bench-press")).toBe("press");
    expect(motionCategoryFor("t-bar-row")).toBe("row");
  });
});
