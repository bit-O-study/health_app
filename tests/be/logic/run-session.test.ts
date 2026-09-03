import { describe, expect, it } from "vitest";

import {
  MAX_ROUTE_POINTS,
  isDuplicateRunSessionError,
  normalizeRunRoute,
  normalizeRunSession,
  runSessionDate,
} from "@/features/running/run-session";

const session = (overrides: Record<string, unknown> = {}) => ({
  mode: "outdoor" as const,
  startedAt: "2026-09-01T00:00:00.000Z",
  endedAt: "2026-09-01T00:10:00.000Z",
  distanceM: 2_000,
  ...overrides,
});

describe("normalizeRunSession", () => {
  it("야외 기록은 거리와 시간으로 평균 속도·페이스를 계산한다", () => {
    const result = normalizeRunSession(session());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.durationSec).toBe(600);
    expect(result.session.avgKmh).toBe(12);
    expect(result.session.paceSecPerKm).toBe(300);
  });

  it("실내 기록은 측정 거리 없이도 60초부터 저장하고 속도·경사를 유지한다", () => {
    const result = normalizeRunSession(
      session({
        mode: "indoor",
        endedAt: "2026-09-01T00:01:00.000Z",
        distanceM: 0,
        avgKmh: 8.34,
        incline: 2.4,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.avgKmh).toBe(8.3);
    expect(result.session.incline).toBe(2);
    expect(result.session.paceSecPerKm).toBeNull();
    expect(result.session.route).toEqual([]);
  });

  it("시간 역전·60초 미만·야외 50m 미만·비현실적 거리를 거부한다", () => {
    expect(
      normalizeRunSession(session({ endedAt: "2026-08-31T23:59:59.000Z" })),
    ).toEqual({ ok: false, reason: "invalid_time" });
    expect(
      normalizeRunSession(session({ endedAt: "2026-09-01T00:00:59.000Z" })),
    ).toEqual({ ok: false, reason: "too_short" });
    expect(normalizeRunSession(session({ distanceM: 49 }))).toEqual({
      ok: false,
      reason: "too_short",
    });
    expect(normalizeRunSession(session({ distanceM: 0 }))).toEqual({
      ok: false,
      reason: "too_short",
    });
    expect(normalizeRunSession(session({ distanceM: 200_001 }))).toEqual({
      ok: false,
      reason: "too_far",
    });
  });

  it("서울 자정 경계로 저장 날짜를 정하고 중복 키 충돌만 성공으로 취급한다", () => {
    expect(runSessionDate("2026-09-01T14:59:59.000Z")).toBe("2026-09-01");
    expect(runSessionDate("2026-09-01T15:00:00.000Z")).toBe("2026-09-02");
    expect(runSessionDate("not-a-date")).toBeNull();
    expect(isDuplicateRunSessionError({ code: "23505" })).toBe(true);
    expect(isDuplicateRunSessionError({ code: "42501" })).toBe(false);
  });
});

describe("normalizeRunRoute", () => {
  it("좌표·정확도 이상치를 버리고 시간순으로 정렬한다", () => {
    expect(
      normalizeRunRoute([
        { lat: 37.2, lng: 127.2, timestamp: 2_000, accuracyM: 10 },
        { lat: 91, lng: 127, timestamp: 1_000 },
        { lat: 37.1, lng: 127.1, timestamp: 1_000, accuracyM: 5 },
        { lat: 37, lng: 127, timestamp: 3_000, accuracyM: 101 },
      ]),
    ).toEqual([
      { lat: 37.1, lng: 127.1, timestamp: 1_000, accuracyM: 5 },
      { lat: 37.2, lng: 127.2, timestamp: 2_000, accuracyM: 10 },
    ]);
  });

  it("긴 경로는 시작·종료를 보존하며 저장 상한 이하로 샘플링한다", () => {
    const points = Array.from({ length: 5_001 }, (_, index) => ({
      lat: 37 + index / 100_000,
      lng: 127,
      timestamp: index,
      accuracyM: 10,
    }));
    const route = normalizeRunRoute(points);
    expect(route.length).toBeLessThanOrEqual(MAX_ROUTE_POINTS);
    expect(route[0]).toEqual(points[0]);
    expect(route.at(-1)).toEqual(points.at(-1));
  });
});
