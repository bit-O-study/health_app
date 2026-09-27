import { describe, expect, it } from "vitest";

import { pickNudge } from "@/features/notifications/nudge-pick";

describe("pickNudge — 권한 넛지는 한 번에 하나만", () => {
  it("둘 다 필요하면 알림을 먼저 묻는다", () => {
    expect(pickNudge({ push: true, steps: true })).toBe("push");
  });

  it("알림을 닫거나 허용하면 그다음 걸음수", () => {
    expect(pickNudge({ push: false, steps: true })).toBe("steps");
  });

  it("알림만 필요하면 알림", () => {
    expect(pickNudge({ push: true, steps: false })).toBe("push");
  });

  it("아무것도 필요 없으면 아무것도 안 띄운다", () => {
    expect(pickNudge({ push: false, steps: false })).toBeNull();
  });
});
