import { describe, expect, it } from "vitest";

import { formatSleepRecovery, latestSleepRecovery } from "@/features/health/sleep-recovery";

const NOW = Date.parse("2026-09-02T08:00:00.000Z");

describe("수면 회복 상태", () => {
  it("가장 최근에 끝난 유효 세션을 고르고 시간을 안내한다", () => {
    const recovery = latestSleepRecovery([
      { startTime: "2026-08-31T22:00:00Z", endTime: "2026-09-01T05:00:00Z" },
      { startTime: "2026-09-01T21:30:00Z", endTime: "2026-09-02T05:10:00Z" },
    ], NOW);
    expect(recovery).toMatchObject({ durationMinutes: 460, level: "good", label: "회복 충분" });
    expect(formatSleepRecovery(recovery!)).toBe("최근 수면 7시간 40분 · 회복 충분");
  });

  it.each([
    [300, "low", "회복 부족"],
    [390, "moderate", "회복 보통"],
    [480, "good", "회복 충분"],
    [600, "long", "긴 수면"],
  ] as const)("%i분을 %s 상태로 분류한다", (minutes, level, label) => {
    const recovery = latestSleepRecovery([{ startTime: NOW - minutes * 60_000, endTime: NOW }], NOW);
    expect(recovery).toMatchObject({ durationMinutes: minutes, level, label });
  });

  it("깨진 시각·미래 종료·30분 미만·16시간 초과는 버린다", () => {
    expect(latestSleepRecovery([
      { startTime: "broken", endTime: NOW },
      { startTime: NOW - 60_000, endTime: NOW + 60_000 },
      { startTime: NOW - 29 * 60_000, endTime: NOW },
      { startTime: NOW - 17 * 60 * 60_000, endTime: NOW },
    ], NOW)).toBeNull();
  });
});
