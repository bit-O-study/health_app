import { describe, expect, it } from "vitest";

import { isSummaryDay, weeklySummaryKey, weeklySummaryPayload } from "@/features/notifications/weekly-summary";
import { DEFAULT_PREFERENCES, NOTIFICATION_KINDS, PUSH_TYPE_TO_KIND } from "@/features/notifications/preferences";

describe("이번 주 정리 알림(라이트)", () => {
  it("🔴 일요일에만 — 토요일은 부위 균형 알림 자리", () => {
    expect(isSummaryDay("2026-10-04")).toBe(true); // 일
    expect(isSummaryDay("2026-10-03")).toBe(false); // 토
    expect(isSummaryDay("2026-10-05")).toBe(false); // 월
    expect(isSummaryDay("x")).toBe(false);
  });

  it("주당 한 번 — 키에 주 시작일", () => {
    expect(weeklySummaryKey("2026-09-28")).toBe("weekly-summary:2026-09-28");
  });

  it("🔴 숫자 한 줄 — 운동일·볼륨(지난주 대비)·신기록·단백질", () => {
    const p = weeklySummaryPayload({ days: 4, volumeKg: 18200, prevVolumeKg: 16250, prs: 1, proteinHitDays: 3 });
    expect(p.type).toBe("weekly-summary");
    expect(p.title).toMatch(/신기록/);
    expect(p.body).toBe("4일 운동 · 볼륨 18,200kg(+12%) · 신기록 1개 · 단백질 채운 날 3일");
    expect(p.url).toBe("/fit?tab=report");
  });

  it("지난주 기록·식단 기록이 없으면 그 부분은 말하지 않는다", () => {
    const p = weeklySummaryPayload({ days: 2, volumeKg: 5000, prevVolumeKg: 0, prs: 0, proteinHitDays: null });
    expect(p.body).toBe("2일 운동 · 볼륨 5,000kg");
    expect(p.title).toBe("이번 주 정리");
  });

  it("🔴 운동 안 한 주에도 다그치지 않는다", () => {
    const p = weeklySummaryPayload({ days: 0, volumeKg: 0, prevVolumeKg: 9000, prs: 0, proteinHitDays: 2 });
    expect(p.body).toBe("이번 주는 쉬었어요. 다음 주 첫 운동을 잡아 볼까요?");
  });

  it("🔴 설정에서 끌 수 있는 알림 — 종류·기본값·푸시 타입 연결", () => {
    expect(NOTIFICATION_KINDS).toContain("weekly-summary");
    expect(DEFAULT_PREFERENCES.kinds["weekly-summary"]).toBe(true);
    expect(PUSH_TYPE_TO_KIND["weekly-summary"]).toBe("weekly-summary");
  });
});
