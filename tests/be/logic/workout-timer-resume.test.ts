import { describe, expect, it } from "vitest";

import {
  AWAY_GAP_MS,
  reconcileResume,
  type TimerState,
} from "@/features/workout-timer/timer-store";
import { normalizeSoundKind } from "@/features/workout-timer/rest-sound";

const base = (over: Partial<TimerState> = {}): TimerState => ({
  startedAt: 1_000,
  pausedAt: null,
  accumulated: 0,
  forDate: "2026-06-15",
  lastSeenAt: 2_000,
  ...over,
});

describe("reconcileResume — 닫아둔 동안의 시간 제외", () => {
  it("null/정지 상태는 그대로 둔다", () => {
    expect(reconcileResume(null, 9_999)).toBeNull();
    const paused = base({ pausedAt: 5_000 });
    expect(reconcileResume(paused, 9_999_999)).toBe(paused);
  });

  it("짧은 공백(임계 미만)이면 startedAt 유지, lastSeenAt 만 갱신", () => {
    const s = base({ lastSeenAt: 2_000 });
    const now = 2_000 + AWAY_GAP_MS - 1;
    const r = reconcileResume(s, now)!;
    expect(r.startedAt).toBe(s.startedAt);
    expect(r.lastSeenAt).toBe(now);
  });

  it("며칠 닫아두면(큰 공백) 그 시간을 경과에서 제외한다", () => {
    const s = base({ startedAt: 1_000, lastSeenAt: 2_000, accumulated: 0 });
    const aWeek = 7 * 24 * 3600 * 1000;
    const now = 2_000 + aWeek; // 일주일 뒤 다시 열림
    const r = reconcileResume(s, now)!;
    // startedAt 이 공백만큼 미뤄져, '지금' 기준 경과는 공백을 뺀 값(=lastSeenAt-startedAt).
    expect(now - r.startedAt).toBe(s.lastSeenAt! - s.startedAt); // 1000ms 만 인정
    // 즉 '지금' 시점 경과 = accumulated + (now - startedAt) = 1초 (일주일이 아님).
    expect(r.accumulated + (now - r.startedAt)).toBe(1_000);
    expect(r.lastSeenAt).toBe(now);
  });
});

describe("normalizeSoundKind", () => {
  it("유효한 값은 통과, 그 외엔 voice(기본)", () => {
    expect(normalizeSoundKind("voice")).toBe("voice");
    expect(normalizeSoundKind("beep")).toBe("beep");
    expect(normalizeSoundKind("custom")).toBe("custom");
    expect(normalizeSoundKind(null)).toBe("voice");
    expect(normalizeSoundKind("삐삐")).toBe("voice");
    expect(normalizeSoundKind(undefined)).toBe("voice");
  });
});
