import { describe, expect, it } from "vitest";

import { buildWeeklyMvpMessage } from "@/features/groups/weekly-mvp-message";

describe("buildWeeklyMvpMessage", () => {
  it("title includes the group name", () => {
    expect(buildWeeklyMvpMessage("불끈", "철수", 2, 3).title).toContain("불끈");
  });

  it("winner gets a congrats body", () => {
    const m = buildWeeklyMvpMessage("불끈", "나", 1, 4);
    expect(m.body).toContain("1위");
    expect(m.body).not.toContain("명 중");
  });

  it("non-winner sees winner name + own rank", () => {
    const m = buildWeeklyMvpMessage("불끈", "철수", 3, 5);
    expect(m.body).toContain("철수");
    expect(m.body).toContain("5명 중 3위");
  });

  it("solo group gets an encouragement body", () => {
    const m = buildWeeklyMvpMessage("나홀로", "나", 1, 1);
    expect(m.body).toContain("혼자");
  });
});
