import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { exerciseSummary, guideFor } from "@/features/workout-timer/exercise-guides";

describe("standing toe raise guidance", () => {
  it("keeps heels grounded while raising forefeet with chair support", () => {
    const text = methodSteps("standing-toe-raise", "bodyweight").join(" ");
    expect(text).toContain("뒤꿈치는 바닥에");
    expect(text).toContain("발 앞부분과 발가락");
    expect(text).toContain("의자 등받이");
    expect(text).not.toMatch(/전경골근 높이까지|뒤꿈치를 들어|팔꿈치를 살짝 굽힌다/);
  });
  it("uses dorsiflexion guidance and shin targets rather than shoulder raise fallback", () => {
    const guide = guideFor("standing-toe-raise");
    expect(guide.setup).toContain("의자 등받이");
    expect(guide.cues.join(" ")).toContain("뒤꿈치");
    expect(exerciseSummary("standing-toe-raise").oneLiner).toContain("전경골근");
    expect(guide.targets.map((t) => t.name).join(" ")).toContain("정강이");
  });
});
