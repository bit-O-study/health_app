import { describe, expect, it } from "vitest";

import { homeBriefing } from "@/features/lite/home-briefing";

const plateau = { exerciseId: "bench-press", name: "벤치프레스", weeks: 8, sinceDate: "2026-08-09", bestOneRmKg: 89, lastKg: 60, lastReps: 10, advice: "60kg로 한 세트에 1~2회씩 늘려 12회가 되면 65kg로 올려 보세요." };
const story = { exerciseId: "squat", name: "스쿼트", fromKg: 17.5, fromDate: "2026-06-01", toKg: 140, toDate: "2026-09-28" };

describe("홈 오늘 한 줄 — 쉬는 부위 → 정체 → 성장", () => {
  it("오래 쉰 부위가 먼저 — 그 부위 추천으로", () => {
    const b = homeBriefing({ resting: [{ part: "lower", days: 10, lastDate: "2026-09-28" }], plateaus: [plateau], stories: [story] });
    expect(b).toEqual({ kind: "rest", text: "하체 운동을 10일째 쉬고 있어요", sub: "하체 채우는 운동 보기", href: "/fit?part=lower" });
  });

  it("한 번도 안 한 부위('4달 넘게')는 매일 잔소리라 건너뛰고 정체로", () => {
    const b = homeBriefing({ resting: [{ part: "core", days: null, lastDate: null }], plateaus: [plateau], stories: [story] });
    expect(b?.kind).toBe("plateau");
    expect(b?.text).toBe("벤치프레스 8주째 그대로예요");
    expect(b?.sub).toContain("12회가 되면");
  });

  it("쉬는 부위·정체가 없으면 성장 칭찬, 아무것도 없으면 null", () => {
    expect(homeBriefing({ resting: [], plateaus: [], stories: [story] })?.text).toBe("스쿼트 17.5kg → 140kg, 122.5kg 늘었어요");
    expect(homeBriefing({ resting: [], plateaus: [], stories: [] })).toBeNull();
  });
});
