import { describe, expect, it } from "vitest";

import { predictCycle } from "@/features/cycle/cycle-predict";
import { cycleTrainingTip } from "@/features/cycle/cycle-training";
import { homeBriefing } from "@/features/lite/home-briefing";

// 28일 주기 — 9/1 · 9/29 시작. 다음 예정 10/27, 배란 10/13.
const STARTS = ["2026-09-01", "2026-09-29"];
const tipOn = (today: string) => cycleTrainingTip(predictCycle(STARTS, today), today);

describe("주기에 맞춘 운동 한 줄", () => {
  it("생리 중 → 무게 90%·세트 하나 줄이기", () => {
    expect(tipOn("2026-10-01")).toMatchObject({ phase: "period", title: "생리 3일차예요" });
    expect(tipOn("2026-10-01")!.tip).toContain("90%");
  });

  it("생리 끝 ~ 배란 전 → 힘이 잘 나는 때", () => {
    expect(tipOn("2026-10-08")?.phase).toBe("follicular");
  });

  it("배란일 ±1일 → 워밍업 충분히", () => {
    expect(tipOn("2026-10-13")?.phase).toBe("ovulation");
    expect(tipOn("2026-10-14")?.phase).toBe("ovulation");
  });

  it("배란 뒤 → 휴식 길게, 예정 3일 전부터 → 생리 전", () => {
    expect(tipOn("2026-10-18")?.phase).toBe("luteal");
    expect(tipOn("2026-10-24")).toMatchObject({ phase: "premenstrual", title: "생리 예정 3일 전이에요" });
  });

  it("기록이 없거나 너무 오래되면 말하지 않는다", () => {
    expect(cycleTrainingTip(predictCycle([], "2026-10-08"), "2026-10-08")).toBeNull();
    expect(cycleTrainingTip(predictCycle(["2026-03-01"], "2026-10-08"), "2026-10-08")).toBeNull();
  });
});

describe("홈 오늘 한 줄 — 생리 중·직전이면 맨 앞", () => {
  const rest = [{ part: "lower" as const, days: 10, lastDate: "2026-09-28" }];
  it("생리 중이면 쉬는 부위보다 주기 팁이 먼저, 다른 단계면 원래 순서", () => {
    expect(homeBriefing({ resting: rest, plateaus: [], stories: [], cycle: tipOn("2026-10-01") })).toMatchObject({ kind: "cycle", href: "/cycle" });
    expect(homeBriefing({ resting: rest, plateaus: [], stories: [], cycle: tipOn("2026-10-08") })?.kind).toBe("rest");
  });
});
